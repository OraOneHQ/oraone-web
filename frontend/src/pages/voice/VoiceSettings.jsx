import React, { useEffect, useState } from "react";
import {
  Settings,
  Server,
  Mic,
  Volume2,
  Cpu,
  Globe,
  Database,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader,
  Card,
  Badge,
  SectionTitle,
} from "@/components/dashboard/kit";
import { Reveal, Skeleton } from "@/components/voice/widgets";
import { voiceApi } from "@/lib/voice";

function ProviderRow({ icon: Icon, label, value, ok }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid size-9 place-items-center rounded-xl bg-[#F8FAFC] text-[#475569]">
        <Icon size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-[#0F172A]">{label}</p>
        {value && <p className="truncate text-[12px] text-[#64748B]">{value}</p>}
      </div>
      {ok ? (
        <Badge tone="green"><CheckCircle2 size={11} className="mr-1 inline" /> Connected</Badge>
      ) : (
        <Badge tone="red"><XCircle size={11} className="mr-1 inline" /> Missing</Badge>
      )}
    </div>
  );
}

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-semibold text-[#334155]">{label}</p>
      <div className="flex items-center gap-2 rounded-xl border border-[#E7EAF1] bg-[#FBFCFE] px-3 py-2.5">
        <code className="flex-1 truncate text-[12.5px] text-[#475569]">{value || "Not configured"}</code>
        {value && (
          <button onClick={copy} className="grid size-7 place-items-center rounded-lg text-[#94A3B8] hover:bg-white hover:text-[#2563EB]">
            {copied ? <Check size={14} className="text-[#16A34A]" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function VoiceSettings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    voiceApi.config().then(setConfig).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const c = config || {};
  const p = c.providers || {};

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={Settings}
        title="Settings"
        subtitle="Provider connections, defaults and webhook configuration for voice."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Providers */}
        <Reveal>
          <Card className="p-5">
            <SectionTitle icon={Server} title="Providers" subtitle="Connected voice infrastructure" />
            <div className="divide-y divide-[#F1F5F9]">
              <ProviderRow icon={Server} label="Twilio" value="Telephony" ok={!!p.twilio} />
              <ProviderRow icon={Mic} label="Deepgram" value="Speech-to-Text" ok={!!p.deepgram} />
              <ProviderRow icon={Volume2} label="ElevenLabs" value="Text-to-Speech" ok={!!p.elevenlabs} />
              <ProviderRow icon={Cpu} label="OpenRouter" value="Language Model" ok={p.openrouter !== false} />
            </div>
          </Card>
        </Reveal>

        {/* Defaults */}
        <Reveal delay={0.05}>
          <Card className="p-5">
            <SectionTitle icon={Shield} title="Defaults" subtitle="Active routing configuration" />
            <dl className="space-y-3 text-[13px]">
              <Detail label="Default provider" value={c.default_provider} />
              <Detail label="Speech-to-Text" value={c.default_stt_provider} />
              <Detail label="Text-to-Speech" value={c.default_tts_provider} />
              <Detail
                label="Session store"
                value={c.redis_sessions ? "Redis (durable)" : "In-memory"}
                tone={c.redis_sessions ? "green" : "amber"}
              />
            </dl>
          </Card>
        </Reveal>
      </div>

      {/* Connectivity */}
      <Reveal>
        <Card className="p-5">
          <SectionTitle icon={Globe} title="Connectivity" subtitle="Public endpoints used by Twilio webhooks" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CopyField label="Public base URL" value={c.public_base_url} />
            <CopyField label="Connected number" value={c.phone_number} />
          </div>
          {!c.public_base_url && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
              <Database size={15} className="mt-0.5 text-[#B45309]" />
              <p className="text-[12.5px] text-[#92400E]">
                No public base URL detected. Set one (e.g. via a tunnel) so Twilio can reach your media stream webhooks.
              </p>
            </div>
          )}
        </Card>
      </Reveal>
    </div>
  );
}

function Detail({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#64748B]">{label}</dt>
      <dd>
        {tone ? (
          <Badge tone={tone}>{value || "—"}</Badge>
        ) : (
          <span className="font-semibold capitalize text-[#0F172A]">{value || "—"}</span>
        )}
      </dd>
    </div>
  );
}
