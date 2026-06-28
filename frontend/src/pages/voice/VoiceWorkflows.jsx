import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Workflow,
  Plus,
  Phone,
  Brain,
  GitBranch,
  PhoneForwarded,
  CalendarCheck,
  Webhook,
  ArrowRight,
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
import { Reveal } from "@/components/voice/widgets";

const TEMPLATES = [
  { icon: CalendarCheck, title: "Appointment Booking", desc: "Qualify, check availability and book — then confirm by SMS.", tone: "#2563EB", bg: "#EFF4FF", steps: ["Greet", "Collect details", "Book slot", "Confirm"] },
  { icon: PhoneForwarded, title: "Smart Call Routing", desc: "Detect intent and transfer to the right human or department.", tone: "#7C3AED", bg: "#F5F3FF", steps: ["Detect intent", "Branch", "Warm transfer"] },
  { icon: Brain, title: "Lead Qualification", desc: "Ask qualifying questions and score leads in real time.", tone: "#16A34A", bg: "#ECFDF3", steps: ["Qualify", "Score", "Route", "CRM sync"] },
  { icon: Webhook, title: "Order Status", desc: "Look up an order via webhook and read the status back.", tone: "#EA580C", bg: "#FFF7ED", steps: ["Authenticate", "Lookup", "Respond"] },
];

function FlowPreview({ steps, tone }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <span className="rounded-lg bg-[#F8FAFC] px-2 py-1 text-[11px] font-medium text-[#475569]">{s}</span>
          {i < steps.length - 1 && <ArrowRight size={12} style={{ color: tone }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function VoiceWorkflows() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={Workflow}
        title="Workflows"
        subtitle="Design multi-step call flows with branching, transfers and tool calls."
        actions={
          <PrimaryButton as={Link} to="/app/workflows">
            <Plus size={16} /> New Workflow
          </PrimaryButton>
        }
      />

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-[#111C36] to-[#1E2A57] p-6 text-white">
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-[#7C3AED]/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <GitBranch size={20} />
            </span>
            <div>
              <h2 className="text-[17px] font-bold">Visual workflow builder</h2>
              <p className="text-[12.5px] text-white/60">Drag, connect and deploy logic your agents follow on every call.</p>
            </div>
          </div>
          <PrimaryButton as={Link} to="/app/workflows" className="bg-white text-[#1E2A57] shadow-none hover:opacity-90">
            <Sparkles size={16} /> Open Builder
          </PrimaryButton>
        </div>
      </Card>

      <div>
        <SectionTitle icon={Sparkles} title="Start from a template" subtitle="Battle-tested flows you can customize" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TEMPLATES.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.04}>
              <Card hover className="p-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl" style={{ background: t.bg }}>
                    <t.icon size={18} style={{ color: t.tone }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14.5px] font-bold text-[#0F172A]">{t.title}</h3>
                    <p className="mt-0.5 text-[12.5px] text-[#64748B]">{t.desc}</p>
                  </div>
                  <Badge tone="slate">Template</Badge>
                </div>
                <FlowPreview steps={t.steps} tone={t.tone} />
                <GhostButton as={Link} to="/app/workflows" className="mt-4 w-full px-3 py-2 text-[13px]">
                  Use template <ArrowRight size={14} />
                </GhostButton>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle icon={Workflow} title="Your workflows" subtitle="Custom flows in this project" />
        <EmptyState
          icon={Phone}
          title="No custom workflows yet"
          hint="Start from a template above or build one from scratch in the workflow builder."
          action={
            <PrimaryButton as={Link} to="/app/workflows">
              <Plus size={16} /> Create workflow
            </PrimaryButton>
          }
        />
      </div>
    </div>
  );
}
