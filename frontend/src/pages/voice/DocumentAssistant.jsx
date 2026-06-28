import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  Loader2,
  RefreshCw,
  Plus,
  X,
  User,
  Phone,
  ScanLine,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Database,
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

const KIND_LABEL = {
  aadhaar: "Aadhaar",
  pan: "PAN Card",
  passport: "Passport",
  driving_license: "Driving License",
  resume: "Resume",
  insurance: "Insurance",
  medical_report: "Medical Report",
  other: "Other",
};

const STATUS_TONE = {
  pending: "slate",
  processing: "blue",
  extracted: "indigo",
  verified: "green",
  rejected: "red",
  failed: "red",
};

const STATUS_FILTERS = ["all", "pending", "extracted", "verified"];

function DocRow({ d, onExtract, onVerify, busy }) {
  const fields = d.extracted_fields || {};
  const fieldKeys = Object.keys(fields).filter((k) => fields[k]);
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[14px] font-bold text-[#0F172A]">
              {d.title || KIND_LABEL[d.kind] || d.kind}
            </h3>
            <Badge tone="indigo">{KIND_LABEL[d.kind] || d.kind}</Badge>
            <Badge tone={STATUS_TONE[d.status] || "slate"}>{d.status}</Badge>
            {d.confidence > 0 && <Badge tone={d.confidence >= 70 ? "green" : "amber"}>{d.confidence}% confidence</Badge>}
            {d.synced_to_crm && (
              <Badge tone="blue"><Database size={11} /> in CRM</Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#94A3B8]">
            {d.customer_name && (
              <span className="inline-flex items-center gap-1"><User size={12} /> {d.customer_name}</span>
            )}
            {d.customer_phone && (
              <span className="inline-flex items-center gap-1"><Phone size={12} /> {d.customer_phone}</span>
            )}
            <span className="inline-flex items-center gap-1"><Clock size={12} /> {fmtRelative(d.created_at)}</span>
          </div>
          {fieldKeys.length > 0 && (
            <div className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {fieldKeys.map((k) => (
                <div key={k} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="capitalize text-[#94A3B8]">{k.replace(/_/g, " ")}</span>
                  <span className="truncate font-semibold text-[#334155]">{String(fields[k])}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {d.status !== "verified" && (
            <GhostButton onClick={() => onExtract(d.id)} disabled={busy === d.id} className="px-3 py-1.5 text-[12px]">
              <ScanLine size={13} /> Extract
            </GhostButton>
          )}
          {d.status !== "verified" && (
            <PrimaryButton onClick={() => onVerify(d.id)} disabled={busy === d.id} className="px-3 py-1.5 text-[12px]">
              <ShieldCheck size={13} /> Verify & sync
            </PrimaryButton>
          )}
        </div>
      </div>
    </Card>
  );
}

function CreateModal({ kinds, onClose, onCreated }) {
  const [form, setForm] = useState({
    kind: kinds[0]?.value || "other",
    title: "",
    customer_name: "",
    customer_phone: "",
    extracted_text: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    try {
      const created = await voiceApi.createDocument({
        kind: form.kind,
        title: form.title || null,
        customer_name: form.customer_name || null,
        customer_phone: form.customer_phone || null,
        extracted_text: form.extracted_text || null,
      });
      toast.success("Document added.");
      onCreated(created);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#0F172A]">Add document</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9]">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-1 text-[12.5px] font-semibold text-[#475569]">
            Type
            <select value={form.kind} onChange={(e) => set("kind", e.target.value)} className={inputCls}>
              {kinds.map((k) => (
                <option key={k.value} value={k.value}>{KIND_LABEL[k.value] || k.value}</option>
              ))}
            </select>
          </label>
          <label className="col-span-1 text-[12.5px] font-semibold text-[#475569]">
            Title
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
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
            OCR / document text
            <textarea
              rows={5}
              value={form.extracted_text}
              onChange={(e) => set("extracted_text", e.target.value)}
              className={inputCls}
              placeholder="Paste OCR text or document content. The AI extracts structured fields on Extract."
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={onClose} className="px-4 py-2">Cancel</GhostButton>
          <PrimaryButton onClick={submit} disabled={saving} className="px-4 py-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add document
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default function DocumentAssistant() {
  const [items, setItems] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async (silent) => {
    silent ? setRefreshing(true) : setLoading(true);
    try {
      const res = await voiceApi.documents({ limit: 100 });
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
      .documentKinds()
      .then((r) => r.items?.length && setKinds(r.items))
      .catch(() => {});
  }, [load]);

  const onExtract = async (id) => {
    setBusy(id);
    try {
      const updated = await voiceApi.extractDocument(id);
      setItems((list) => list.map((d) => (d.id === id ? updated : d)));
      toast.success(`Extracted ${updated.confidence}% of fields.`);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(null);
    }
  };

  const onVerify = async (id) => {
    setBusy(id);
    try {
      const updated = await voiceApi.verifyDocument(id, { sync_to_crm: true });
      setItems((list) => list.map((d) => (d.id === id ? updated : d)));
      toast.success("Verified and synced to CRM.");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(null);
    }
  };

  const stats = useMemo(() => {
    return {
      total: items.length,
      verified: items.filter((d) => d.status === "verified").length,
      pending: items.filter((d) => d.status === "pending" || d.status === "processing").length,
      synced: items.filter((d) => d.synced_to_crm).length,
    };
  }, [items]);

  const filtered = filter === "all" ? items : items.filter((d) => d.status === filter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <PageHeader
        icon={FileText}
        eyebrow="Documents"
        title="AI Document Assistant"
        subtitle="Collect Aadhaar, PAN, Passport, licenses, resumes, insurance and medical reports — OCR, extract and sync to CRM."
        actions={
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => load(true)} disabled={refreshing} className="px-3 py-2">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
            </GhostButton>
            <PrimaryButton onClick={() => setShowCreate(true)} className="px-3 py-2">
              <Plus size={15} /> Add document
            </PrimaryButton>
          </div>
        }
      />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FileText} label="Total documents" value={stats.total} tone="indigo" />
        <StatCard icon={CheckCircle2} label="Verified" value={stats.verified} tone="green" />
        <StatCard icon={Clock} label="Awaiting review" value={stats.pending} tone="amber" />
        <StatCard icon={Database} label="Synced to CRM" value={stats.synced} tone="blue" />
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
            icon={FileText}
            title="No documents yet"
            hint="Add a document and the AI will OCR it, extract structured fields and push them to your CRM."
            action={
              <PrimaryButton onClick={() => setShowCreate(true)} className="px-4 py-2">
                <Plus size={15} /> Add document
              </PrimaryButton>
            }
          />
        ) : (
          filtered.map((d) => <DocRow key={d.id} d={d} onExtract={onExtract} onVerify={onVerify} busy={busy} />)
        )}
      </div>

      {showCreate && (
        <CreateModal
          kinds={kinds.length ? kinds : Object.keys(KIND_LABEL).map((value) => ({ value }))}
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
