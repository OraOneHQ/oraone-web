import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  PhoneOutgoing,
  PhoneIncoming,
  Clock,
  DollarSign,
  Gauge,
  Bot,
  User,
  Play,
  Pause,
  Download,
  Code2,
  ListTree,
  MessageSquare,
  Phone,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  SectionTitle,
  EmptyState,
  cx,
} from "@/components/dashboard/kit";
import { Waveform, Skeleton, Reveal } from "@/components/voice/widgets";
import {
  voiceApi,
  fmtDuration,
  fmtMoney,
  fmtMs,
  fmtTime,
  fmtPhone,
  CALL_STATUS_TONE,
  statusLabel,
} from "@/lib/voice";

function StatTile({ icon: Icon, label, value, tone = "#2563EB", bg = "#EFF4FF" }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-xl" style={{ background: bg }}>
          <Icon size={16} style={{ color: tone }} />
        </span>
        <div>
          <p className="text-[18px] font-extrabold leading-tight text-[#0F172A]">{value}</p>
          <p className="text-[11.5px] text-[#64748B]">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function TranscriptBubble({ turn }) {
  const isAgent = turn.role === "assistant" || turn.role === "agent" || turn.speaker === "agent";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx("flex gap-3", isAgent ? "" : "flex-row-reverse")}
    >
      <span
        className={cx(
          "grid size-8 shrink-0 place-items-center rounded-xl text-white",
          isAgent ? "bg-gradient-to-br from-[#2563EB] to-[#4F46E5]" : "bg-[#334155]"
        )}
      >
        {isAgent ? <Bot size={15} /> : <User size={15} />}
      </span>
      <div className={cx("max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13px]", isAgent ? "rounded-tl-sm bg-[#EFF4FF] text-[#0F172A]" : "rounded-tr-sm bg-[#F1F5F9] text-[#0F172A]")}>
        <p className="mb-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[#94A3B8]">
          {isAgent ? "Agent" : "Caller"}
        </p>
        {turn.content || turn.text || turn.message}
      </div>
    </motion.div>
  );
}

export default function CallDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("transcript");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    voiceApi
      .call(id)
      .then((d) => active && setCall(d))
      .catch(() => active && setCall(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const transcript = useMemo(() => {
    if (!call) return [];
    const t = call.transcript || call.turns || call.messages || [];
    return Array.isArray(t) ? t : [];
  }, [call]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-40" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="space-y-6">
        <GhostButton as={Link} to="/app/voice/calls"><ArrowLeft size={16} /> Back to calls</GhostButton>
        <EmptyState icon={Phone} title="Call not found" hint="This call may have been deleted or is not in this project." />
      </div>
    );
  }

  const recording = call.recording_url || call.recording;

  return (
    <div className="space-y-6">
      <Link to="/app/voice/calls" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#64748B] hover:text-[#2563EB]">
        <ArrowLeft size={15} /> Back to Call History
      </Link>

      <PageHeader
        eyebrow="Call detail"
        icon={call.direction === "outbound" ? PhoneOutgoing : PhoneIncoming}
        title={fmtPhone(call.to_number || call.from_number)}
        subtitle={`${call.direction || "call"} · ${fmtTime(call.created_at)}`}
        actions={
          <>
            <Badge tone={CALL_STATUS_TONE[call.status] || "slate"}>{statusLabel(call.status)}</Badge>
            {recording && (
              <GhostButton as="a" href={recording} target="_blank" rel="noreferrer">
                <Download size={16} /> Recording
              </GhostButton>
            )}
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile icon={Clock} label="Duration" value={fmtDuration(call.duration_seconds)} tone="#7C3AED" bg="#F5F3FF" />
        <StatTile icon={Gauge} label="Avg Latency" value={fmtMs(call.avg_latency_ms || call.latency_ms)} tone="#EA580C" bg="#FFF7ED" />
        <StatTile icon={DollarSign} label="Cost" value={fmtMoney(call.cost || 0)} tone="#CA8A04" bg="#FEFCE8" />
        <StatTile icon={MessageSquare} label="Turns" value={transcript.length} tone="#2563EB" bg="#EFF4FF" />
      </div>

      {/* Recording player */}
      {recording && (
        <Reveal>
          <Card className="flex items-center gap-4 p-4">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white shadow-sm"
            >
              {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <Waveform active={playing} bars={48} color="#2563EB" className="h-9 flex-1" />
            <span className="text-[12.5px] font-semibold text-[#64748B]">{fmtDuration(call.duration_seconds)}</span>
          </Card>
        </Reveal>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main panel */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              {[
                { id: "transcript", label: "Transcript", icon: MessageSquare },
                { id: "timeline", label: "Timeline", icon: ListTree },
                { id: "json", label: "Raw JSON", icon: Code2 },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                    tab === t.id ? "bg-[#EFF4FF] text-[#2563EB]" : "text-[#64748B] hover:bg-[#F8FAFC]"
                  )}
                >
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>

            {tab === "transcript" && (
              transcript.length ? (
                <div className="space-y-3">
                  {transcript.map((turn, i) => <TranscriptBubble key={i} turn={turn} />)}
                </div>
              ) : (
                <EmptyState icon={MessageSquare} title="No transcript" hint="This call has no recorded transcript." />
              )
            )}

            {tab === "timeline" && (
              <div className="relative space-y-4 pl-5">
                <span className="absolute left-1.5 top-1 h-[calc(100%-0.5rem)] w-px bg-[#E7EAF1]" />
                {(call.events || [
                  { label: "Call initiated", at: call.created_at },
                  { label: `Status: ${statusLabel(call.status)}`, at: call.created_at },
                  call.ended_at && { label: "Call ended", at: call.ended_at },
                ]
                  .filter(Boolean))
                  .map((ev, i) => (
                    <div key={i} className="relative">
                      <span className="absolute -left-[1.32rem] top-1 size-2.5 rounded-full bg-[#2563EB] ring-4 ring-[#EFF4FF]" />
                      <p className="text-[13px] font-semibold text-[#0F172A]">{ev.label || ev.type}</p>
                      <p className="text-[11.5px] text-[#94A3B8]">{fmtTime(ev.at || ev.timestamp)}</p>
                    </div>
                  ))}
              </div>
            )}

            {tab === "json" && (
              <pre className="max-h-[480px] overflow-auto rounded-xl bg-[#0B1220] p-4 text-[12px] leading-relaxed text-[#A5B4FC]">
                {JSON.stringify(call, null, 2)}
              </pre>
            )}
          </Card>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          <Card className="p-5">
            <SectionTitle icon={Bot} title="Agent" subtitle="Handled this call" />
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white">
                <Bot size={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-[#0F172A]">{call.agent_name || "Voice Agent"}</p>
                {call.agent_id && (
                  <Link to={`/app/agents/${call.agent_id}`} className="text-[12px] font-semibold text-[#2563EB] hover:underline">
                    Configure agent
                  </Link>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle icon={DollarSign} title="Cost breakdown" tone="#CA8A04" />
            <div className="space-y-2 text-[13px]">
              {[
                ["Speech-to-Text", call.cost_stt],
                ["Language Model", call.cost_llm],
                ["Text-to-Speech", call.cost_tts],
                ["Telephony", call.cost_telephony],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[#64748B]">{label}</span>
                  <span className="font-semibold text-[#0F172A]">{val != null ? fmtMoney(val, { digits: 3 }) : "—"}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-[#EEF2F8] pt-2">
                <span className="font-semibold text-[#0F172A]">Total</span>
                <span className="font-extrabold text-[#0F172A]">{fmtMoney(call.cost || 0, { digits: 3 })}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle icon={Phone} title="Call info" />
            <dl className="space-y-2 text-[13px]">
              <Row label="From" value={fmtPhone(call.from_number)} />
              <Row label="To" value={fmtPhone(call.to_number)} />
              <Row label="Direction" value={call.direction || "—"} />
              <Row label="Started" value={fmtTime(call.created_at)} />
              <Row label="Call ID" value={call.id} mono />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#64748B]">{label}</dt>
      <dd className={cx("truncate font-semibold text-[#0F172A]", mono && "font-mono text-[11px]")}>{value}</dd>
    </div>
  );
}
