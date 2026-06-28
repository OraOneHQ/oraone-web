import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Send,
  Trash2,
  Upload,
  X,
  Phone,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  FileText,
  Copy,
  Archive,
  ArchiveRestore,
  Download,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  PrimaryButton,
  EmptyState,
  StatCard,
  SectionTitle,
} from "@/components/dashboard/kit";
import { formatApiError } from "@/lib/api";
import {
  voiceApi,
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUS_TONE,
  fmtRelative,
} from "@/lib/voice";
import { toast } from "sonner";

/* ── helpers ──────────────────────────────────────────────────────────────── */
const typeMeta = (goal) =>
  CAMPAIGN_TYPES.find((t) => t.value === goal) || {
    label: goal || "Campaign",
    tone: "#64748B",
    bg: "#F1F5F9",
    desc: "",
  };

function Progress({ done = 0, failed = 0, total = 0 }) {
  const pct = total ? Math.round(((done + failed) / total) * 100) : 0;
  const donePct = total ? (done / total) * 100 : 0;
  const failPct = total ? (failed / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] font-medium text-[#64748B]">
        <span>
          {done + failed} / {total} dialed
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-[#EEF2F7]">
        <div className="h-full bg-[#16A34A]" style={{ width: `${donePct}%` }} />
        <div className="h-full bg-[#EF4444]" style={{ width: `${failPct}%` }} />
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-[#334155]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

const inputCls =
  "mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

/* ── Create campaign modal ───────────────────────────────────────────────── */
function CreateModal({ open, onClose, agents, onCreated }) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("cold_calling");
  const [agentId, setAgentId] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [script, setScript] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [concurrency, setConcurrency] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setGoal("cold_calling");
      setAgentId(agents[0]?.id || "");
      setFromNumber("");
      setScript("");
      setMaxAttempts(3);
      setConcurrency(1);
    }
  }, [open, agents]);

  const submit = async () => {
    if (!name.trim()) return toast.error("Give your campaign a name.");
    if (!agentId) return toast.error("Pick an AI agent to run the calls.");
    setSaving(true);
    try {
      const created = await voiceApi.createCampaign({
        agent_id: agentId,
        name: name.trim(),
        goal,
        from_number: fromNumber.trim() || null,
        script: script.trim() || null,
        max_attempts: Number(maxAttempts) || 3,
        concurrency: Number(concurrency) || 1,
      });
      toast.success("Campaign created");
      onCreated?.(created);
      onClose();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0F172A]/40 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="my-8 w-full max-w-2xl rounded-2xl border border-[#E7EAF1] bg-white shadow-xl"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
          >
            <div className="flex items-center justify-between border-b border-[#EEF2F7] px-6 py-4">
              <h2 className="text-[16px] font-bold text-[#0F172A]">New campaign</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <Field label="Campaign name">
                <input
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="June EMI reminders"
                  autoFocus
                />
              </Field>

              <div>
                <span className="text-[12.5px] font-semibold text-[#334155]">Campaign type</span>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CAMPAIGN_TYPES.map((t) => {
                    const active = goal === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setGoal(t.value)}
                        className={`rounded-xl border px-3 py-2 text-left transition ${
                          active
                            ? "border-[#2563EB] ring-2 ring-[#2563EB]/15"
                            : "border-[#E7EAF1] hover:border-[#CBD5E1]"
                        }`}
                        style={active ? { background: t.bg } : {}}
                      >
                        <span className="block text-[12.5px] font-semibold" style={{ color: t.tone }}>
                          {t.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-tight text-[#94A3B8]">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="AI agent" hint="The agent's persona, voice and knowledge are used on every call.">
                <select className={inputCls} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                  <option value="">Select an agent…</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name || "Untitled agent"}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Caller ID (from number)" hint="Optional — defaults to your voice number.">
                  <input
                    className={inputCls}
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value)}
                    placeholder="+1 555 012 3456"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Max attempts">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className={inputCls}
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(e.target.value)}
                    />
                  </Field>
                  <Field label="Concurrency">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className={inputCls}
                      value={concurrency}
                      onChange={(e) => setConcurrency(e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <Field
                label="Call script / goal prompt"
                hint="What should the agent achieve? Use {{name}} or any CSV column as a variable."
              >
                <textarea
                  className={`${inputCls} min-h-[90px] resize-y`}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Hi {{name}}, this is a friendly reminder that your EMI of {{amount}} is due on {{due_date}}…"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#EEF2F7] px-6 py-4">
              <GhostButton onClick={onClose} className="px-4 py-2 text-[13px]">
                Cancel
              </GhostButton>
              <PrimaryButton onClick={submit} disabled={saving} className="px-4 py-2 text-[13px]">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create campaign
              </PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Campaign detail ─────────────────────────────────────────────────────── */
function CampaignDetail({ campaign, onBack, onChanged }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState("");
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await voiceApi.campaignContacts(campaign.id, { limit: 500 });
      setContacts(d?.items || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshCampaign = async () => {
    try {
      const c = await voiceApi.campaign(campaign.id);
      onChanged?.(c);
    } catch {
      /* ignore */
    }
  };

  const importCsv = async () => {
    if (!csv.trim()) return toast.error("Paste CSV rows or choose a file first.");
    setBusy(true);
    try {
      const d = await voiceApi.uploadCampaignContacts(campaign.id, csv);
      toast.success(`Imported ${d?.total || 0} contacts`);
      setCsv("");
      setShowImport(false);
      await load();
      await refreshCampaign();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsv(String(reader.result || ""));
      setShowImport(true);
    };
    reader.readAsText(f);
  };

  const lifecycle = async (action) => {
    setBusy(true);
    try {
      const fn =
        action === "start"
          ? voiceApi.startCampaign
          : action === "pause"
          ? voiceApi.pauseCampaign
          : voiceApi.dispatchCampaign;
      const c = await fn(campaign.id);
      onChanged?.(c);
      toast.success(
        action === "start" ? "Campaign started — dialing now" : action === "pause" ? "Campaign paused" : "Dialing next batch"
      );
      await load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  const removeContact = async (id) => {
    try {
      await voiceApi.deleteCampaignContact(campaign.id, id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      await refreshCampaign();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const t = typeMeta(campaign.goal);
  const running = campaign.status === "running";
  const finished = campaign.status === "completed" || campaign.status === "canceled";

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[13px] font-medium text-[#64748B] hover:text-[#0F172A]">
        <ArrowLeft size={15} /> All campaigns
      </button>

      <PageHeader
        eyebrow={t.label}
        icon={Megaphone}
        title={campaign.name}
        subtitle={campaign.description || t.desc}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={CAMPAIGN_STATUS_TONE[campaign.status] || "slate"}>{campaign.status}</Badge>
            {!finished && !running && (
              <PrimaryButton onClick={() => lifecycle("start")} disabled={busy} className="px-4 py-2 text-[13px]">
                <Play size={15} /> Start
              </PrimaryButton>
            )}
            {running && (
              <>
                <GhostButton onClick={() => lifecycle("dispatch")} disabled={busy} className="px-3 py-2 text-[13px]">
                  <Send size={14} /> Dial next batch
                </GhostButton>
                <PrimaryButton onClick={() => lifecycle("pause")} disabled={busy} className="px-4 py-2 text-[13px]">
                  <Pause size={15} /> Pause
                </PrimaryButton>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total contacts" value={campaign.total_contacts} tone="#2563EB" bg="#EFF4FF" />
        <StatCard icon={CheckCircle2} label="Completed" value={campaign.completed_contacts} tone="#16A34A" bg="#ECFDF3" />
        <StatCard icon={XCircle} label="Failed" value={campaign.failed_contacts} tone="#EF4444" bg="#FEF2F2" />
        <StatCard icon={Phone} label="Max attempts" value={campaign.max_attempts} tone="#7C3AED" bg="#F5F3FF" />
      </div>

      <Card className="p-5">
        <Progress done={campaign.completed_contacts} failed={campaign.failed_contacts} total={campaign.total_contacts} />
      </Card>

      <div>
        <SectionTitle
          icon={Users}
          title="Contacts"
          subtitle="The people this campaign will call"
          right={
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
              <GhostButton onClick={() => fileRef.current?.click()} className="px-3 py-1.5 text-[12.5px]">
                <FileText size={14} /> Choose CSV
              </GhostButton>
              <PrimaryButton onClick={() => setShowImport((v) => !v)} className="px-3 py-1.5 text-[12.5px]">
                <Upload size={14} /> Import
              </PrimaryButton>
            </div>
          }
        />

        <AnimatePresence>
          {showImport && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Card className="mb-4 p-4">
                <p className="text-[12.5px] text-[#64748B]">
                  Paste CSV with a header row. A <b>phone</b> column is required (phone, mobile, number…). A{" "}
                  <b>name</b> column is optional; any other columns become call variables.
                </p>
                <textarea
                  className={`${inputCls} mt-2 min-h-[120px] resize-y font-mono text-[12px]`}
                  value={csv}
                  onChange={(e) => setCsv(e.target.value)}
                  placeholder={"name,phone,amount,due_date\nAsha,+15550100,₹4,500,2026-07-01"}
                />
                <div className="mt-3 flex justify-end gap-2">
                  <GhostButton onClick={() => setShowImport(false)} className="px-4 py-2 text-[13px]">
                    Cancel
                  </GhostButton>
                  <PrimaryButton onClick={importCsv} disabled={busy} className="px-4 py-2 text-[13px]">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Import contacts
                  </PrimaryButton>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#94A3B8]" />
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts yet"
            hint="Import a CSV of phone numbers to populate this campaign."
            action={
              <PrimaryButton onClick={() => setShowImport(true)} className="px-4 py-2 text-[13px]">
                <Upload size={15} /> Import contacts
              </PrimaryButton>
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="border-b border-[#EEF2F7] bg-[#FAFBFD] text-[11.5px] uppercase tracking-wide text-[#94A3B8]">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Phone</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Attempts</th>
                    <th className="px-4 py-2.5 font-semibold">Outcome</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-[#F1F5F9] last:border-0">
                      <td className="px-4 py-2.5 font-medium text-[#0F172A]">{c.name || "—"}</td>
                      <td className="px-4 py-2.5 text-[#475569]">{c.phone_number}</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={CAMPAIGN_STATUS_TONE[c.status] || "slate"}>{c.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-[#475569]">{c.attempts}</td>
                      <td className="px-4 py-2.5 text-[#94A3B8]">{c.outcome || "—"}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => removeContact(c.id)}
                          className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                          title="Remove"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a] = await Promise.allSettled([
        voiceApi.campaigns({ limit: 100 }),
        voiceApi.agents({ limit: 100 }),
      ]);
      if (c.status === "fulfilled") setCampaigns(c.value?.items || []);
      if (a.status === "fulfilled") setAgents(a.value?.items || a.value?.agents || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const total = campaigns.length;
    const running = campaigns.filter((c) => c.status === "running").length;
    const contacts = campaigns.reduce((s, c) => s + (c.total_contacts || 0), 0);
    const completed = campaigns.reduce((s, c) => s + (c.completed_contacts || 0), 0);
    return { total, running, contacts, completed };
  }, [campaigns]);

  const upsert = (c) => {
    setCampaigns((prev) => {
      const i = prev.findIndex((x) => x.id === c.id);
      if (i === -1) return [c, ...prev];
      const next = [...prev];
      next[i] = c;
      return next;
    });
    setSelected((s) => (s && s.id === c.id ? c : s));
  };

  const remove = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this campaign and its contacts?")) return;
    try {
      await voiceApi.deleteCampaign(id);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campaign deleted");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const clone = async (id, e) => {
    e?.stopPropagation();
    try {
      const c = await voiceApi.cloneCampaign(id, true);
      upsert(c);
      toast.success("Campaign cloned");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const toggleArchive = async (c, e) => {
    e?.stopPropagation();
    try {
      const updated =
        c.status === "archived"
          ? await voiceApi.unarchiveCampaign(c.id)
          : await voiceApi.archiveCampaign(c.id);
      upsert(updated);
      toast.success(c.status === "archived" ? "Campaign restored" : "Campaign archived");
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const exportContacts = async (c, e) => {
    e?.stopPropagation();
    try {
      const blob = await voiceApi.exportCampaignContacts(c.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(c.name || "campaign").replace(/[^a-z0-9]+/gi, "_")}_contacts.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  if (selected) {
    return (
      <CampaignDetail
        campaign={selected}
        onBack={() => setSelected(null)}
        onChanged={(c) => upsert(c)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Campaign Builder"
        icon={Megaphone}
        title="Campaigns"
        subtitle="Upload contacts and let your AI agent call, qualify and book — automatically."
        actions={
          <PrimaryButton onClick={() => setShowCreate(true)} className="px-4 py-2 text-[13px]">
            <Plus size={16} /> New campaign
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Megaphone} label="Campaigns" value={stats.total} tone="#2563EB" bg="#EFF4FF" />
        <StatCard icon={Play} label="Running" value={stats.running} tone="#16A34A" bg="#ECFDF3" />
        <StatCard icon={Users} label="Contacts" value={stats.contacts} tone="#7C3AED" bg="#F5F3FF" />
        <StatCard icon={CheckCircle2} label="Calls completed" value={stats.completed} tone="#EA580C" bg="#FFF7ED" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#94A3B8]" />
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          hint="Create your first outbound calling campaign — cold calls, reminders, follow-ups and more."
          action={
            <PrimaryButton onClick={() => setShowCreate(true)} className="px-4 py-2 text-[13px]">
              <Plus size={16} /> New campaign
            </PrimaryButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {campaigns.map((c) => {
            const t = typeMeta(c.goal);
            return (
              <Card key={c.id} hover className="cursor-pointer p-5" onClick={() => setSelected(c)}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: t.bg }}>
                    <Megaphone size={18} style={{ color: t.tone }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[14.5px] font-bold text-[#0F172A]">{c.name}</h3>
                      <Badge tone={CAMPAIGN_STATUS_TONE[c.status] || "slate"}>{c.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[#94A3B8]">
                      {t.label} · updated {fmtRelative(c.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => clone(c.id, e)}
                      className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#EFF4FF] hover:text-[#2563EB]"
                      title="Clone"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={(e) => exportContacts(c, e)}
                      className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#EFF4FF] hover:text-[#2563EB]"
                      title="Export contacts (CSV)"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      onClick={(e) => toggleArchive(c, e)}
                      className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                      title={c.status === "archived" ? "Restore" : "Archive"}
                    >
                      {c.status === "archived" ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                    </button>
                    <button
                      onClick={(e) => remove(c.id, e)}
                      className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress done={c.completed_contacts} failed={c.failed_contacts} total={c.total_contacts} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        agents={agents}
        onCreated={(c) => {
          upsert(c);
          setSelected(c);
        }}
      />
    </div>
  );
}
