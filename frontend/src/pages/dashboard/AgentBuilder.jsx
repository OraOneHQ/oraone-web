import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, PlayCircle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { AGENT_BUILDER } from "@/constants/testIds";

const TABS = [
  { key: "basic", label: "Basic Info" },
  { key: "config", label: "Configuration" },
  { key: "knowledge", label: "Knowledge" },
  { key: "integrations", label: "Integrations" },
  { key: "review", label: "Review & Deploy" },
];

const VOICES = ["Aria (Female)", "Daniel (Male)", "Nora (Female)", "Adam (Male)", "Bella (Female)"];
const LANGS = ["English (US)", "English (India)", "Hindi", "Spanish", "French", "German", "Arabic"];
const POSITIONS = ["Bottom Right", "Bottom Left", "Top Right", "Top Left"];

export default function AgentBuilder() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState("basic");
  const [agent, setAgent] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/agents/${id}`).then((r) => setAgent(r.data)).catch(() => {
      toast.error("Agent not found");
      nav("/app/agents");
    });
  }, [id, nav]);

  if (!agent) return <div className="h-64 rounded-2xl skeleton" />;

  const set = (key, value) => setAgent({ ...agent, [key]: value });

  const save = async () => {
    setBusy(true);
    try {
      // Phase 6: PUT accepts a partial update. Only send fields the
      // backend schema knows about — anything else (UI-only legacy
      // fields) is dropped on the client.
      const ALLOWED = [
        "name", "description", "type", "status", "model", "avatar_url",
        "system_prompt", "temperature", "voice", "language", "greeting", "max_tokens",
      ];
      const payload = Object.fromEntries(
        ALLOWED.filter((k) => agent[k] !== undefined && agent[k] !== null).map((k) => [k, agent[k]])
      );
      const { data } = await api.put(`/agents/${id}`, payload);
      setAgent({ ...agent, ...data });
      toast.success("Saved!");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${agent.name}"?`)) return;
    try {
      await api.delete(`/agents/${id}`);
      toast.success("Agent deleted");
      nav("/app/agents");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  return (
    <div>
      <button onClick={() => nav("/app/agents")} className="text-sm text-[#64748B] hover:text-[#0F172A] inline-flex items-center gap-1.5 mb-4">
        <ArrowLeft size={14} /> Back to Agents
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">{agent.name}</h2>
          <p className="text-sm text-[#64748B] mt-0.5 capitalize">{agent.type} Agent · {agent.status}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={remove} className="px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-red-50 hover:border-red-200 text-red-600 text-sm font-medium inline-flex items-center gap-1.5">
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={save} disabled={busy} data-testid={AGENT_BUILDER.saveBtn} className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
            <Save size={14} /> {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Side tabs */}
        <aside className="lg:col-span-3">
          <div className="p-3 rounded-2xl bg-white border border-[#E2E8F0]">
            <nav className="space-y-1">
              {TABS.map((t, idx) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
                    tab === t.key ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
                  data-testid={`builder-tab-${t.key}`}
                >
                  <span className={`size-6 rounded-full grid place-items-center text-xs font-semibold ${tab === t.key ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>{idx + 1}</span>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Form panel */}
        <div className="lg:col-span-9">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E2E8F0]">
            {tab === "basic" && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-[#0F172A]">Basic Information</h3>
                <Field label="Agent Name"><input className="input" value={agent.name || ""} onChange={(e) => set("name", e.target.value)} data-testid={AGENT_BUILDER.nameInput} /></Field>
                <Field label="Business Name"><input className="input" value={agent.business_name || ""} onChange={(e) => set("business_name", e.target.value)} placeholder="Bright Dental Clinic" /></Field>
                <Field label="Purpose"><textarea rows={4} className="input" value={agent.instructions || ""} onChange={(e) => set("instructions", e.target.value)} placeholder="Handle incoming calls, book appointments and answer FAQs." /></Field>
              </div>
            )}
            {tab === "config" && agent.type === "voice" && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-[#0F172A]">Voice Configuration</h3>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Business Phone Number"><input className="input" value={agent.phone_number || ""} onChange={(e) => set("phone_number", e.target.value)} placeholder="+91 98765 43210" /></Field>
                  <Field label="Language">
                    <select className="input" value={agent.language || "English (US)"} onChange={(e) => set("language", e.target.value)}>
                      {LANGS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </Field>
                  <Field label="AI Voice">
                    <select className="input" value={agent.voice || "Aria (Female)"} onChange={(e) => set("voice", e.target.value)}>
                      {VOICES.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </Field>
                  <Field label="Business Hours">
                    <select className="input" value={agent.business_hours || "24/7"} onChange={(e) => set("business_hours", e.target.value)}>
                      <option>24/7</option>
                      <option>9 AM - 6 PM (Mon-Fri)</option>
                      <option>10 AM - 7 PM (Mon-Sat)</option>
                    </select>
                  </Field>
                </div>
                <Field label="Greeting"><textarea rows={3} className="input" value={agent.greeting || ""} onChange={(e) => set("greeting", e.target.value)} placeholder="Hello, thank you for calling..." /></Field>
                <button data-testid={AGENT_BUILDER.testVoiceBtn} onClick={() => toast.info("Voice preview coming soon!")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm">
                  <PlayCircle size={14} /> Test Voice
                </button>
              </div>
            )}
            {tab === "config" && agent.type === "chat" && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-[#0F172A]">Chat Configuration</h3>
                <Field label="Website URL"><input className="input" value={agent.website_url || ""} onChange={(e) => set("website_url", e.target.value)} placeholder="https://yourwebsite.com" /></Field>
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Widget Position">
                    <select className="input" value={agent.widget_position || "Bottom Right"} onChange={(e) => set("widget_position", e.target.value)}>
                      {POSITIONS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Theme Color"><input type="color" className="h-12 w-full rounded-xl border border-[#E2E8F0]" value={agent.theme_color || "#2563EB"} onChange={(e) => set("theme_color", e.target.value)} /></Field>
                </div>
                <Field label="Welcome Message"><textarea rows={3} className="input" value={agent.greeting || ""} onChange={(e) => set("greeting", e.target.value)} placeholder="Hi! How can I help you today?" /></Field>
              </div>
            )}
            {tab === "config" && agent.type === "whatsapp" && (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-[#0F172A]">WhatsApp Configuration</h3>
                <Field label="WhatsApp Number"><input className="input" value={agent.whatsapp_number || ""} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="+91 98765 43210" /></Field>
                <Field label="Welcome Message"><textarea rows={3} className="input" value={agent.greeting || ""} onChange={(e) => set("greeting", e.target.value)} placeholder="Hello! How can I assist you today?" /></Field>
                <Field label="Business Hours">
                  <select className="input" value={agent.business_hours || "24/7"} onChange={(e) => set("business_hours", e.target.value)}>
                    <option>24/7</option>
                    <option>9 AM - 6 PM (Mon-Fri)</option>
                  </select>
                </Field>
              </div>
            )}
            {tab === "knowledge" && (
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">Knowledge Source</h3>
                <p className="text-sm text-[#64748B] mt-1">Upload documents or add URLs to train your agent.</p>
                <div className="mt-6 p-10 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-center">
                  <p className="text-sm text-[#475569]">Drag & drop PDF, DOCX or TXT files here</p>
                  <button onClick={() => nav("/app/knowledge-base")} className="mt-4 inline-flex items-center px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm">Manage Knowledge Base</button>
                </div>
              </div>
            )}
            {tab === "integrations" && (
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">Integrations</h3>
                <p className="text-sm text-[#64748B] mt-1">Connect tools your agent will use.</p>
                <button onClick={() => nav("/app/integrations")} className="mt-5 px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-sm font-medium text-[#0F172A]">Browse Integrations →</button>
              </div>
            )}
            {tab === "review" && (
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">Review & Deploy</h3>
                <p className="text-sm text-[#64748B] mt-1">Make sure everything looks good before going live.</p>
                <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
                  <Row label="Name" value={agent.name} />
                  <Row label="Type" value={agent.type} />
                  <Row label="Status" value={agent.status} />
                  <Row label="Business" value={agent.business_name} />
                  {agent.type === "voice" && <><Row label="Voice" value={agent.voice} /><Row label="Language" value={agent.language} /></>}
                  {agent.type === "chat" && <><Row label="Website" value={agent.website_url} /><Row label="Position" value={agent.widget_position} /></>}
                  {agent.type === "whatsapp" && <Row label="WhatsApp" value={agent.whatsapp_number} />}
                </div>
                <button onClick={save} className="mt-6 px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold" data-testid="agent-deploy-btn">Deploy Agent</button>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <style>{`
        .input { width: 100%; border-radius: 0.75rem; border: 1px solid #E2E8F0; background: white; padding: 0.75rem 1rem; font-size: 0.875rem; color: #0F172A; }
        .input:focus { outline: none; border-color: #2563EB; box-shadow: 0 0 0 4px rgba(37,99,235,0.1); }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#0F172A] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
      <p className="text-xs text-[#64748B]">{label}</p>
      <p className="text-sm font-medium text-[#0F172A] mt-0.5">{value || "—"}</p>
    </div>
  );
}
