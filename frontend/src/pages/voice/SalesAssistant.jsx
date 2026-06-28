import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Plus,
  Trash2,
  Loader2,
  Save,
  Target,
  Sparkles,
  Tag,
  FileText,
  Package,
  Wand2,
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
import { formatApiError } from "@/lib/api";
import { voiceApi } from "@/lib/voice";
import { toast } from "sonner";

const inputCls =
  "mt-1 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-[13.5px] text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";

const STRATEGIES = [
  { value: "bant", label: "BANT", desc: "Budget · Authority · Need · Timeline" },
  { value: "champ", label: "CHAMP", desc: "Challenges · Authority · Money · Prioritization" },
  { value: "meddic", label: "MEDDIC", desc: "Enterprise-grade qualification" },
  { value: "spin", label: "SPIN", desc: "Situation · Problem · Implication · Need-payoff" },
];

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-[12.5px] font-semibold text-[#334155]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label, desc }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#E7EAF1] px-4 py-3 text-left hover:border-[#CBD5E1]"
    >
      <div>
        <p className="text-[13px] font-semibold text-[#0F172A]">{label}</p>
        {desc && <p className="text-[11.5px] text-[#94A3B8]">{desc}</p>}
      </div>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-[#2563EB]" : "bg-[#CBD5E1]"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

/* ── Test bench ──────────────────────────────────────────────────────────── */
function TestBench({ agentId, products }) {
  const [qText, setQText] = useState("We have a budget of $20k and need to decide this quarter.");
  const [qOut, setQOut] = useState(null);
  const [need, setNeed] = useState("");
  const [recs, setRecs] = useState(null);
  const [quoteName, setQuoteName] = useState("");
  const [qty, setQty] = useState(1);
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState("");

  const run = async (kind, fn, set) => {
    setBusy(kind);
    try {
      set(await fn());
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="p-4">
        <div className="flex items-center gap-2 text-[#2563EB]">
          <Target size={16} />
          <h3 className="text-[13.5px] font-bold text-[#0F172A]">Qualify lead</h3>
        </div>
        <p className="mt-1 text-[11.5px] text-[#94A3B8]">Score a conversation against your strategy.</p>
        <textarea className={`${inputCls} mt-2 min-h-[80px] resize-y`} value={qText} onChange={(e) => setQText(e.target.value)} />
        <GhostButton
          onClick={() => run("q", () => voiceApi.salesQualify(agentId, { text: qText }), setQOut)}
          disabled={busy === "q"}
          className="mt-2 w-full justify-center px-3 py-2 text-[12.5px]"
        >
          {busy === "q" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Score
        </GhostButton>
        {qOut && (
          <div className="mt-3 rounded-xl bg-[#F8FAFC] p-3 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#0F172A]">Score</span>
              <Badge tone={(qOut.score ?? 0) >= 60 ? "green" : (qOut.score ?? 0) >= 30 ? "amber" : "slate"}>
                {Math.round(qOut.score ?? 0)}
              </Badge>
            </div>
            {qOut.next_question && <p className="mt-2 text-[#475569]">Next: {qOut.next_question}</p>}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-[#7C3AED]">
          <Package size={16} />
          <h3 className="text-[13.5px] font-bold text-[#0F172A]">Recommend</h3>
        </div>
        <p className="mt-1 text-[11.5px] text-[#94A3B8]">Match catalogue to a stated need (upsell/cross-sell).</p>
        <input className={`${inputCls} mt-2`} value={need} onChange={(e) => setNeed(e.target.value)} placeholder="I need something for a small team…" />
        <GhostButton
          onClick={() => run("r", () => voiceApi.salesRecommend(agentId, { need, top_k: 3 }), setRecs)}
          disabled={busy === "r" || !products.length}
          className="mt-2 w-full justify-center px-3 py-2 text-[12.5px]"
        >
          {busy === "r" ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Recommend
        </GhostButton>
        {!products.length && <p className="mt-2 text-[11px] text-[#94A3B8]">Add products below to enable.</p>}
        {recs?.recommendations?.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {recs.recommendations.map((m, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-[#F8FAFC] px-3 py-1.5 text-[12px]">
                <span className="font-medium text-[#0F172A]">{m.name || m.product?.name || "Product"}</span>
                {m.score != null && <Badge tone="indigo">{Math.round(m.score * 100) / 100}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 text-[#16A34A]">
          <FileText size={16} />
          <h3 className="text-[13.5px] font-bold text-[#0F172A]">Quote</h3>
        </div>
        <p className="mt-1 text-[11.5px] text-[#94A3B8]">Generate a priced quote to close the deal.</p>
        <select className={`${inputCls} mt-2`} value={quoteName} onChange={(e) => setQuoteName(e.target.value)}>
          <option value="">Select product…</option>
          {products.map((p, i) => (
            <option key={i} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <input type="number" min={1} className={`${inputCls} mt-2`} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Quantity" />
        <GhostButton
          onClick={() => run("quote", () => voiceApi.salesQuote(agentId, { product_name: quoteName, quantity: Number(qty) || 1 }), setQuote)}
          disabled={busy === "quote" || !quoteName}
          className="mt-2 w-full justify-center px-3 py-2 text-[12.5px]"
        >
          {busy === "quote" ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />} Build quote
        </GhostButton>
        {quote && (
          <div className="mt-3 rounded-xl bg-[#F8FAFC] p-3 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#0F172A]">Total</span>
              <span className="font-bold text-[#16A34A]">
                {quote.currency || "$"}
                {quote.total ?? quote.amount ?? "—"}
              </span>
            </div>
            {quote.unit_price != null && <p className="mt-1 text-[#475569]">Unit: {quote.unit_price}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function SalesAssistant() {
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState("");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await voiceApi.agents({ limit: 100 });
        const list = d?.items || d?.agents || [];
        setAgents(list);
        setAgentId(list[0]?.id || "");
      } catch (e) {
        toast.error(formatApiError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!agentId) return;
    try {
      const p = await voiceApi.salesProfile(agentId);
      setProfile(p);
    } catch (e) {
      // 404 → not configured yet; start from defaults.
      setProfile({
        enabled: true,
        qualification_strategy: "bant",
        allow_quote_generation: true,
        follow_up_enabled: true,
        default_pipeline: "",
        products: [],
        pricing_rules: {},
        configuration: {},
        _new: true,
      });
    }
  }, [agentId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const set = (patch) => setProfile((p) => ({ ...p, ...patch }));

  const addProduct = () =>
    set({ products: [...(profile.products || []), { name: "", price: 0, description: "" }] });
  const updateProduct = (i, patch) => {
    const next = [...(profile.products || [])];
    next[i] = { ...next[i], ...patch };
    set({ products: next });
  };
  const removeProduct = (i) => set({ products: (profile.products || []).filter((_, x) => x !== i) });

  const save = async () => {
    setSaving(true);
    try {
      const saved = await voiceApi.saveSalesProfile(agentId, {
        enabled: profile.enabled,
        qualification_strategy: profile.qualification_strategy,
        default_pipeline: profile.default_pipeline || null,
        allow_quote_generation: profile.allow_quote_generation,
        follow_up_enabled: profile.follow_up_enabled,
        products: profile.products || [],
        pricing_rules: profile.pricing_rules || {},
      });
      setProfile(saved);
      toast.success("Sales assistant saved");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const products = useMemo(() => profile?.products || [], [profile]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[#94A3B8]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Sales Assistant"
        icon={TrendingUp}
        title="Sales Assistant"
        subtitle="Qualify leads, handle objections, recommend products, quote and close — on every call."
        actions={
          agentId && (
            <PrimaryButton onClick={save} disabled={saving} className="px-4 py-2 text-[13px]">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
            </PrimaryButton>
          )
        }
      />

      {agents.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No agents yet" hint="Create an agent first, then configure its sales behaviour." />
      ) : (
        <>
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <span className="text-[12.5px] font-semibold text-[#334155]">Agent</span>
            <select className={`${inputCls} mt-0 max-w-xs`} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name || "Untitled agent"}
                </option>
              ))}
            </select>
            {profile?._new && <Badge tone="amber">Not configured</Badge>}
          </Card>

          {profile && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="p-5">
                  <SectionTitle icon={Target} title="Qualification" subtitle="How the agent qualifies opportunities" />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {STRATEGIES.map((s) => {
                      const active = profile.qualification_strategy === s.value;
                      return (
                        <button
                          key={s.value}
                          onClick={() => set({ qualification_strategy: s.value })}
                          className={`rounded-xl border px-3 py-2 text-left transition ${
                            active ? "border-[#2563EB] bg-[#EFF4FF] ring-2 ring-[#2563EB]/15" : "border-[#E7EAF1] hover:border-[#CBD5E1]"
                          }`}
                        >
                          <span className="block text-[12.5px] font-bold text-[#0F172A]">{s.label}</span>
                          <span className="mt-0.5 block text-[11px] leading-tight text-[#94A3B8]">{s.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-4">
                    <Field label="Default pipeline" hint="Where qualified leads land in your CRM.">
                      <input className={inputCls} value={profile.default_pipeline || ""} onChange={(e) => set({ default_pipeline: e.target.value })} placeholder="Sales pipeline" />
                    </Field>
                  </div>
                </Card>

                <Card className="space-y-3 p-5">
                  <SectionTitle icon={Sparkles} title="Behaviour" subtitle="What the assistant is allowed to do" />
                  <Toggle checked={!!profile.enabled} onChange={(v) => set({ enabled: v })} label="Sales assistant enabled" desc="Engage selling behaviour on calls." />
                  <Toggle checked={!!profile.allow_quote_generation} onChange={(v) => set({ allow_quote_generation: v })} label="Allow quote generation" desc="Let the agent produce priced quotes." />
                  <Toggle checked={!!profile.follow_up_enabled} onChange={(v) => set({ follow_up_enabled: v })} label="Automatic follow-up" desc="Schedule follow-ups after the call." />
                </Card>
              </div>

              <div>
                <SectionTitle
                  icon={Package}
                  title="Product catalogue"
                  subtitle="Used for recommendations, upsell and quotes"
                  right={
                    <GhostButton onClick={addProduct} className="px-3 py-1.5 text-[12.5px]">
                      <Plus size={14} /> Add product
                    </GhostButton>
                  }
                />
                {products.length === 0 ? (
                  <EmptyState icon={Package} title="No products yet" hint="Add products so the agent can recommend and quote." action={<GhostButton onClick={addProduct} className="px-3 py-2 text-[13px]"><Plus size={14} /> Add product</GhostButton>} />
                ) : (
                  <div className="space-y-2">
                    {products.map((p, i) => (
                      <Card key={i} className="grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-[1fr_140px_2fr_auto]">
                        <Field label="Name">
                          <input className={inputCls} value={p.name || ""} onChange={(e) => updateProduct(i, { name: e.target.value })} placeholder="Pro plan" />
                        </Field>
                        <Field label="Price">
                          <input type="number" className={inputCls} value={p.price ?? ""} onChange={(e) => updateProduct(i, { price: Number(e.target.value) || 0 })} placeholder="99" />
                        </Field>
                        <Field label="Description">
                          <input className={inputCls} value={p.description || ""} onChange={(e) => updateProduct(i, { description: e.target.value })} placeholder="Best for growing teams" />
                        </Field>
                        <button onClick={() => removeProduct(i)} className="mb-1 rounded-lg p-2 text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#EF4444]">
                          <Trash2 size={16} />
                        </button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {!profile._new && (
                <div>
                  <SectionTitle icon={Wand2} title="Test bench" subtitle="Try the assistant's sales primitives live" />
                  <TestBench agentId={agentId} products={products} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
