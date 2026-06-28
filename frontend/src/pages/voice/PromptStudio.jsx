import React, { useEffect, useState } from "react";
import {
  Wand2,
  Loader2,
  Sparkles,
  Copy,
  Check,
  MessageSquare,
  ListChecks,
  Mic2,
  BookOpen,
  HelpCircle,
  Bot,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  PrimaryButton,
  SectionTitle,
} from "@/components/dashboard/kit";
import { formatApiError } from "@/lib/api";
import { voiceApi } from "@/lib/voice";
import { toast } from "sonner";

const inputCls =
  "mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-[#334155]">{label}</span>
      {children}
    </label>
  );
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text || "");
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-[#64748B] hover:bg-[#F1F5F9]"
    >
      {done ? <Check size={12} className="text-[#16A34A]" /> : <Copy size={12} />} {done ? "Copied" : "Copy"}
    </button>
  );
}

function ListBlock({ icon: Icon, title, items, tone }) {
  if (!items?.length) return null;
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Icon size={15} style={{ color: tone }} />
        <h4 className="text-[13px] font-bold text-[#0F172A]">{title}</h4>
      </div>
      <ol className="mt-2 space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2 text-[12.5px] text-[#475569]">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#F1F5F9] text-[10px] font-bold text-[#64748B]">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function PromptStudio() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({
    business_type: "general",
    business_name: "",
    description: "",
    tone: "",
    goals: "",
    language: "en",
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const d = await voiceApi.promptTemplates();
        setTemplates(d?.items || []);
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const r = await voiceApi.generateBlueprint(form);
      setResult(r);
      toast.success(r.generated ? "Blueprint generated" : "Blueprint ready (offline template)");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Prompt Studio"
        icon={Wand2}
        title="Prompt Studio"
        subtitle="Describe your business — the AI writes the full agent blueprint: prompt, greeting, flow, voice style and knowledge structure."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="space-y-3 p-5">
          <SectionTitle icon={Bot} title="Your business" subtitle="A few details is all it needs" />
          <Field label="Industry">
            <select className={inputCls} value={form.business_type} onChange={(e) => set("business_type", e.target.value)}>
              {templates.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Business name">
            <input className={inputCls} value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Acme Realty" />
          </Field>
          <Field label="What should the agent do?">
            <textarea className={`${inputCls} min-h-[70px] resize-y`} value={form.goals} onChange={(e) => set("goals", e.target.value)} placeholder="Qualify buyers and book property viewings" />
          </Field>
          <Field label="Description (optional)">
            <textarea className={`${inputCls} min-h-[70px] resize-y`} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="We sell residential property across the metro area…" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tone">
              <input className={inputCls} value={form.tone} onChange={(e) => set("tone", e.target.value)} placeholder="warm, professional" />
            </Field>
            <Field label="Language">
              <input className={inputCls} value={form.language} onChange={(e) => set("language", e.target.value)} placeholder="en" />
            </Field>
          </div>
          <PrimaryButton onClick={generate} disabled={busy} className="w-full justify-center px-4 py-2.5 text-[13.5px]">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Generate blueprint
          </PrimaryButton>
        </Card>

        <div className="space-y-3">
          {!result ? (
            <Card className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-[#EEF2FF]">
                <Wand2 size={26} className="text-[#4F46E5]" />
              </div>
              <h3 className="mt-3 text-[15px] font-bold text-[#0F172A]">No manual prompts needed</h3>
              <p className="mt-1 max-w-sm text-[13px] text-[#64748B]">
                Fill in your business on the left and the studio designs a complete, production-ready voice agent.
              </p>
            </Card>
          ) : (
            <>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-[#4F46E5]" />
                    <h4 className="text-[13px] font-bold text-[#0F172A]">System prompt</h4>
                    <Badge tone={result.generated ? "indigo" : "slate"}>{result.generated ? "AI-generated" : "template"}</Badge>
                  </div>
                  <CopyBtn text={result.system_prompt} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#334155]">{result.system_prompt}</p>
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-[#2563EB]" />
                    <h4 className="text-[13px] font-bold text-[#0F172A]">Greeting</h4>
                  </div>
                  <CopyBtn text={result.greeting} />
                </div>
                <p className="mt-2 text-[13px] font-medium text-[#0F172A]">“{result.greeting}”</p>
              </Card>

              {result.voice_style && (
                <Card className="flex items-center gap-2 p-4">
                  <Mic2 size={15} className="text-[#7C3AED]" />
                  <h4 className="text-[13px] font-bold text-[#0F172A]">Voice style:</h4>
                  <span className="text-[12.5px] text-[#475569]">{result.voice_style}</span>
                </Card>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ListBlock icon={ListChecks} title="Conversation flow" items={result.conversation_flow} tone="#16A34A" />
                <ListBlock icon={BookOpen} title="Knowledge structure" items={result.knowledge_structure} tone="#EA580C" />
              </div>
              <ListBlock icon={HelpCircle} title="Suggested questions" items={result.suggested_questions} tone="#0EA5E9" />

              <div className="flex justify-end">
                <GhostButton as="a" href="/app/voice/agents" className="px-4 py-2 text-[13px]">
                  <Bot size={15} /> Apply to an agent
                </GhostButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
