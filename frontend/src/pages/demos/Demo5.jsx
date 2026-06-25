import React from "react";
import DashboardShell from "./DashboardShell";

/* Direction 5 · "Slate Pro" — neutral enterprise (Linear / Vercel light).
   Cool gray canvas, restrained indigo accent, minimal shadows, tight radii. */
const theme = {
  id: "slate",
  name: "5 · Slate Pro",
  canvas: "#F7F8FA",
  cardBg: "#FFFFFF",
  ink: "#0F172A",
  sub: "#5B6573",
  muted: "#94A3B8",
  line: "#E8EBF0",
  brand: "#4F46E5",
  brand2: "#6366F1",
  accentBg: "#EEF0FF",
  bannerBg: "#F1F3F9",
  sidebarBg: "#FFFFFF",
  cardRadius: 12,
  ctrlRadius: 8,
  shadow: "0 1px 2px rgba(16,24,40,0.05)",
  chart1: "#4F46E5",
  chart2: "#94A3B8",
  channels: ["#4F46E5", "#64748B", "#7C3AED", "#A8B0BD"],
  kpi: [
    { tone: "#4F46E5", bg: "#EEF0FF" },
    { tone: "#475569", bg: "#F1F5F9" },
    { tone: "#475569", bg: "#F1F5F9" },
    { tone: "#475569", bg: "#F1F5F9" },
    { tone: "#475569", bg: "#F1F5F9" },
    { tone: "#475569", bg: "#F1F5F9" },
  ],
};

export default function Demo5() {
  return <DashboardShell theme={theme} />;
}
