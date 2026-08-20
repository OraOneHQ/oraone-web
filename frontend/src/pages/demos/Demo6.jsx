import React from "react";
import DashboardShell from "./DashboardShell";

/* Direction 6 · "Mint Fresh" — emerald, friendly, soft rounded-3xl cards. */
const theme = {
  id: "mint",
  name: "6 · Mint Fresh",
  canvas: "#F3FBF6",
  cardBg: "#FFFFFF",
  ink: "#0C2018",
  sub: "#577065",
  muted: "#93A89C",
  line: "#E1F0E8",
  brand: "#059669",
  brand2: "#10B981",
  accentBg: "#DCFCE7",
  bannerBg: "linear-gradient(90deg,#DCFCE7,#E0F7F4,#E7FBEC)",
  sidebarBg: "#FBFEFC",
  cardRadius: 20,
  ctrlRadius: 14,
  shadow: "0 8px 24px -14px rgba(6,95,70,0.22)",
  chart1: "#059669",
  chart2: "#34D399",
  channels: ["#059669", "#0EA5E9", "#7C3AED", "#F59E0B"],
  kpi: [
    { tone: "#059669", bg: "#DCFCE7" },
    { tone: "#0EA5E9", bg: "#E0F2FE" },
    { tone: "#16A34A", bg: "#DCFCE7" },
    { tone: "#0D9488", bg: "#CCFBF1" },
    { tone: "#CA8A04", bg: "#FEF9C3" },
    { tone: "#DC2626", bg: "#FEE2E2" },
  ],
};

export default function Demo6() {
  return <DashboardShell theme={theme} />;
}
