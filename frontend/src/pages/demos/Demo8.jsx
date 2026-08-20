import React from "react";
import DashboardShell from "./DashboardShell";

/* Direction 8 · "Sunset Warm" — warm cream canvas, cozy amber/orange accent. */
const theme = {
  id: "sunset",
  name: "8 · Sunset Warm",
  canvas: "#FCF8F3",
  cardBg: "#FFFFFF",
  ink: "#2A1E16",
  sub: "#7A6A5C",
  muted: "#B0A296",
  line: "#F0E7DC",
  brand: "#EA580C",
  brand2: "#F97316",
  accentBg: "#FFEAD5",
  bannerBg: "linear-gradient(90deg,#FFEAD5,#FFE4E0,#FEF3C7)",
  sidebarBg: "#FFFDFB",
  cardRadius: 18,
  ctrlRadius: 12,
  shadow: "0 10px 26px -16px rgba(124,45,18,0.22)",
  chart1: "#EA580C",
  chart2: "#FB923C",
  channels: ["#EA580C", "#16A34A", "#7C3AED", "#0EA5E9"],
  kpi: [
    { tone: "#EA580C", bg: "#FFEAD5" },
    { tone: "#D97706", bg: "#FEF3C7" },
    { tone: "#16A34A", bg: "#DCFCE7" },
    { tone: "#0EA5E9", bg: "#E0F2FE" },
    { tone: "#CA8A04", bg: "#FEF9C3" },
    { tone: "#DC2626", bg: "#FEE2E2" },
  ],
};

export default function Demo8() {
  return <DashboardShell theme={theme} />;
}
