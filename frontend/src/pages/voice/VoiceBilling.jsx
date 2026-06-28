import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CreditCard,
  Check,
  Zap,
  TrendingUp,
  DollarSign,
  Download,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  GhostButton,
  PrimaryButton,
  SectionTitle,
  cx,
} from "@/components/dashboard/kit";
import { AnimatedNumber, Reveal } from "@/components/voice/widgets";
import { voiceApi, fmtMoney } from "@/lib/voice";

const PLANS = [
  {
    name: "Starter",
    price: 0,
    tagline: "Explore voice AI",
    features: ["100 call minutes / mo", "1 voice agent", "Community support"],
    cta: "Current plan",
    current: true,
  },
  {
    name: "Growth",
    price: 99,
    tagline: "For growing teams",
    features: ["2,000 call minutes / mo", "Unlimited agents", "Analytics & exports", "Priority support"],
    cta: "Upgrade",
    highlighted: true,
  },
  {
    name: "Scale",
    price: 499,
    tagline: "High-volume operations",
    features: ["15,000 call minutes / mo", "SLA & SSO", "Dedicated number pool", "Solutions engineer"],
    cta: "Contact sales",
  },
];

function Meter({ label, used, total, tone }) {
  const pct = Math.min(100, total ? (used / total) * 100 : 0);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
        <span className="font-semibold text-[#334155]">{label}</span>
        <span className="text-[#64748B]">{used} / {total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: tone }}
        />
      </div>
    </div>
  );
}

export default function VoiceBilling() {
  const [data, setData] = useState(null);

  useEffect(() => {
    voiceApi.dashboard().then(setData).catch(() => {});
  }, []);

  const d = data || {};
  const minutesUsed = Math.round((d.avg_duration_seconds || 0) * (d.calls_today || 0) / 60);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={CreditCard}
        title="Billing"
        subtitle="Manage your plan, payment method and invoices."
        actions={
          <GhostButton as={Link} to="/app/billing">
            <CreditCard size={16} /> Account billing
          </GhostButton>
        }
      />

      {/* Current usage summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#EFF4FF] text-[#2563EB]"><Zap size={16} /></span>
            <div>
              <p className="text-[22px] font-extrabold text-[#0F172A]"><AnimatedNumber value={minutesUsed} /></p>
              <p className="text-[12px] text-[#64748B]">Minutes this period</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#FEFCE8] text-[#CA8A04]"><DollarSign size={16} /></span>
            <div>
              <p className="text-[22px] font-extrabold text-[#0F172A]">{fmtMoney(d.total_cost || 0)}</p>
              <p className="text-[12px] text-[#64748B]">Current spend</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#ECFDF3] text-[#16A34A]"><TrendingUp size={16} /></span>
            <div>
              <p className="text-[22px] font-extrabold text-[#0F172A]"><AnimatedNumber value={d.calls_today || 0} /></p>
              <p className="text-[12px] text-[#64748B]">Calls today</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Usage meters */}
      <Card className="p-5">
        <SectionTitle icon={Zap} title="Plan usage" subtitle="Starter plan limits" />
        <div className="space-y-4">
          <Meter label="Call minutes" used={minutesUsed} total={100} tone="#2563EB" />
          <Meter label="Active agents" used={Math.min(1, d.live_calls || 0) || 1} total={1} tone="#7C3AED" />
        </div>
      </Card>

      {/* Plans */}
      <div>
        <SectionTitle icon={Sparkles} title="Plans" subtitle="Upgrade for more minutes and features" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <Reveal key={p.name}>
              <Card
                className={cx(
                  "relative flex h-full flex-col p-6",
                  p.highlighted && "border-[#BFD3FF] ring-2 ring-[#2563EB]/20"
                )}
              >
                {p.highlighted && (
                  <span className="absolute -top-2.5 left-6 rounded-full bg-gradient-to-r from-[#2563EB] to-[#4F46E5] px-2.5 py-0.5 text-[11px] font-bold text-white">
                    Most popular
                  </span>
                )}
                <p className="text-[14px] font-bold text-[#0F172A]">{p.name}</p>
                <p className="text-[12.5px] text-[#64748B]">{p.tagline}</p>
                <p className="mt-3 text-[30px] font-extrabold tracking-tight text-[#0F172A]">
                  ${p.price}
                  <span className="text-[13px] font-medium text-[#94A3B8]">/mo</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[13px] text-[#475569]">
                      <Check size={15} className="text-[#16A34A]" /> {f}
                    </li>
                  ))}
                </ul>
                {p.current ? (
                  <GhostButton disabled className="mt-5 w-full justify-center opacity-70">{p.cta}</GhostButton>
                ) : (
                  <PrimaryButton as={Link} to="/app/billing" className="mt-5 w-full justify-center">
                    {p.cta} <ArrowUpRight size={15} />
                  </PrimaryButton>
                )}
              </Card>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <Card className="p-5">
        <SectionTitle
          icon={Download}
          title="Invoices"
          subtitle="Download past statements"
          right={<Badge tone="slate">No invoices yet</Badge>}
        />
        <p className="text-[13px] text-[#64748B]">Invoices will appear here once you're on a paid plan.</p>
      </Card>
    </div>
  );
}
