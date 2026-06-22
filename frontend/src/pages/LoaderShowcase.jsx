// LoaderShowcase.jsx — Internal showcase page used to capture screenshots of
// every loader variant in the OraOne Loader system. NOT exposed in production
// nav — accessible only at /__loaders for QA/screenshot purposes.

import React from "react";
import OraOneLoader, {
  ButtonSpinner,
  InlineLoader,
  DotsLoader,
  ChatTyping,
  CardSkeleton,
  TableSkeleton,
  EmptyStateLoader,
  ProgressStages,
  TopProgressBar,
} from "@/components/ui/OraOneLoader";

export default function LoaderShowcase() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 space-y-10" data-testid="loader-showcase">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">OraOne Loader System</h1>
        <p className="mt-1 text-[#64748B]">Every loader variant rendered side-by-side for QA / docs.</p>
      </header>

      {/* Full-page Loader (light) */}
      <Section title="01 · Full Page Loader (Light)">
        <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden h-[440px]">
          <OraOneLoader label="Loading your workspace…" fullScreen={false} />
        </div>
      </Section>

      {/* Full-page Loader (dark) */}
      <Section title="02 · Full Page Loader (Dark)">
        <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden h-[440px]">
          <OraOneLoader label="Loading your workspace…" fullScreen={false} dark />
        </div>
      </Section>

      {/* Button + Inline + Dots */}
      <Section title="03 · Button / Inline / Dots Loaders">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 flex items-center justify-center gap-4">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold">
              <ButtonSpinner /> Loading…
            </button>
            <button disabled className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] text-[#94A3B8] text-sm font-semibold opacity-70">
              <ButtonSpinner /> Loading…
            </button>
          </div>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 flex items-center justify-center">
            <InlineLoader label="Loading data…" />
          </div>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 flex items-center justify-center">
            <DotsLoader label="Fetching details…" />
          </div>
        </div>
      </Section>

      {/* Chat Typing */}
      <Section title="04 · Chat Typing Loader">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <ChatTyping />
        </div>
      </Section>

      {/* Skeletons */}
      <Section title="05 · Skeleton Loaders (Card + Table)">
        <div className="grid lg:grid-cols-2 gap-4">
          <CardSkeleton rows={4} />
          <TableSkeleton rows={5} cols={4} />
        </div>
      </Section>

      {/* Empty State Loader */}
      <Section title="06 · Empty State Loader">
        <EmptyStateLoader />
      </Section>

      {/* Progress Stages */}
      <Section title="07 · Progress Stages Loader">
        <ProgressStages current={2} />
      </Section>

      {/* Top progress bar */}
      <Section title="08 · Top Progress Bar (Global Loading)">
        <div className="relative rounded-2xl border border-[#E2E8F0] bg-white p-6 h-24 overflow-hidden">
          <div className="absolute top-0 left-0 right-0">
            <TopProgressBar active label="Preparing your experience…" />
          </div>
          <p className="mt-6 text-center text-[12px] text-[#64748B]">Top progress bar rendered inline for screenshot purposes.</p>
        </div>
      </Section>

      {/* Page Transition */}
      <Section title="09 · Page Transition (Soft Loader)">
        <div className="relative rounded-2xl border border-[#E2E8F0] overflow-hidden h-[280px] bg-white/85 backdrop-blur-sm grid place-items-center">
          <AuraOrbInline />
        </div>
      </Section>
    </div>
  );
}

// Inline copy of AuraOrb for the showcase, since the exported PageTransition
// uses fixed positioning which would overlay the entire showcase page.
function AuraOrbInline() {
  const id = React.useId();
  return (
    <div className="relative grid place-items-center" style={{ width: 120, height: 120 }}>
      {[0, 0.6, 1.2].map((delay, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute inset-0 rounded-full aura-ripple"
          style={{
            animationDelay: `${delay}s`,
            border: "1.5px solid rgba(37,99,235,0.45)",
            background:
              "radial-gradient(circle, rgba(6,182,212,0.16) 0%, rgba(37,99,235,0) 60%)",
          }}
        />
      ))}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full animate-spin"
        style={{ animationDuration: "3.2s" }}
      >
        <defs>
          <linearGradient id={`${id}-arc`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="55%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={`url(#${id}-arc)`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="120 200"
        />
      </svg>
      <div
        className="relative rounded-full aura-breathe"
        style={{
          width: 72,
          height: 72,
          background:
            "radial-gradient(circle at 35% 30%, #FFFFFF 0%, #93C5FD 28%, #2563EB 70%, #1E40AF 100%)",
          boxShadow:
            "0 0 30px 2px rgba(37,99,235,0.42), inset 0 0 14px rgba(6,182,212,0.55)",
        }}
      />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-[12px] font-bold tracking-[0.25em] text-[#2563EB] mb-3">{title}</h2>
      {children}
    </section>
  );
}
