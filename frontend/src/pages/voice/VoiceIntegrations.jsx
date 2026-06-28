import React, { useEffect, useMemo, useState } from "react";
import {
  Plug,
  Server,
  Mic,
  Volume2,
  Cpu,
  CheckCircle2,
  Plus,
  ExternalLink,
  Calendar,
  MessageSquare,
  Zap,
  Webhook,
  Building2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  PrimaryButton,
  SectionTitle,
} from "@/components/dashboard/kit";
import { Reveal, Skeleton } from "@/components/voice/widgets";
import { voiceApi } from "@/lib/voice";

function IntegrationCard({ icon: Icon, name, desc, connected, tone, bg, href, onConnect }) {
  return (
    <Reveal>
      <Card hover className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between">
          <span className="grid size-11 place-items-center rounded-2xl" style={{ background: bg }}>
            <Icon size={18} style={{ color: tone }} />
          </span>
          {connected ? (
            <Badge tone="green"><CheckCircle2 size={11} className="mr-1 inline" /> Connected</Badge>
          ) : (
            <Badge tone="slate">Not connected</Badge>
          )}
        </div>
        <h3 className="mt-3 text-[14.5px] font-bold text-[#0F172A]">{name}</h3>
        <p className="mt-0.5 flex-1 text-[12.5px] text-[#64748B]">{desc}</p>
        <div className="mt-4">
          {connected ? (
            <GhostButton as="a" href={href} target="_blank" rel="noreferrer" className="w-full px-3 py-2 text-[13px]">
              <ExternalLink size={14} /> Manage
            </GhostButton>
          ) : (
            <PrimaryButton onClick={onConnect} className="w-full px-3 py-2 text-[13px]">
              <Plus size={14} /> Connect
            </PrimaryButton>
          )}
        </div>
      </Card>
    </Reveal>
  );
}

export default function VoiceIntegrations() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voiceApi.config().then(setConfig).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const core = useMemo(() => {
    const pr = config?.providers || {};
    return [
      { icon: Server, name: "Twilio", desc: "Telephony — inbound & outbound calls and numbers.", connected: !!pr.twilio, tone: "#F22F46", bg: "#FEF2F2", href: "https://www.twilio.com/console" },
      { icon: Mic, name: "Deepgram", desc: "Realtime speech-to-text transcription.", connected: !!pr.deepgram, tone: "#13EF93", bg: "#ECFDF3", href: "https://console.deepgram.com" },
      { icon: Volume2, name: "ElevenLabs", desc: "Natural text-to-speech voices.", connected: !!pr.elevenlabs, tone: "#7C3AED", bg: "#F5F3FF", href: "https://elevenlabs.io/app" },
      { icon: Cpu, name: "OpenRouter", desc: "Large language model routing.", connected: pr.openrouter !== false, tone: "#2563EB", bg: "#EFF4FF", href: "https://openrouter.ai/keys" },
    ];
  }, [config]);

  const apps = [
    { icon: Calendar, name: "Google Calendar", desc: "Book and check appointments during calls.", tone: "#2563EB", bg: "#EFF4FF" },
    { icon: Building2, name: "Salesforce", desc: "Sync call outcomes and leads to your CRM.", tone: "#00A1E0", bg: "#EFF6FF" },
    { icon: Users, name: "HubSpot", desc: "Create contacts and log calls automatically.", tone: "#FF7A59", bg: "#FFF3EF" },
    { icon: MessageSquare, name: "Slack", desc: "Get call summaries posted to a channel.", tone: "#4A154B", bg: "#F7EEF7" },
    { icon: Zap, name: "Zapier", desc: "Connect calls to 6,000+ apps.", tone: "#FF4F00", bg: "#FFF1EC" },
    { icon: Webhook, name: "Webhooks", desc: "Send call events to your own endpoints.", tone: "#0891B2", bg: "#ECFEFF" },
  ];

  const connect = (name) => toast.info(`Connect ${name} from the Integrations hub`);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={Plug}
        title="Integrations"
        subtitle="Connect the providers and apps that power and extend your voice agents."
        actions={
          <GhostButton as="a" href="/app/integrations">
            <Plug size={16} /> All integrations
          </GhostButton>
        }
      />

      <div>
        <SectionTitle icon={Server} title="Voice infrastructure" subtitle="Core providers for telephony, speech and intelligence" />
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {core.map((c) => (
              <IntegrationCard key={c.name} {...c} onConnect={() => connect(c.name)} />
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle icon={Zap} title="Apps & automation" subtitle="Extend calls into your business tools" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((a) => (
            <IntegrationCard key={a.name} {...a} connected={false} onConnect={() => connect(a.name)} />
          ))}
        </div>
      </div>
    </div>
  );
}
