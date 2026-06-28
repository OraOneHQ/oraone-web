import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ShieldAlert,
  Loader2,
  RefreshCw,
  Radio,
  Ear,
  MessageSquare,
  Megaphone,
  Hand,
  PhoneForwarded,
  PhoneOff,
  Bot,
  User,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  StatCard,
  EmptyState,
} from "@/components/dashboard/kit";
import { formatApiError } from "@/lib/api";
import { voiceApi } from "@/lib/voice";
import { toast } from "sonner";

const STATE_TONE = {
  active: "green",
  speaking: "blue",
  listening: "indigo",
  ringing: "amber",
  transferred: "slate",
};

const ACTIONS = [
  { action: "listen", icon: Ear, label: "Listen" },
  { action: "whisper", icon: MessageSquare, label: "Whisper", needsMsg: true },
  { action: "barge", icon: Megaphone, label: "Barge", needsMsg: true },
  { action: "takeover", icon: Hand, label: "Take over" },
  { action: "force_transfer", icon: PhoneForwarded, label: "Transfer", needsTarget: true },
  { action: "end_call", icon: PhoneOff, label: "End", danger: true },
];

function fmtDur(s) {
  const m = Math.floor((s || 0) / 60);
  const sec = (s || 0) % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function CallCard({ call, onAction, busy }) {
  const human = !!call.human_active;
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#0F172A]">
              {human ? <User size={15} className="text-[#16A34A]" /> : <Bot size={15} className="text-[#2563EB]" />}
              {call.caller_number || "Unknown caller"}
            </span>
            <Badge tone={STATE_TONE[call.state] || "slate"}>{call.state}</Badge>
            <Badge tone="slate">{call.direction}</Badge>
            {call.supervised && (
              <Badge tone="indigo">
                <Radio size={11} /> supervised
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[11.5px] text-[#94A3B8]">
            <span>{fmtDur(call.duration_seconds)}</span>
            {call.language && <span>{call.language}</span>}
            {call.intent && <span>intent: {call.intent}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          if (!call.call_id) return null;
          return (
            <GhostButton
              key={a.action}
              onClick={() => onAction(call.call_id, a)}
              disabled={busy === call.call_id}
              className={`px-2.5 py-1.5 text-[12px] ${a.danger ? "text-[#EF4444]" : ""}`}
            >
              <Icon size={13} /> {a.label}
            </GhostButton>
          );
        })}
      </div>
    </Card>
  );
}

export default function Supervisor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [auto, setAuto] = useState(true);
  const timer = useRef(null);

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const d = await voiceApi.supervisorConsole();
      setData(d);
    } catch (e) {
      if (!silent) toast.error(formatApiError(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (auto) {
      timer.current = setInterval(() => load(true), 5000);
      return () => clearInterval(timer.current);
    }
    return undefined;
  }, [auto, load]);

  const onAction = async (callId, a) => {
    const body = { action: a.action };
    if (a.needsMsg) {
      const msg = window.prompt(`${a.label} message:`);
      if (msg == null) return;
      body.message = msg;
    }
    if (a.needsTarget) {
      const target = window.prompt("Transfer to (department or number):");
      if (target == null) return;
      body.target = target;
    }
    setBusy(callId);
    try {
      const r = await voiceApi.supervise(callId, body);
      toast[r.applied ? "success" : "info"](r.detail || `${a.label} ${r.applied ? "applied" : "recorded"}`);
      await load(true);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy("");
    }
  };

  const calls = data?.active_calls || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Supervisor"
        icon={ShieldAlert}
        title="Supervisor Console"
        subtitle="Monitor every live call, catch problems early and step in — listen, whisper, barge or take over."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAuto((v) => !v)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${auto ? "bg-[#ECFDF5] text-[#047857]" : "bg-[#F1F5F9] text-[#64748B]"}`}
            >
              <Radio size={12} className="mr-1 inline" /> {auto ? "Live" : "Paused"}
            </button>
            <GhostButton onClick={() => load()} disabled={loading} className="px-3 py-2 text-[13px]">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
            </GhostButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Radio} label="Active calls" value={data?.total_active ?? 0} tone="#2563EB" bg="#EFF4FF" />
        <StatCard icon={Bot} label="AI handling" value={data?.ai_calls ?? 0} tone="#7C3AED" bg="#F5F3FF" />
        <StatCard icon={User} label="Human handling" value={data?.human_calls ?? 0} tone="#16A34A" bg="#F0FDF4" />
        <StatCard icon={Ear} label="Supervised" value={data?.supervised ?? 0} tone="#D97706" bg="#FFFBEB" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#94A3B8]" />
        </div>
      ) : calls.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No live calls"
          hint="Active calls appear here in real time. Start a call to monitor it live and intervene if needed."
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {calls.map((c) => (
            <CallCard key={c.session_id} call={c} onAction={onAction} busy={busy} />
          ))}
        </div>
      )}
    </div>
  );
}
