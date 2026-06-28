import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck,
  Loader2,
  RefreshCw,
  Plus,
  X,
  Search,
  Upload,
  Trash2,
  PhoneOff,
  Ban,
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

const REASONS = [
  { value: "dnd", label: "Do-Not-Call registry", tone: "red" },
  { value: "opt_out", label: "Opted out", tone: "amber" },
  { value: "complaint", label: "Complaint", tone: "red" },
  { value: "bounce", label: "Invalid number", tone: "slate" },
  { value: "manual", label: "Manual", tone: "indigo" },
];
const REASON_LABEL = Object.fromEntries(REASONS.map((r) => [r.value, r.label]));
const REASON_TONE = Object.fromEntries(REASONS.map((r) => [r.value, r.tone]));
const FILTERS = ["all", "dnd", "opt_out", "complaint", "bounce", "manual"];

function AddForm({ onClose, onSaved }) {
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("manual");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!phone.trim()) {
      toast.error("Enter a phone number.");
      return;
    }
    setBusy(true);
    try {
      await voiceApi.addSuppression({ phone_number: phone.trim(), reason, note: note.trim() || undefined });
      toast.success("Number added to the Do-Not-Call list.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-bold text-[#0F172A]">Suppress a number</h3>
        <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={18} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[12.5px] font-semibold text-[#475569]">Phone number</label>
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 817 406 8649" />
        </div>
        <div>
          <label className="text-[12.5px] font-semibold text-[#475569]">Reason</label>
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[12.5px] font-semibold text-[#475569]">Note (optional)</label>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this number suppressed?" />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <PrimaryButton onClick={save} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add to list
        </PrimaryButton>
      </div>
    </Card>
  );
}

export default function Compliance() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filter !== "all") params.reason = filter;
      if (search.trim()) params.search = search.trim();
      const data = await voiceApi.suppressionList(params);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const remove = async (id) => {
    try {
      await voiceApi.deleteSuppression(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success("Removed from the Do-Not-Call list.");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImporting(true);
      try {
        const text = await file.text();
        const res = await voiceApi.importSuppressionCsv(text, "dnd");
        toast.success(`Imported ${res.added} number${res.added === 1 ? "" : "s"}.`);
        load();
      } catch (err) {
        toast.error(formatApiError(err));
      } finally {
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    }
  };

  const counts = useMemo(() => {
    const c = { dnd: 0, opt_out: 0, other: 0 };
    items.forEach((x) => {
      if (x.reason === "dnd") c.dnd += 1;
      else if (x.reason === "opt_out") c.opt_out += 1;
      else c.other += 1;
    });
    return c;
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compliance"
        title="Do-Not-Call list"
        subtitle="Numbers here are never dialed by any campaign. Stay compliant with DND / opt-out rules automatically."
        icon={ShieldCheck}
        actions={
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
            <GhostButton onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Import CSV
            </GhostButton>
            <GhostButton onClick={load}><RefreshCw size={15} /> Refresh</GhostButton>
            <PrimaryButton onClick={() => setShowAdd(true)}><Plus size={15} /> Add number</PrimaryButton>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Ban} label="DND registry" value={counts.dnd} tone="#DC2626" bg="#FEF2F2" />
        <StatCard icon={PhoneOff} label="Opted out" value={counts.opt_out} tone="#D97706" bg="#FFFBEB" />
        <StatCard icon={ShieldCheck} label="Total suppressed" value={total} tone="#2563EB" bg="#EFF4FF" />
      </div>

      {showAdd && <AddForm onClose={() => setShowAdd(false)} onSaved={load} />}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              className={`${inputCls} mt-0 pl-9`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by number…"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  filter === f ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                }`}
              >
                {f === "all" ? "All" : REASON_LABEL[f] || f}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#2563EB]" /></div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No suppressed numbers"
          hint="Add numbers manually, import a DND list, or let the AI capture opt-outs during calls."
          action={<PrimaryButton onClick={() => setShowAdd(true)}><Plus size={15} /> Add number</PrimaryButton>}
        />
      ) : (
        <Card className="divide-y divide-[#F1F5F9]">
          {items.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[14px] font-semibold text-[#0F172A]">{x.phone_number}</span>
                  <Badge tone={REASON_TONE[x.reason] || "slate"}>{REASON_LABEL[x.reason] || x.reason}</Badge>
                  <Badge tone="slate">{x.source}</Badge>
                </div>
                {x.note && <p className="mt-0.5 text-[12.5px] text-[#64748B]">{x.note}</p>}
                <p className="mt-0.5 text-[11.5px] text-[#94A3B8]">Added {fmtRelative(x.created_at)}</p>
              </div>
              <button
                onClick={() => remove(x.id)}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
