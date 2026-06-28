import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bot,
  Phone,
  PhoneOutgoing,
  Settings2,
  MoreVertical,
  Copy,
  Pause,
  Play,
  Trash2,
  Search,
  Mic,
  Gauge,
  Star,
  Plus,
  Sparkles,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  PrimaryButton,
  EmptyState,
  Segmented,
  cx,
} from "@/components/dashboard/kit";
import { CardGridSkeleton, Reveal, LiveDot } from "@/components/voice/widgets";
import PlaceCallModal from "@/components/voice/PlaceCallModal";
import { voiceApi, fmtMs, fmtMoney } from "@/lib/voice";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
];

function gradientFor(seed = "") {
  const palettes = [
    ["#2563EB", "#4F46E5"],
    ["#0891B2", "#2563EB"],
    ["#7C3AED", "#DB2777"],
    ["#16A34A", "#0891B2"],
    ["#EA580C", "#DB2777"],
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % palettes.length;
  return palettes[h];
}

function AgentCard({ agent, onTestCall, onAction }) {
  const [menu, setMenu] = useState(false);
  const [g1, g2] = gradientFor(agent.id || agent.name || "");
  const initials = (agent.name || "AI").slice(0, 2).toUpperCase();
  const active = agent.status !== "paused" && agent.status !== "disabled";
  const voiceEnabled = agent.voice_enabled ?? agent.has_voice ?? true;

  const stats = [
    { icon: Phone, label: "Calls", value: agent.calls_count ?? agent.total_calls ?? 0 },
    { icon: Gauge, label: "Latency", value: fmtMs(agent.avg_latency_ms) },
    { icon: Star, label: "Rating", value: agent.rating ? `${agent.rating}/5` : "—" },
  ];

  return (
    <Reveal>
      <Card hover className="group relative flex h-full flex-col p-5">
        <div className="flex items-start gap-3">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-2xl text-[15px] font-bold text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-bold text-[#0F172A]">{agent.name || "Untitled agent"}</h3>
              <Badge tone={active ? "green" : "slate"}>
                {active ? <span className="inline-flex items-center gap-1"><LiveDot tone="green" pulse={false} /> Active</span> : "Paused"}
              </Badge>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[12.5px] text-[#64748B]">
              {agent.description || agent.persona || "AI voice agent ready to handle calls."}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenu((m) => !m)}
              onBlur={() => setTimeout(() => setMenu(false), 150)}
              className="grid size-8 place-items-center rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569]"
            >
              <MoreVertical size={16} />
            </button>
            {menu && (
              <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-[#E7EAF1] bg-white py-1 shadow-xl">
                <MenuItem icon={Copy} onClick={() => onAction("clone", agent)}>Clone</MenuItem>
                <MenuItem icon={active ? Pause : Play} onClick={() => onAction(active ? "pause" : "resume", agent)}>
                  {active ? "Pause" : "Resume"}
                </MenuItem>
                <MenuItem icon={Trash2} danger onClick={() => onAction("delete", agent)}>Delete</MenuItem>
              </div>
            )}
          </div>
        </div>

        {/* Meta chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-2.5 py-1 text-[11.5px] font-medium text-[#475569]">
            <Mic size={12} className="text-[#7C3AED]" /> {agent.voice_name || agent.voice || "Default voice"}
          </span>
          {agent.phone_number && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-2.5 py-1 text-[11.5px] font-medium text-[#475569]">
              <Phone size={12} className="text-[#2563EB]" /> {agent.phone_number}
            </span>
          )}
          {!voiceEnabled && <Badge tone="amber">Voice not configured</Badge>}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-[#EEF2F8] bg-[#FBFCFE] p-2.5">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-[14px] font-bold text-[#0F172A]">{s.value}</p>
              <p className="text-[10.5px] text-[#94A3B8]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 pt-1">
          <GhostButton as={Link} to={`/app/agents/${agent.id}`} className="flex-1 px-3 py-2 text-[13px]">
            <Settings2 size={15} /> Configure
          </GhostButton>
          <PrimaryButton onClick={() => onTestCall(agent)} className="flex-1 px-3 py-2 text-[13px]">
            <PhoneOutgoing size={15} /> Test Call
          </PrimaryButton>
        </div>
      </Card>
    </Reveal>
  );
}

function MenuItem({ icon: Icon, children, onClick, danger }) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition-colors",
        danger ? "text-[#EF4444] hover:bg-[#FEF2F2]" : "text-[#475569] hover:bg-[#F8FAFC]"
      )}
    >
      <Icon size={14} /> {children}
    </button>
  );
}

export default function VoiceAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [callAgent, setCallAgent] = useState(null);
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await voiceApi.agents({ limit: 100 });
      setAgents(d?.items || d?.agents || []);
    } catch {
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Sidebar / TopBar "create" intent → guide to the agent builder.
  useEffect(() => {
    if (params.get("create") === "1" || params.get("create") === "true") {
      params.delete("create");
      setParams(params, { replace: true });
      toast.info("Opening the agent builder…");
      window.location.assign("/app/agents/new");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAction = (kind, agent) => {
    if (kind === "clone") toast.success(`Cloning "${agent.name}"…`);
    else if (kind === "pause") toast(`Paused "${agent.name}"`);
    else if (kind === "resume") toast.success(`Resumed "${agent.name}"`);
    else if (kind === "delete") toast.error(`Use Configure to delete "${agent.name}" safely.`);
  };

  const filtered = useMemo(() => {
    let list = agents;
    if (filter === "active") list = list.filter((a) => a.status !== "paused" && a.status !== "disabled");
    if (filter === "paused") list = list.filter((a) => a.status === "paused" || a.status === "disabled");
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((a) => (a.name || "").toLowerCase().includes(s) || (a.description || "").toLowerCase().includes(s));
    }
    return list;
  }, [agents, filter, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={Bot}
        title="Voice Agents"
        subtitle="Build, configure and deploy AI agents that handle real phone calls."
        actions={
          <PrimaryButton as={Link} to="/app/agents/new">
            <Plus size={16} /> Create Agent
          </PrimaryButton>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={filter} onChange={setFilter} options={FILTERS} />
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search agents…"
            className="w-64 rounded-xl border border-[#E7EAF1] bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
          />
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={agents.length ? "No agents match your filters" : "No voice agents yet"}
          hint={agents.length ? "Try a different search or filter." : "Create your first AI voice agent to start handling calls automatically."}
          action={
            !agents.length && (
              <PrimaryButton as={Link} to="/app/agents/new">
                <Rocket size={16} /> Create your first agent
              </PrimaryButton>
            )
          }
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <AgentCard key={a.id} agent={a} onTestCall={setCallAgent} onAction={onAction} />
          ))}
        </motion.div>
      )}

      <PlaceCallModal
        open={!!callAgent}
        defaultAgentId={callAgent?.id}
        onClose={() => setCallAgent(null)}
        onPlaced={() => setCallAgent(null)}
      />
    </div>
  );
}
