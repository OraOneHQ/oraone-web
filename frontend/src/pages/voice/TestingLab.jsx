import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical,
  Bot,
  Sparkles,
  Send,
  Volume2,
  PhoneOutgoing,
  Loader2,
  MessageSquareText,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader,
  Card,
  SectionTitle,
  PrimaryButton,
  Badge,
  cx,
} from "@/components/dashboard/kit";
import { Waveform, Reveal } from "@/components/voice/widgets";
import PlaceCallModal from "@/components/voice/PlaceCallModal";
import { voiceApi } from "@/lib/voice";

const inputCls =
  "w-full rounded-xl border border-[#E7EAF1] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

export default function TestingLab() {
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [greeting, setGreeting] = useState("");
  const [loadingGreeting, setLoadingGreeting] = useState(false);
  const [intent, setIntent] = useState("");
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [showCall, setShowCall] = useState(false);

  useEffect(() => {
    voiceApi.agents({ limit: 100 }).then((d) => {
      const items = d?.items || d?.agents || [];
      setAgents(items);
      setAgentId((id) => id || items[0]?.id || "");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!agentId) return;
    setLoadingGreeting(true);
    setGreeting("");
    voiceApi
      .greetingPreview(agentId)
      .then((d) => setGreeting(d?.greeting || d?.text || d?.preview || ""))
      .catch(() => setGreeting(""))
      .finally(() => setLoadingGreeting(false));
  }, [agentId]);

  const runIntent = async () => {
    if (!agentId || !intent.trim()) return;
    setTesting(true);
    setResult(null);
    try {
      const d = await voiceApi.testIntent(agentId, intent.trim());
      setResult(d);
    } catch (e) {
      toast.error("Could not run intent test");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={FlaskConical}
        title="Testing Lab"
        subtitle="Preview greetings, probe intent detection and run live test calls before you ship."
        actions={
          <PrimaryButton onClick={() => setShowCall(true)} disabled={!agentId}>
            <PhoneOutgoing size={16} /> Live Test Call
          </PrimaryButton>
        }
      />

      {/* Agent selector */}
      <Card className="p-5">
        <label className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#334155]">
          <Bot size={14} className="text-[#94A3B8]" /> Agent under test
        </label>
        <select className={cx(inputCls, "max-w-md")} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
          {!agents.length && <option value="">No agents available</option>}
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Greeting preview */}
        <Reveal>
          <Card className="flex h-full flex-col p-5">
            <SectionTitle icon={Volume2} title="Greeting Preview" subtitle="What callers hear first" tone="#7C3AED" />
            <div className="flex-1 rounded-2xl border border-[#EEF2F8] bg-gradient-to-br from-[#FBFCFE] to-[#F5F3FF] p-5">
              {loadingGreeting ? (
                <div className="flex items-center gap-2 text-[13px] text-[#64748B]">
                  <Loader2 size={15} className="animate-spin" /> Generating greeting…
                </div>
              ) : greeting ? (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[15px] leading-relaxed text-[#0F172A]">
                  "{greeting}"
                </motion.p>
              ) : (
                <p className="text-[13px] text-[#94A3B8]">No greeting configured for this agent yet.</p>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2563EB] text-white">
                <Volume2 size={16} />
              </button>
              <Waveform active={!!greeting} color="#7C3AED" bars={32} className="h-7 flex-1" />
            </div>
          </Card>
        </Reveal>

        {/* Intent tester */}
        <Reveal delay={0.05}>
          <Card className="flex h-full flex-col p-5">
            <SectionTitle icon={Wand2} title="Intent Tester" subtitle="See how the agent interprets a phrase" tone="#2563EB" />
            <div className="flex gap-2">
              <input
                className={inputCls}
                placeholder="e.g. I'd like to book an appointment for tomorrow"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runIntent()}
              />
              <PrimaryButton onClick={runIntent} disabled={testing || !intent.trim()} className="shrink-0">
                {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </PrimaryButton>
            </div>

            <div className="mt-4 flex-1">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div
                    key="res"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="indigo">
                        <Sparkles size={11} className="mr-1 inline" />
                        {result.intent || result.detected_intent || "intent"}
                      </Badge>
                      {result.confidence != null && (
                        <Badge tone="green">{Math.round((result.confidence || 0) * 100)}% confidence</Badge>
                      )}
                    </div>
                    {(result.reply || result.response) && (
                      <div className="flex gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#4F46E5] text-white">
                          <Bot size={13} />
                        </span>
                        <p className="rounded-2xl rounded-tl-sm bg-[#EFF4FF] px-3 py-2 text-[13px] text-[#0F172A]">
                          {result.reply || result.response}
                        </p>
                      </div>
                    )}
                    <pre className="max-h-40 overflow-auto rounded-xl bg-[#0B1220] p-3 text-[11px] leading-relaxed text-[#A5B4FC]">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </motion.div>
                ) : (
                  <motion.div key="empty" className="grid h-full place-items-center rounded-2xl border border-dashed border-[#E7EAF1] bg-[#FBFCFE] p-6 text-center">
                    <div>
                      <MessageSquareText size={22} className="mx-auto text-[#CBD5E1]" />
                      <p className="mt-2 text-[13px] text-[#64748B]">Type a phrase and run it to see detected intent.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </Reveal>
      </div>

      <PlaceCallModal open={showCall} defaultAgentId={agentId} onClose={() => setShowCall(false)} onPlaced={() => setShowCall(false)} />
    </div>
  );
}
