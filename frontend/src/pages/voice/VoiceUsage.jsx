import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Gauge,
  PhoneCall,
  Mic,
  Volume2,
  Cpu,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  PageHeader,
  Card,
  SectionTitle,
  Segmented,
  StatCard,
} from "@/components/dashboard/kit";
import { AnimatedNumber, Sparkline, Reveal } from "@/components/voice/widgets";
import { voiceApi, fmtDuration, fmtMoney } from "@/lib/voice";

const RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

function UsageBar({ icon: Icon, label, value, unit, pct, tone, bg, spark }) {
  return (
    <Reveal>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl" style={{ background: bg }}>
              <Icon size={16} style={{ color: tone }} />
            </span>
            <p className="text-[13px] font-semibold text-[#334155]">{label}</p>
          </div>
          <p className="text-[18px] font-extrabold text-[#0F172A]">
            {value}
            <span className="ml-1 text-[12px] font-medium text-[#94A3B8]">{unit}</span>
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: tone }}
          />
        </div>
        {spark && <div className="mt-3"><Sparkline data={spark} stroke={tone} height={32} /></div>}
      </Card>
    </Reveal>
  );
}

export default function VoiceUsage() {
  const [range, setRange] = useState("today");
  const [data, setData] = useState(null);

  useEffect(() => {
    voiceApi.dashboard().then(setData).catch(() => {});
  }, []);

  const d = data || {};
  const totalSeconds = (d.avg_duration_seconds || 0) * (d.calls_today || 0);
  const minutes = Math.round(totalSeconds / 60);

  const spark = useMemo(() => Array.from({ length: 14 }, (_, i) => 4 + ((i * 7 + 3) % 11)), []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Voice AI"
        icon={Gauge}
        title="Usage"
        subtitle="Track consumption across calls, speech and language models."
        actions={<Segmented value={range} onChange={setRange} options={RANGES} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={PhoneCall} label="Calls" value={<AnimatedNumber value={d.calls_today || 0} />} bg="#EFF4FF" tone="#2563EB" />
        <StatCard icon={Clock} label="Minutes" value={<AnimatedNumber value={minutes} />} bg="#F5F3FF" tone="#7C3AED" />
        <StatCard icon={TrendingUp} label="Resolution" value={<AnimatedNumber value={(d.ai_resolution_rate || 0) * 100} suffix="%" />} bg="#ECFDF3" tone="#16A34A" />
        <StatCard icon={Cpu} label="Spend" value={fmtMoney(d.total_cost || 0)} bg="#FEFCE8" tone="#CA8A04" />
      </div>

      <div>
        <SectionTitle icon={Gauge} title="Consumption breakdown" subtitle="By processing stage" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UsageBar icon={Clock} label="Call minutes" value={minutes} unit="min" pct={(minutes / 100) * 100} tone="#2563EB" bg="#EFF4FF" spark={spark} />
          <UsageBar icon={Mic} label="Speech-to-Text" value={minutes} unit="min" pct={(minutes / 100) * 100} tone="#0891B2" bg="#ECFEFF" spark={spark.map((v) => v * 0.9)} />
          <UsageBar icon={Volume2} label="Text-to-Speech" value={Math.round(minutes * 0.7)} unit="min" pct={(minutes / 100) * 70} tone="#7C3AED" bg="#F5F3FF" spark={spark.map((v) => v * 0.7)} />
          <UsageBar icon={Cpu} label="LLM tokens" value={<AnimatedNumber value={(d.calls_today || 0) * 1800} />} unit="tok" pct={Math.min(100, (d.calls_today || 0) * 4)} tone="#EA580C" bg="#FFF7ED" spark={spark.map((v) => v * 1.2)} />
        </div>
      </div>
    </div>
  );
}
