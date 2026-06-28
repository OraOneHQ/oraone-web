import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  PhoneOutgoing,
  Bot,
  Loader2,
  Hash,
  Globe,
  Mic,
  FileText,
  CircleDot,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PrimaryButton, GhostButton, cx } from "@/components/dashboard/kit";
import { Waveform, FriendlyError } from "@/components/voice/widgets";
import { voiceApi, friendlyVoiceError } from "@/lib/voice";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "pt", label: "Portuguese" },
];

function Field({ label, icon: Icon, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#334155]">
        {Icon && <Icon size={13} className="text-[#94A3B8]" />}
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

/**
 * Premium "Place Call" modal — agent picker, caller-id, language, voice toggle,
 * custom variables, record/transcript switches, animated states, and friendly
 * Twilio error handling. `defaultAgentId` pre-selects an agent.
 */
export default function PlaceCallModal({ open, onClose, onPlaced, defaultAgentId, callerNumber }) {
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState(defaultAgentId || "");
  const [toNumber, setToNumber] = useState("");
  const [language, setLanguage] = useState("en");
  const [record, setRecord] = useState(true);
  const [transcript, setTranscript] = useState(true);
  const [vars, setVars] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [loadingAgents, setLoadingAgents] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoadingAgents(true);
    voiceApi
      .agents({ limit: 100 })
      .then((d) => {
        const items = d?.items || d?.agents || [];
        setAgents(items);
        setAgentId((id) => id || defaultAgentId || items[0]?.id || "");
      })
      .catch(() => setAgents([]))
      .finally(() => setLoadingAgents(false));
  }, [open, defaultAgentId]);

  const selectedAgent = useMemo(() => agents.find((a) => a.id === agentId), [agents, agentId]);

  const addVar = () => setVars((v) => [...v, { key: "", value: "" }]);
  const updVar = (i, patch) => setVars((v) => v.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const delVar = (i) => setVars((v) => v.filter((_, idx) => idx !== i));

  const validNumber = /^\+?[1-9]\d{6,14}$/.test(toNumber.replace(/[\s()-]/g, ""));

  const place = async () => {
    setError(null);
    if (!agentId) return setError({ title: "Pick an agent", reason: "Choose which voice agent should make this call.", retryable: false });
    if (!validNumber)
      return setError({
        title: "Invalid phone number",
        reason: "Enter the number in full international format.",
        fix: "For example: +14155551234",
        retryable: false,
      });
    setPlacing(true);
    try {
      const payload = {
        agent_id: agentId,
        to_number: toNumber.replace(/[\s()-]/g, ""),
        language,
        record,
        transcript,
      };
      const customVars = vars.filter((v) => v.key.trim());
      if (customVars.length) payload.variables = Object.fromEntries(customVars.map((v) => [v.key.trim(), v.value]));

      const data = await voiceApi.placeCall(payload);
      if (data.status === "failed") {
        setError(friendlyVoiceError(data));
      } else {
        toast.success("Outbound call placed");
        onPlaced?.(data);
        onClose?.();
      }
    } catch (e) {
      setError(friendlyVoiceError(e));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] grid place-items-center bg-[#0F172A]/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with animated waveform */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#2563EB] to-[#4F46E5] px-6 pb-5 pt-6 text-white">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-white/15">
                  <PhoneOutgoing size={20} />
                </span>
                <div>
                  <h2 className="text-[18px] font-bold leading-tight">Place an outbound call</h2>
                  <p className="text-[12.5px] text-white/70">Your AI agent will dial and handle the conversation.</p>
                </div>
              </div>
              <Waveform active className="mt-4 h-7 opacity-80" color="#ffffff" bars={40} />
            </div>

            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5 scrollbar-thin">
              <FriendlyError error={error} onRetry={place} retrying={placing} />

              <Field label="Agent" icon={Bot}>
                <select className={inputCls} value={agentId} onChange={(e) => setAgentId(e.target.value)} disabled={loadingAgents}>
                  {loadingAgents && <option>Loading agents…</option>}
                  {!loadingAgents && !agents.length && <option value="">No agents available</option>}
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Destination number" icon={Hash} hint="Full international format">
                  <input
                    className={cx(inputCls, toNumber && !validNumber && "border-[#FDA29B] focus:border-[#F04438] focus:ring-[#F04438]/15")}
                    placeholder="+14155551234"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                    inputMode="tel"
                  />
                </Field>
                <Field label="Caller ID" icon={CircleDot} hint={callerNumber ? "Your connected number" : "Default number"}>
                  <input className={cx(inputCls, "bg-[#F8FAFC] text-[#64748B]")} value={callerNumber || "Default"} readOnly />
                </Field>
              </div>

              <Field label="Language" icon={Globe}>
                <select className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-3">
                <Toggle icon={Mic} label="Record call" checked={record} onChange={setRecord} />
                <Toggle icon={FileText} label="Live transcript" checked={transcript} onChange={setTranscript} />
              </div>

              {/* Custom variables */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-[#334155]">Custom variables</span>
                  <button onClick={addVar} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2563EB] hover:underline">
                    <Plus size={13} /> Add
                  </button>
                </div>
                {!vars.length && <p className="text-[11.5px] text-[#94A3B8]">Pass dynamic values (e.g. customer_name) into the agent's prompt.</p>}
                <div className="space-y-2">
                  {vars.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input className={cx(inputCls, "py-2")} placeholder="key" value={row.key} onChange={(e) => updVar(i, { key: e.target.value })} />
                      <input className={cx(inputCls, "py-2")} placeholder="value" value={row.value} onChange={(e) => updVar(i, { value: e.target.value })} />
                      <button onClick={() => delVar(i)} className="grid size-9 shrink-0 place-items-center rounded-lg text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#EF4444]">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#EEF2F8] bg-[#FBFCFE] px-6 py-4">
              <GhostButton onClick={onClose}>Cancel</GhostButton>
              <PrimaryButton onClick={place} disabled={placing || !agents.length} className="min-w-[140px]">
                {placing ? <Loader2 size={16} className="animate-spin" /> : <PhoneOutgoing size={16} />}
                {placing ? "Calling…" : "Start Call"}
              </PrimaryButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({ icon: Icon, label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
        checked ? "border-[#BFD3FF] bg-[#EFF4FF]" : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"
      )}
    >
      <span className={cx("grid size-8 place-items-center rounded-lg", checked ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#94A3B8]")}>
        <Icon size={15} />
      </span>
      <span className="flex-1">
        <span className="block text-[12.5px] font-semibold text-[#0F172A]">{label}</span>
        <span className={cx("block text-[11px]", checked ? "text-[#2563EB]" : "text-[#94A3B8]")}>{checked ? "Enabled" : "Disabled"}</span>
      </span>
    </button>
  );
}
