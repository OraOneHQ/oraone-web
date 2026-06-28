import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PhoneCall,
  Plus,
  Copy,
  Check,
  Globe,
  ShieldCheck,
  Bot,
  Zap,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  PrimaryButton,
  EmptyState,
} from "@/components/dashboard/kit";
import { Reveal, Skeleton } from "@/components/voice/widgets";
import { voiceApi, fmtPhone } from "@/lib/voice";

function NumberCard({ number, agent, status = "active" }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(number);
    setCopied(true);
    toast.success("Number copied");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Reveal>
      <Card hover className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white">
              <PhoneCall size={18} />
            </span>
            <div>
              <p className="text-[16px] font-bold tracking-tight text-[#0F172A]">{fmtPhone(number)}</p>
              <p className="flex items-center gap-1 text-[12px] text-[#64748B]">
                <Globe size={12} /> Twilio · Voice enabled
              </p>
            </div>
          </div>
          <Badge tone={status === "active" ? "green" : "slate"}>{status}</Badge>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#EEF2F8] bg-[#FBFCFE] p-3">
          <Bot size={15} className="text-[#7C3AED]" />
          <span className="flex-1 text-[12.5px] text-[#475569]">
            {agent ? <>Routed to <span className="font-semibold text-[#0F172A]">{agent}</span></> : "No agent assigned"}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <GhostButton onClick={copy} className="flex-1 px-3 py-2 text-[13px]">
            {copied ? <Check size={15} className="text-[#16A34A]" /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
          </GhostButton>
          <PrimaryButton as={Link} to="/app/voice/agents" className="flex-1 px-3 py-2 text-[13px]">
            <Zap size={15} /> Assign Agent
          </PrimaryButton>
        </div>
      </Card>
    </Reveal>
  );
}

export default function PhoneNumbers() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voiceApi
      .config()
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  const numbers = config?.phone_number ? [config.phone_number] : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={PhoneCall}
        title="Phone Numbers"
        subtitle="Provision and route numbers to your AI voice agents."
        actions={
          <PrimaryButton as="a" href="https://www.twilio.com/console/phone-numbers/incoming" target="_blank" rel="noreferrer">
            <Plus size={16} /> Buy Number
          </PrimaryButton>
        }
      />

      {/* Provider status */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#ECFDF3] text-[#16A34A]">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="text-[14px] font-bold text-[#0F172A]">Twilio {config?.providers?.twilio ? "connected" : "not connected"}</p>
            <p className="text-[12.5px] text-[#64748B]">
              {config?.providers?.twilio ? "Your account is provisioning numbers and routing calls." : "Connect Twilio in Settings to provision numbers."}
            </p>
          </div>
        </div>
        <GhostButton as="a" href="https://www.twilio.com/console" target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Twilio Console
        </GhostButton>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : numbers.length === 0 ? (
        <EmptyState
          icon={PhoneCall}
          title="No phone numbers yet"
          hint="Buy a number from Twilio and connect it to start receiving and placing AI calls."
          action={
            <PrimaryButton as="a" href="https://www.twilio.com/console/phone-numbers/incoming" target="_blank" rel="noreferrer">
              <Plus size={16} /> Buy your first number
            </PrimaryButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {numbers.map((n) => (
            <NumberCard key={n} number={n} agent={config?.default_agent_name} />
          ))}
        </div>
      )}
    </div>
  );
}
