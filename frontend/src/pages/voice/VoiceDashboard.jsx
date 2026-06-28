import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PhoneCall,
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  Gauge,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowRight,
  RefreshCw,
  PhoneOutgoing,
  PhoneIncoming,
  Server,
  Cpu,
  Mic,
  Volume2,
  Brain,
  Database,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  PageHeader,
  Card,
  StatCard,
  SectionTitle,
  Badge,
  GhostButton,
  PrimaryButton,
  EmptyState,
} from "@/components/dashboard/kit";
import {
  AnimatedNumber,
  StatCardSkeleton,
  ProviderChip,
  TrialBanner,
  LiveDot,
  Waveform,
  Reveal,
} from "@/components/voice/widgets";
import PlaceCallModal from "@/components/voice/PlaceCallModal";
import {
  voiceApi,
  fmtDuration,
  fmtMs,
  fmtMoney,
  fmtPct,
  fmtRelative,
  fmtPhone,
  CALL_STATUS_TONE,
  statusLabel,
  isTrialAccount,
} from "@/lib/voice";

const POLL_MS = 8000;

function DirectionIcon({ direction }) {
  return direction === "outbound" ? (
    <PhoneOutgoing className="h-3.5 w-3.5 text-[#7C3AED]" />
  ) : (
    <PhoneIncoming className="h-3.5 w-3.5 text-[#2563EB]" />
  );
}

export default function VoiceDashboard() {
  const [config, setConfig] = useState(null);
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const timer = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [cfg, dash, sess] = await Promise.allSettled([
        voiceApi.config(),
        voiceApi.dashboard(),
        voiceApi.sessions(),
      ]);
      if (cfg.status === "fulfilled") setConfig(cfg.value);
      if (dash.status === "fulfilled") setData(dash.value);
      if (sess.status === "fulfilled") setSessions(Array.isArray(sess.value) ? sess.value : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(timer.current);
  }, [load]);

  const systemTiles = useMemo(() => {
    const providers = config?.providers || {};
    return [
      { key: "twilio", label: "Twilio", desc: "Telephony", icon: Server, ok: !!providers.twilio },
      { key: "deepgram", label: "Deepgram", desc: "Speech-to-Text", icon: Mic, ok: !!providers.deepgram },
      { key: "elevenlabs", label: "ElevenLabs", desc: "Text-to-Speech", icon: Volume2, ok: !!providers.elevenlabs },
      { key: "openrouter", label: "OpenRouter", desc: "Language Model", icon: Cpu, ok: providers.openrouter !== false },
      { key: "memory", label: "Memory", desc: "Conversation state", icon: Brain, ok: config ? true : false },
      { key: "vector", label: "Vector DB", desc: "Knowledge retrieval", icon: Database, ok: config ? true : false },
    ];
  }, [config]);

  const allOk = systemTiles.every((t) => t.ok);
  const okCount = systemTiles.filter((t) => t.ok).length;

  const d = data || {};
  const successRate = d.completed != null && (d.completed + d.failed) > 0 ? d.completed / (d.completed + d.failed) : d.ai_resolution_rate || 0;

  const metrics = [
    { icon: PhoneCall, label: "Today's Calls", value: <AnimatedNumber value={d.calls_today || 0} />, bg: "#EFF4FF", tone: "#2563EB" },
    { icon: Radio, label: "Active Calls", value: <AnimatedNumber value={d.live_calls || 0} />, bg: "#ECFEFF", tone: "#0891B2", live: (d.live_calls || 0) > 0 },
    { icon: CheckCircle2, label: "Completed", value: <AnimatedNumber value={d.completed || 0} />, bg: "#ECFDF3", tone: "#16A34A" },
    { icon: XCircle, label: "Failed", value: <AnimatedNumber value={d.failed || 0} />, bg: "#FEF3F2", tone: "#EF4444" },
    { icon: Clock, label: "Avg Duration", value: fmtDuration(d.avg_duration_seconds), bg: "#F5F3FF", tone: "#7C3AED" },
    { icon: Gauge, label: "Avg Latency", value: fmtMs(d.avg_latency_ms), bg: "#FFF7ED", tone: "#EA580C" },
    { icon: TrendingUp, label: "Success Rate", value: <AnimatedNumber value={successRate * 100} decimals={0} suffix="%" />, bg: "#ECFDF3", tone: "#16A34A" },
    { icon: DollarSign, label: "Voice Cost", value: <AnimatedNumber value={d.total_cost || 0} decimals={2} prefix="$" />, bg: "#FEFCE8", tone: "#CA8A04" },
  ];

  const recent = d.recent_calls || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={Sparkles}
        title="Voice Command Center"
        subtitle="Realtime overview of your AI calling operation."
        actions={
          <>
            <GhostButton onClick={() => load()} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </GhostButton>
            <PrimaryButton onClick={() => setShowCall(true)}>
              <PhoneOutgoing size={16} /> Place Call
            </PrimaryButton>
          </>
        }
      />

      {isTrialAccount(config) && <TrialBanner />}

      {/* ── System health hero ─────────────────────────────────────────── */}
      <Reveal>
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0B1220] via-[#111C36] to-[#1E2A57] p-6 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[#2563EB]/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-64 rounded-full bg-[#7C3AED]/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <ShieldCheck size={22} className={allOk ? "text-emerald-300" : "text-amber-300"} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-bold">System Health</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${allOk ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
                    {allOk ? "All systems operational" : `${okCount}/${systemTiles.length} connected`}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-white/60">Live status of the voice infrastructure powering your agents.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-2.5 ring-1 ring-white/10">
              <Waveform active={(d.live_calls || 0) > 0} color="#60A5FA" bars={20} className="h-6" />
              <div className="text-right">
                <p className="text-[20px] font-extrabold leading-none">
                  <AnimatedNumber value={d.live_calls || 0} />
                </p>
                <p className="text-[11px] text-white/60">live calls</p>
              </div>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {systemTiles.map((t) => (
              <ProviderChip key={t.key} label={t.label} desc={t.desc} ok={t.ok} icon={t.icon} />
            ))}
          </div>
        </Card>
      </Reveal>

      {/* ── Metric cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
          : metrics.map((m, i) => (
              <Reveal key={m.label} delay={i * 0.03}>
                <Card hover className="h-full p-4">
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-xl" style={{ background: m.bg }}>
                      <m.icon size={16} style={{ color: m.tone }} />
                    </span>
                    {m.live && <LiveDot tone="green" />}
                  </div>
                  <p className="mt-3 text-[24px] font-extrabold tracking-tight text-[#0F172A]">{m.value}</p>
                  <p className="mt-0.5 text-[12px] text-[#64748B]">{m.label}</p>
                </Card>
              </Reveal>
            ))}
      </div>

      {/* ── Realtime + recent ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Live calls */}
        <Card className="p-5 xl:col-span-1">
          <SectionTitle
            icon={Activity}
            title="Live Calls"
            subtitle="Active sessions right now"
            tone="#0891B2"
            right={<Badge tone={sessions.length ? "green" : "slate"}>{sessions.length} active</Badge>}
          />
          {sessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E7EAF1] bg-[#FBFCFE] p-6 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#F1F5F9] text-[#94A3B8]">
                <Radio size={20} />
              </span>
              <p className="mt-2 text-[13px] font-semibold text-[#0F172A]">No live calls</p>
              <p className="mt-0.5 text-[12px] text-[#64748B]">Active conversations will appear here in realtime.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {sessions.slice(0, 6).map((s) => (
                <motion.div
                  key={s.id || s.session_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-[#E7EAF1] bg-white p-3"
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-[#ECFEFF] text-[#0891B2]">
                    <PhoneCall size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#0F172A]">{fmtPhone(s.to_number || s.from_number || s.caller || "In progress")}</p>
                    <p className="text-[11px] text-[#64748B]">{statusLabel(s.state || s.status || "in_progress")}</p>
                  </div>
                  <Waveform active color="#0891B2" bars={10} className="h-5" />
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent calls */}
        <Card className="p-5 xl:col-span-2">
          <SectionTitle
            icon={PhoneCall}
            title="Recent Calls"
            subtitle="Latest activity across your agents"
            right={
              <Link to="/app/voice/calls" className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#2563EB] hover:underline">
                View all <ArrowRight size={14} />
              </Link>
            }
          />
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-[#F1F5F9]" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState icon={PhoneCall} title="No calls yet" hint="Place your first outbound call to see it here." action={<PrimaryButton onClick={() => setShowCall(true)}><PhoneOutgoing size={16} /> Place Call</PrimaryButton>} />
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#EEF2F8]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FBFCFE] text-left text-[11px] uppercase tracking-wide text-[#94A3B8]">
                    <th className="px-4 py-2.5 font-semibold">Direction</th>
                    <th className="px-4 py-2.5 font-semibold">Number</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Duration</th>
                    <th className="px-4 py-2.5 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {recent.slice(0, 8).map((c) => (
                    <tr key={c.id} className="transition-colors hover:bg-[#FBFCFE]">
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-[12.5px] capitalize text-[#475569]">
                          <DirectionIcon direction={c.direction} />
                          {c.direction || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#0F172A]">
                        <Link to={`/app/voice/calls/${c.id}`} className="hover:text-[#2563EB] hover:underline">
                          {fmtPhone(c.to_number || c.from_number)}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={CALL_STATUS_TONE[c.status] || "slate"}>{statusLabel(c.status)}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-[#475569]">{fmtDuration(c.duration_seconds)}</td>
                      <td className="px-4 py-2.5 text-[#94A3B8]">{fmtRelative(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <PlaceCallModal open={showCall} onClose={() => setShowCall(false)} onPlaced={() => load()} callerNumber={config?.phone_number} />
    </div>
  );
}
