import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * Floating switcher shown on every design-direction demo page so the reviewer
 * can flip between Demo 1/2/3 instantly. Purely a review aid — not part of the
 * proposed design.
 */
// Dashboard theme variants (the active selection task)
const DASHBOARDS = [
  { path: "/demo4", label: "4 · Luminous" },
  { path: "/demo5", label: "5 · Slate Pro" },
  { path: "/demo6", label: "6 · Mint Fresh" },
  { path: "/demo7", label: "7 · Violet Tint" },
  { path: "/demo8", label: "8 · Sunset Warm" },
];

// Earlier full-page marketing directions
const PAGES = [
  { path: "/demo1", label: "1 · Aurora" },
  { path: "/demo2", label: "2 · Daylight" },
  { path: "/demo3", label: "3 · Electric" },
];

export default function DemoSwitcher() {
  const { pathname } = useLocation();

  const pill = (d) => {
    const active = pathname === d.path;
    return (
      <Link
        key={d.path}
        to={d.path}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          active ? "bg-white text-[#0B0F1A]" : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        {d.label}
      </Link>
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2147483000,
        maxWidth: "96vw",
      }}
    >
      <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-white/15 bg-[#0B0F1A]/85 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <span className="pl-2 pr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Dashboard
        </span>
        {DASHBOARDS.map(pill)}
        <span className="mx-1 h-4 w-px bg-white/15" />
        {PAGES.map(pill)}
      </div>
    </div>
  );
}
