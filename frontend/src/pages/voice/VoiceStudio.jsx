import React, { useCallback, useEffect, useState } from "react";
import {
  Mic2,
  Loader2,
  Plus,
  X,
  CheckCircle2,
  Ban,
  Trash2,
  ShieldCheck,
  Sparkles,
  Languages as LanguagesIcon,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  PrimaryButton,
  EmptyState,
  SectionTitle,
} from "@/components/dashboard/kit";
import { formatApiError } from "@/lib/api";
import { voiceApi } from "@/lib/voice";
import { toast } from "sonner";

const inputCls =
  "mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

const STATUS_TONE = { approved: "green", pending: "amber", draft: "slate", revoked: "red" };
const KINDS = [
  { value: "custom", label: "Custom" },
  { value: "clone", label: "Voice Clone" },
  { value: "brand", label: "Brand Voice" },
  { value: "stock", label: "Stock" },
];

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-[#334155]">{label}</span>
      {children}
    </label>
  );
}

function CreateVoiceModal({ styles, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    provider: "elevenlabs",
    provider_voice_id: "",
    kind: "clone",
    language: "en",
    gender: "",
    accent: "",
    style_profile: styles[0]?.profile || "",
    consent_obtained: false,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      await voiceApi.createVoice({ ...form, provider_voice_id: form.provider_voice_id || null });
      toast.success("Voice added");
      onCreated();
      onClose();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[#0F172A]">Add voice</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9]">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <Field label="Name">
            <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Brand voice — Aria" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind">
              <select className={inputCls} value={form.kind} onChange={(e) => set("kind", e.target.value)}>
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Provider">
              <select className={inputCls} value={form.provider} onChange={(e) => set("provider", e.target.value)}>
                <option value="elevenlabs">ElevenLabs</option>
                <option value="openai">OpenAI</option>
                <option value="azure">Azure</option>
                <option value="cartesia">Cartesia</option>
              </select>
            </Field>
          </div>
          <Field label="Provider voice ID">
            <input className={inputCls} value={form.provider_voice_id} onChange={(e) => set("provider_voice_id", e.target.value)} placeholder="21m00Tcm4TlvDq8ikWAM" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Language">
              <input className={inputCls} value={form.language} onChange={(e) => set("language", e.target.value)} placeholder="en" />
            </Field>
            <Field label="Gender">
              <input className={inputCls} value={form.gender} onChange={(e) => set("gender", e.target.value)} placeholder="female" />
            </Field>
            <Field label="Accent">
              <input className={inputCls} value={form.accent} onChange={(e) => set("accent", e.target.value)} placeholder="American" />
            </Field>
          </div>
          {styles.length > 0 && (
            <Field label="Style profile">
              <select className={inputCls} value={form.style_profile} onChange={(e) => set("style_profile", e.target.value)}>
                <option value="">None</option>
                {styles.map((s) => (
                  <option key={s.profile} value={s.profile}>
                    {s.profile}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <button
            type="button"
            onClick={() => set("consent_obtained", !form.consent_obtained)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E7EAF1] px-4 py-3 text-left hover:border-[#CBD5E1]"
          >
            <div>
              <p className="text-[13px] font-semibold text-[#0F172A]">Consent obtained</p>
              <p className="text-[11.5px] text-[#94A3B8]">Required to approve a cloned voice for production.</p>
            </div>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${form.consent_obtained ? "bg-[#16A34A]" : "bg-[#CBD5E1]"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${form.consent_obtained ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <GhostButton onClick={onClose} className="px-4 py-2 text-[13px]">Cancel</GhostButton>
          <PrimaryButton onClick={submit} disabled={busy || !form.name} className="px-4 py-2 text-[13px]">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add voice
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default function VoiceStudio() {
  const [voices, setVoices] = useState([]);
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [v, s] = await Promise.allSettled([voiceApi.voiceLibrary({}), voiceApi.voiceStyles()]);
      if (v.status === "fulfilled") setVoices(v.value?.items || []);
      if (s.status === "fulfilled") setStyles(s.value?.items || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id, fn, msg) => {
    setBusy(id);
    try {
      await fn();
      toast.success(msg);
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Voice Studio"
        icon={Mic2}
        title="Voice Studio"
        subtitle="Clone, brand and tune your AI's voice — emotion, tone, speed, pauses and personality."
        actions={
          <PrimaryButton onClick={() => setShowCreate(true)} className="px-4 py-2 text-[13px]">
            <Plus size={15} /> Add voice
          </PrimaryButton>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#94A3B8]" />
        </div>
      ) : (
        <>
          <div>
            <SectionTitle icon={Mic2} title="Voice library" subtitle="Custom, cloned and brand voices for your agents" />
            {voices.length === 0 ? (
              <EmptyState
                icon={Mic2}
                title="No voices yet"
                hint="Add a cloned or branded voice. Cloned voices need consent before approval."
                action={
                  <GhostButton onClick={() => setShowCreate(true)} className="px-3 py-2 text-[13px]">
                    <Plus size={14} /> Add voice
                  </GhostButton>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {voices.map((v) => (
                  <Card key={v.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-[14px] font-bold text-[#0F172A]">{v.name}</h3>
                          <Badge tone={STATUS_TONE[v.status] || "slate"}>{v.status}</Badge>
                          <Badge tone="indigo">{v.kind}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-[#94A3B8]">
                          <span>{v.provider}</span>
                          <span>{v.language}</span>
                          {v.gender && <span>{v.gender}</span>}
                          {v.accent && <span>{v.accent}</span>}
                          {v.style_profile && <span className="inline-flex items-center gap-1"><Sparkles size={11} /> {v.style_profile}</span>}
                          <span>v{v.version}</span>
                        </div>
                        {v.consent_obtained && (
                          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#16A34A]">
                            <ShieldCheck size={12} /> Consent on file
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {v.status !== "approved" && (
                        <GhostButton onClick={() => act(v.id, () => voiceApi.approveVoice(v.id), "Voice approved")} disabled={busy === v.id} className="px-3 py-1.5 text-[12px]">
                          <CheckCircle2 size={13} /> Approve
                        </GhostButton>
                      )}
                      {v.status === "approved" && (
                        <GhostButton onClick={() => act(v.id, () => voiceApi.revokeVoice(v.id), "Voice revoked")} disabled={busy === v.id} className="px-3 py-1.5 text-[12px]">
                          <Ban size={13} /> Revoke
                        </GhostButton>
                      )}
                      <GhostButton onClick={() => act(v.id, () => voiceApi.deleteVoice(v.id), "Voice deleted")} disabled={busy === v.id} className="px-3 py-1.5 text-[12px] text-[#EF4444]">
                        <Trash2 size={13} /> Delete
                      </GhostButton>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {styles.length > 0 && (
            <div>
              <SectionTitle icon={Sparkles} title="Style presets" subtitle="Emotion, tone and speed profiles your voices can adopt" />
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {styles.map((s) => (
                  <Card key={s.profile} className="p-4">
                    <div className="flex items-center gap-2">
                      <LanguagesIcon size={15} className="text-[#7C3AED]" />
                      <h4 className="text-[13px] font-bold capitalize text-[#0F172A]">{s.profile}</h4>
                    </div>
                    <dl className="mt-2 space-y-1 text-[11.5px] text-[#64748B]">
                      {Object.entries(s)
                        .filter(([k]) => k !== "profile")
                        .slice(0, 5)
                        .map(([k, val]) => (
                          <div key={k} className="flex items-center justify-between gap-2">
                            <dt className="capitalize">{k.replace(/_/g, " ")}</dt>
                            <dd className="font-medium text-[#334155]">{String(val)}</dd>
                          </div>
                        ))}
                    </dl>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && <CreateVoiceModal styles={styles} onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
