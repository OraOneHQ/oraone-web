import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneOff,
  Radio,
  Clock,
  DollarSign,
  Gauge,
  CheckCircle2,
  Users,
  RefreshCw,
  Loader2,
  Mic,
  Bot,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import {
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  Badge,
  GhostButton,
  PrimaryButton,
  EmptyState,
} from "@/components/dashboard/kit";

const STATUS_TONE = {
  completed: "green",
  in_progress: "blue",
  ringing: "indigo",
  queued: "slate",
  transferred: "amber",
  voicemail: "amber",
  failed: "red",
  busy: "red",
  no_answer: "red",
  canceled: "slate",
};

function fmtDuration(seconds) {
  const s = Math.round(Number(seconds) || 0);
  if (!s) return "0s";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m}m ${r}s` : `${r}s`;
}

function fmtTime(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function DirectionIcon({ direction }) {
  if (direction === "outbound") return <PhoneOutgoing className="h-3.5 w-3.5 text-[#7C3AED]" />;
  return <PhoneIncoming className="h-3.5 w-3.5 text-[#2563EB]" />;
}

function OutboundDialog({ open, onClose, onPlaced }) {
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!open) return;
    api
      .get("/agents", { params: { limit: 100 } })
      .then((r) => {
        const items = r.data?.items || r.data?.agents || [];
        setAgents(items);
        if (items.length) setAgentId((id) => id || items[0].id);
      })
      .catch(() => setAgents([]));
  }, [open]);

  const place = async () => {
    if (!agentId || !toNumber.trim()) {
      toast.error("Pick an agent and enter a phone number.");
      return;
    }
    setPlacing(true);
    try {
      const { data } = await api.post("/voice/outgoing", {
        agent_id: agentId,
        to_number: toNumber.trim(),
      });
      if (data.status === "failed") {
        toast.error(data.message || "Call failed to start.");
      } else {
        toast.success("Outbound call placed.");
      }
      onPlaced?.();
      onClose();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setPlacing(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#0F172A]/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[#EFF4FF]">
              <PhoneOutgoing className="h-4 w-4 text-[#2563EB]" />
            </span>
            <h3 className="text-[15px] font-bold text-[#0F172A]">Place outbound call</h3>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mb-1 block text-[12px] font-semibold text-[#475569]">Agent</label>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="mb-4 w-full rounded-xl border border-[#E7EAF1] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
        >
          {agents.length === 0 && <option value="">No agents available</option>}
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <label className="mb-1 block text-[12px] font-semibold text-[#475569]">Phone number</label>
        <input
          value={toNumber}
          onChange={(e) => setToNumber(e.target.value)}
          placeholder="+15551234567"
          className="mb-5 w-full rounded-xl border border-[#E7EAF1] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton onClick={place} disabled={placing}>
            {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
            Call now
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default function Voice() {
  const [dashboard, setDashboard] = useState(null);
  const [config, setConfig] = useState(null);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialOpen, setDialOpen] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [d, c, callsRes] = await Promise.all([
        api.get("/voice/dashboard"),
        api.get("/voice/config"),
        api.get("/voice/calls", { params: { limit: 25 } }),
      ]);
      setDashboard(d.data);
      setConfig(c.data);
      setCalls(callsRes.data?.items || []);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 15000);
    return () => clearInterval(t);
  }, [load]);

  const stats = useMemo(() => {
    const d = dashboard || {};
    return [
      { icon: Phone, label: "Calls Today", value: d.calls_today ?? 0, tone: "#2563EB", bg: "#EFF4FF" },
      { icon: Radio, label: "Live Calls", value: d.live_calls ?? 0, tone: "#16A34A", bg: "#DCFCE7" },
      { icon: CheckCircle2, label: "Completed", value: d.completed ?? 0, tone: "#0EA5E9", bg: "#E0F2FE" },
      { icon: PhoneOff, label: "Failed", value: d.failed ?? 0, tone: "#DC2626", bg: "#FEE2E2" },
      { icon: Clock, label: "Avg Duration", value: fmtDuration(d.avg_duration_seconds), tone: "#7C3AED", bg: "#F5F3FF" },
      { icon: DollarSign, label: "Total Cost", value: `$${(Number(d.total_cost) || 0).toFixed(2)}`, tone: "#B45309", bg: "#FEF3C7" },
      { icon: Gauge, label: "Avg Latency", value: `${Math.round(d.avg_latency_ms || 0)}ms`, tone: "#0891B2", bg: "#CFFAFE" },
      { icon: Bot, label: "AI Resolution", value: `${Math.round((d.ai_resolution_rate || 0) * 100)}%`, tone: "#16A34A", bg: "#DCFCE7" },
      { icon: Users, label: "Human Transfer", value: `${Math.round((d.human_transfer_rate || 0) * 100)}%`, tone: "#DB2777", bg: "#FCE7F3" },
    ];
  }, [dashboard]);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Mic}
        eyebrow="Voice"
        title="Voice Agents"
        subtitle="Live calls, performance and outbound dialing for your AI phone agents."
        actions={
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </GhostButton>
            <PrimaryButton onClick={() => setDialOpen(true)}>
              <PhoneOutgoing className="h-4 w-4" />
              Place call
            </PrimaryButton>
          </div>
        }
      />

      {/* Provider status */}
      {config && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#64748B]" />
              <span className="text-[13px] font-semibold text-[#0F172A]">
                {config.phone_number || "No number configured"}
              </span>
            </div>
            {[
              { key: "twilio", label: "Telephony" },
              { key: "deepgram", label: "Speech-to-Text" },
              { key: "elevenlabs", label: "Text-to-Speech" },
            ].map((p) => (
              <div key={p.key} className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    config.providers?.[p.key] ? "bg-[#16A34A]" : "bg-[#CBD5E1]"
                  }`}
                />
                <span className="text-[12.5px] text-[#475569]">
                  {p.label}
                  <span className="ml-1 font-semibold text-[#94A3B8]">
                    {config.providers?.[p.key] ? "connected" : "not set"}
                  </span>
                </span>
              </div>
            ))}
            <Badge tone={config.redis_sessions ? "green" : "slate"}>
              {config.redis_sessions ? "Distributed sessions" : "In-memory sessions"}
            </Badge>
          </div>
        </Card>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Recent calls */}
      <Card className="p-5">
        <SectionTitle icon={PhoneCall} title="Recent calls" subtitle="Latest inbound and outbound voice sessions" />
        {calls.length === 0 ? (
          <EmptyState
            icon={Phone}
            title="No calls yet"
            hint="Once a caller dials your voice number or you place an outbound call, it will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#E7EAF1] text-[11px] uppercase tracking-wide text-[#94A3B8]">
                  <th className="py-2 pr-3 font-semibold">Direction</th>
                  <th className="py-2 pr-3 font-semibold">From / To</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 pr-3 font-semibold">Duration</th>
                  <th className="py-2 pr-3 font-semibold">Sentiment</th>
                  <th className="py-2 pr-3 font-semibold">Started</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC]">
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1.5 capitalize text-[#475569]">
                        <DirectionIcon direction={c.direction} />
                        {c.direction || "inbound"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-medium text-[#0F172A]">
                      {c.caller_number || "—"}
                      <span className="mx-1 text-[#CBD5E1]">→</span>
                      {c.receiver_number || "—"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={STATUS_TONE[c.status] || "slate"}>{(c.status || "").replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-[#475569]">{fmtDuration(c.duration_seconds)}</td>
                    <td className="py-2.5 pr-3 capitalize text-[#475569]">{c.sentiment || "—"}</td>
                    <td className="py-2.5 pr-3 text-[#64748B]">{fmtTime(c.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OutboundDialog open={dialOpen} onClose={() => setDialOpen(false)} onPlaced={() => load(true)} />
    </div>
  );
}
