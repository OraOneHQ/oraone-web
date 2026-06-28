import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Plus,
  FileText,
  Globe,
  Database,
  Bot,
  ArrowRight,
  Search,
  Sparkles,
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
import { Reveal, Skeleton } from "@/components/voice/widgets";
import { voiceApi } from "@/lib/voice";

const SOURCE_META = [
  { icon: FileText, label: "Documents", tone: "#2563EB", bg: "#EFF4FF" },
  { icon: Globe, label: "Websites", tone: "#0891B2", bg: "#ECFEFF" },
  { icon: Database, label: "Structured data", tone: "#7C3AED", bg: "#F5F3FF" },
];

export default function VoiceKnowledge() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voiceApi
      .agents({ limit: 100 })
      .then((d) => setAgents(d?.items || d?.agents || []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={BookOpen}
        title="Knowledge"
        subtitle="Ground your voice agents in accurate, up-to-date company knowledge."
        actions={
          <PrimaryButton as={Link} to="/app/knowledge-base">
            <Plus size={16} /> Add Knowledge
          </PrimaryButton>
        }
      />

      {/* Source types */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SOURCE_META.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.04}>
            <Card hover className="flex items-center gap-3 p-5">
              <span className="grid size-11 place-items-center rounded-2xl" style={{ background: s.bg }}>
                <s.icon size={18} style={{ color: s.tone }} />
              </span>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-[#0F172A]">{s.label}</p>
                <p className="text-[12px] text-[#64748B]">Feed your agents</p>
              </div>
              <Link to="/app/knowledge-base" className="text-[#94A3B8] hover:text-[#2563EB]">
                <ArrowRight size={16} />
              </Link>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* Retrieval banner */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#0B1220] to-[#1E2A57] p-6 text-white">
        <div className="pointer-events-none absolute -right-12 -top-12 size-52 rounded-full bg-[#2563EB]/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Sparkles size={20} className="text-[#A5B4FC]" />
            </span>
            <div>
              <h2 className="text-[17px] font-bold">Semantic retrieval is active</h2>
              <p className="text-[12.5px] text-white/60">Agents pull the most relevant facts mid-call using vector search.</p>
            </div>
          </div>
          <GhostButton as={Link} to="/app/knowledge-search" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
            <Search size={15} /> Test retrieval
          </GhostButton>
        </div>
      </Card>

      {/* Agents & their knowledge */}
      <div>
        <SectionTitle icon={Bot} title="Agents using knowledge" subtitle="Connect knowledge bases to each agent" />
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : agents.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No agents yet"
            hint="Create an agent, then attach knowledge so it can answer accurately."
            action={<PrimaryButton as={Link} to="/app/agents/new"><Plus size={16} /> Create agent</PrimaryButton>}
          />
        ) : (
          <Card className="divide-y divide-[#F1F5F9]">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-[13px] font-bold text-white">
                  {(a.name || "AI").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[#0F172A]">{a.name}</p>
                  <p className="text-[12px] text-[#64748B]">
                    {a.knowledge_base_id || a.knowledge_count ? <Badge tone="green">Knowledge connected</Badge> : "No knowledge attached"}
                  </p>
                </div>
                <GhostButton as={Link} to={`/app/agents/${a.id}`} className="px-3 py-1.5 text-[12.5px]">
                  Manage
                </GhostButton>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
