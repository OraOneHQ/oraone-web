// ─────────────────────────────────────────────────────────────────────────────
// Voice (Product 2) shared UI widgets — animated counters, skeleton loaders,
// status pills, provider chips, trial banner, friendly error card, sparklines,
// waveform. Built on the OraOne "Luminous" kit so Product 2 feels identical to
// Product 1.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, cx, PrimaryButton, GhostButton } from "@/components/dashboard/kit";

/* ── Animated counter ────────────────────────────────────────────────────── */
export function AnimatedNumber({ value, decimals = 0, prefix = "", suffix = "", duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const from = fromRef.current;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ── Skeleton primitives ─────────────────────────────────────────────────── */
export function Skeleton({ className = "" }) {
  return <div className={cx("animate-pulse rounded-lg bg-[#EEF2F8]", className)} />;
}

export function StatCardSkeleton() {
  return (
    <Card className="h-full p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="mt-3 h-7 w-20" />
      <Skeleton className="mt-2 h-3 w-24" />
    </Card>
  );
}

export function RowSkeleton({ cols = 6 }) {
  return (
    <div className="flex items-center gap-4 border-b border-[#F1F5F9] px-4 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cx("h-4", i === 0 ? "w-24" : "flex-1")} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          </div>
          <Skeleton className="mt-4 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-3/4" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ── Live status dot ─────────────────────────────────────────────────────── */
export function LiveDot({ tone = "green", pulse = true }) {
  const color = { green: "#22C55E", red: "#EF4444", amber: "#F59E0B", slate: "#94A3B8" }[tone] || "#22C55E";
  return (
    <span className="relative inline-flex size-2.5">
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ background: color }}
        />
      )}
      <span className="relative inline-flex size-2.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

/* ── Provider status chip (system health hero) ───────────────────────────── */
export function ProviderChip({ label, desc, ok, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx(
        "flex items-center gap-3 rounded-2xl border px-3.5 py-3 backdrop-blur transition-colors",
        ok
          ? "border-white/15 bg-white/10"
          : "border-amber-300/30 bg-amber-500/10"
      )}
    >
      <span
        className={cx(
          "grid size-9 place-items-center rounded-xl",
          ok ? "bg-white/15 text-white" : "bg-amber-400/20 text-amber-100"
        )}
      >
        {Icon ? <Icon size={16} /> : <LiveDot tone={ok ? "green" : "amber"} />}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13px] font-semibold text-white">{label}</p>
          {ok ? (
            <CheckCircle2 size={13} className="text-emerald-300" />
          ) : (
            <AlertTriangle size={13} className="text-amber-300" />
          )}
        </div>
        <p className="truncate text-[11px] text-white/60">
          {ok ? "Connected" : "Not connected"} · {desc}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Friendly error card (never raw backend errors) ──────────────────────── */
export function FriendlyError({ error, onRetry, retrying }) {
  if (!error) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-[#FECDCA] bg-[#FFFBFA] p-4"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#FEE4E2] text-[#D92D20]">
          <XCircle size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#B42318]">
            {error.title}
            {error.code && (
              <span className="ml-2 rounded-md bg-[#FEE4E2] px-1.5 py-0.5 text-[10px] font-semibold text-[#B42318]">
                {error.code}
              </span>
            )}
          </p>
          <p className="mt-1 text-[13px] text-[#7A271A]">{error.reason}</p>
          {error.fix && (
            <p className="mt-1.5 text-[12.5px] text-[#7A271A]">
              <span className="font-semibold">Fix: </span>
              {error.fix}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {error.retryable && onRetry && (
              <PrimaryButton onClick={onRetry} disabled={retrying} className="px-3 py-1.5 text-[13px]">
                {retrying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Retry
              </PrimaryButton>
            )}
            {error.docs && (
              <GhostButton as="a" href={error.docs} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-[13px]">
                <ExternalLink size={14} />
                Documentation
              </GhostButton>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Twilio trial banner ─────────────────────────────────────────────────── */
export function TrialBanner({ onVerify }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#FDE68A] bg-gradient-to-r from-[#FFFBEB] to-[#FEF9C3] p-4"
    >
      <span className="grid size-10 place-items-center rounded-xl bg-[#FEF3C7] text-[#B45309]">
        <AlertTriangle size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[#92400E]">You're using a Twilio Trial account</p>
        <p className="mt-0.5 text-[13px] text-[#92400E]/80">
          Only verified numbers can receive outbound calls. Verify a number or upgrade to call anyone.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <GhostButton
          as="a"
          href="https://www.twilio.com/console/phone-numbers/verified"
          target="_blank"
          rel="noreferrer"
          className="border-[#FCD34D] bg-white/70"
        >
          Verify Phone
        </GhostButton>
        <PrimaryButton
          as="a"
          href="https://www.twilio.com/console"
          target="_blank"
          rel="noreferrer"
          onClick={onVerify}
        >
          Open Twilio Console
        </PrimaryButton>
      </div>
    </motion.div>
  );
}

/* ── Mini sparkline (SVG, no deps) ───────────────────────────────────────── */
export function Sparkline({ data = [], stroke = "#2563EB", height = 36, fill = true }) {
  if (!data.length) return <div style={{ height }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w;
    const y = height - ((v - min) / range) * height;
    return [x, y];
  });
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${w},${height} L0,${height} Z`;
  const gid = `spark-${stroke.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Animated voice waveform (decorative + live) ─────────────────────────── */
export function Waveform({ active = true, bars = 28, color = "#2563EB", className = "" }) {
  return (
    <div className={cx("flex items-end gap-[3px]", className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full"
          style={{ background: color }}
          animate={
            active
              ? { height: [6, 8 + ((i * 37) % 26), 6] }
              : { height: 6 }
          }
          transition={
            active
              ? { duration: 0.9 + (i % 5) * 0.12, repeat: Infinity, ease: "easeInOut", delay: (i % 7) * 0.06 }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  );
}

/* ── Section reveal wrapper ──────────────────────────────────────────────── */
export function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
