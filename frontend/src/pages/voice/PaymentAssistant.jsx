import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Loader2,
  RefreshCw,
  Plus,
  X,
  User,
  Phone,
  Mail,
  Link2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  PrimaryButton,
  StatCard,
  EmptyState,
} from "@/components/dashboard/kit";
import { formatApiError } from "@/lib/api";
import { voiceApi, fmtRelative } from "@/lib/voice";
import { toast } from "sonner";

const inputCls =
  "mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

const PROVIDER_META = {
  stripe: { label: "Stripe", tone: "indigo", bg: "#F5F3FF" },
  razorpay: { label: "Razorpay", tone: "blue", bg: "#EFF8FF" },
  paypal: { label: "PayPal", tone: "blue", bg: "#EFF4FF" },
  phonepe: { label: "PhonePe", tone: "indigo", bg: "#F5F3FF" },
  google_pay: { label: "Google Pay", tone: "green", bg: "#ECFDF3" },
  apple_pay: { label: "Apple Pay", tone: "slate", bg: "#F1F5F9" },
};

const STATUS_TONE = {
  pending: "slate",
  sent: "blue",
  paid: "green",
  failed: "red",
  canceled: "slate",
  refunded: "amber",
};

const CURRENCIES = ["usd", "eur", "gbp", "inr", "aud", "cad"];
const CURRENCY_SYMBOL = { usd: "$", eur: "€", gbp: "£", inr: "₹", aud: "A$", cad: "C$" };
const STATUS_FILTERS = ["all", "sent", "paid", "failed", "refunded", "canceled"];

function fmtMoney(cents, currency) {
  const sym = CURRENCY_SYMBOL[(currency || "usd").toLowerCase()] || "";
  return `${sym}${(Number(cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CopyBtn({ value }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#2563EB] hover:underline"
    >
      {done ? <Check size={12} /> : <Copy size={12} />} {done ? "Copied" : "Copy link"}
    </button>
  );
}

function PaymentRow({ p, onStatus, busy }) {
  const pm = PROVIDER_META[p.provider] || { label: p.provider, tone: "slate" };
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-bold text-[#0F172A]">{fmtMoney(p.amount_cents, p.currency)}</h3>
            <Badge tone={pm.tone}>{pm.label}</Badge>
            <Badge tone={STATUS_TONE[p.status] || "slate"}>{p.status}</Badge>
            {p.reference && <span className="text-[11.5px] font-mono text-[#94A3B8]">{p.reference}</span>}
          </div>
          {p.description && <p className="mt-1.5 line-clamp-2 text-[12.5px] text-[#475569]">{p.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#94A3B8]">
            {p.customer_name && (
              <span className="inline-flex items-center gap-1"><User size={12} /> {p.customer_name}</span>
            )}
            {p.customer_phone && (
              <span className="inline-flex items-center gap-1"><Phone size={12} /> {p.customer_phone}</span>
            )}
            {p.customer_email && (
              <span className="inline-flex items-center gap-1"><Mail size={12} /> {p.customer_email}</span>
            )}
            <span className="inline-flex items-center gap-1"><Clock size={12} /> {fmtRelative(p.created_at)}</span>
          </div>
          {p.link_url && (
            <div className="mt-2 flex items-center gap-2">
              <Link2 size={13} className="text-[#94A3B8]" />
              <span className="truncate text-[12px] text-[#64748B]">{p.link_url}</span>
              <CopyBtn value={p.link_url} />
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {p.status !== "paid" && p.status !== "refunded" && p.status !== "canceled" && (
            <GhostButton onClick={() => onStatus(p.id, "paid")} disabled={busy === p.id} className="px-3 py-1.5 text-[12px]">
              <CheckCircle2 size={13} /> Mark paid
            </GhostButton>
          )}
          {p.status === "paid" && (
            <GhostButton onClick={() => onStatus(p.id, "refunded")} disabled={busy === p.id} className="px-3 py-1.5 text-[12px]">
              <RotateCcw size={13} /> Refund
            </GhostButton>
          )}
          {p.status !== "paid" && p.status !== "canceled" && p.status !== "refunded" && (
            <GhostButton onClick={() => onStatus(p.id, "canceled")} disabled={busy === p.id} className="px-3 py-1.5 text-[12px]">
              <XCircle size={13} /> Cancel
            </GhostButton>
          )}
        </div>
      </div>
    </Card>
  );
}

function CreateModal({ providers, onClose, onCreated }) {
  const [form, setForm] = useState({
    amount: "",
    currency: "usd",
    provider: providers[0] || "stripe",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const amt = Math.round(parseFloat(form.amount) * 100);
    if (!amt || amt < 1) {
      toast.error("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      const created = await voiceApi.createPayment({
        amount_cents: amt,
        currency: form.currency,
        provider: form.provider,
        customer_name: form.customer_name || null,
        customer_phone: form.customer_phone || null,
        customer_email: form.customer_email || null,
        description: form.description || null,
      });
      toast.success("Payment request created.");
      onCreated(created);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#0F172A]">New payment request</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9]">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-1 text-[12.5px] font-semibold text-[#475569]">
            Amount
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              className={inputCls}
              placeholder="0.00"
            />
          </label>
          <label className="col-span-1 text-[12.5px] font-semibold text-[#475569]">
            Currency
            <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2 text-[12.5px] font-semibold text-[#475569]">
            Provider
            <select value={form.provider} onChange={(e) => set("provider", e.target.value)} className={inputCls}>
              {providers.map((p) => (
                <option key={p} value={p}>{(PROVIDER_META[p] || {}).label || p}</option>
              ))}
            </select>
          </label>
          <label className="col-span-1 text-[12.5px] font-semibold text-[#475569]">
            Customer name
            <input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} className={inputCls} />
          </label>
          <label className="col-span-1 text-[12.5px] font-semibold text-[#475569]">
            Phone
            <input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} className={inputCls} />
          </label>
          <label className="col-span-2 text-[12.5px] font-semibold text-[#475569]">
            Email
            <input value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} className={inputCls} />
          </label>
          <label className="col-span-2 text-[12.5px] font-semibold text-[#475569]">
            Description
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputCls}
              placeholder="What is this payment for?"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={onClose} className="px-4 py-2">Cancel</GhostButton>
          <PrimaryButton onClick={submit} disabled={saving} className="px-4 py-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create request
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default function PaymentAssistant() {
  const [items, setItems] = useState([]);
  const [providers, setProviders] = useState(Object.keys(PROVIDER_META));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async (silent) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await voiceApi.payments({ limit: 100 });
      setItems(res.items || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    voiceApi
      .paymentProviders()
      .then((r) => r.items?.length && setProviders(r.items))
      .catch(() => {});
  }, [load]);

  const onStatus = async (id, status) => {
    setBusy(id);
    try {
      const updated = await voiceApi.updatePaymentStatus(id, { status });
      setItems((list) => list.map((p) => (p.id === id ? updated : p)));
      toast.success(`Marked ${status}.`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(null);
    }
  };

  const stats = useMemo(() => {
    const paid = items.filter((p) => p.status === "paid");
    const collected = paid.reduce((s, p) => s + Number(p.amount_cents || 0), 0);
    const pending = items.filter((p) => p.status === "sent" || p.status === "pending");
    const pendingAmt = pending.reduce((s, p) => s + Number(p.amount_cents || 0), 0);
    return {
      total: items.length,
      collected,
      pendingCount: pending.length,
      pendingAmt,
      paidCount: paid.length,
    };
  }, [items]);

  const filtered = filter === "all" ? items : items.filter((p) => p.status === filter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        icon={CreditCard}
        eyebrow="Payments"
        title="AI Payment Assistant"
        subtitle="Request and collect payments across Stripe, Razorpay, PayPal, PhonePe, Google Pay and Apple Pay."
        actions={
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => load(true)} disabled={refreshing} className="px-3 py-2">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
            </GhostButton>
            <PrimaryButton onClick={() => setShowCreate(true)} className="px-3 py-2">
              <Plus size={15} /> New request
            </PrimaryButton>
          </div>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CreditCard} label="Total requests" value={stats.total} tone="indigo" />
        <StatCard icon={CheckCircle2} label="Collected" value={fmtMoney(stats.collected, "usd")} sub={`${stats.paidCount} paid`} tone="green" />
        <StatCard icon={Clock} label="Pending" value={stats.pendingCount} sub={fmtMoney(stats.pendingAmt, "usd")} tone="amber" />
        <StatCard icon={Link2} label="Providers" value={providers.length} tone="blue" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition ${
              filter === s ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#94A3B8]">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payment requests yet"
            hint="Create a request and the AI can share the secure payment link with your customer."
            action={
              <PrimaryButton onClick={() => setShowCreate(true)} className="px-4 py-2">
                <Plus size={15} /> New request
              </PrimaryButton>
            }
          />
        ) : (
          filtered.map((p) => <PaymentRow key={p.id} p={p} onStatus={onStatus} busy={busy} />)
        )}
      </div>

      {showCreate && (
        <CreateModal
          providers={providers}
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            setItems((list) => [created, ...list]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
