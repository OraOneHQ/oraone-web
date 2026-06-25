import React from "react";
import DashboardShell from "./DashboardShell";

/* Direction 7 · "Violet Tint" — lavender-tinted surfaces, vibrant purple. */
const theme = {
  id: "violet",
  name: "7 · Violet Tint",
  canvas: "#F7F5FF",
  cardBg: "#FFFFFF",
  ink: "#1B1430",
  sub: "#6B6486",
  muted: "#A39FB8",
  line: "#ECE8F7",
  brand: "#7C3AED",
  brand2: "#A855F7",
  accentBg: "#EDE9FE",
  bannerBg: "linear-gradient(90deg,#EDE9FE,#F3E8FF,#FCE7F3)",
  sidebarBg: "#FBFAFF",
  cardRadius: 16,
  ctrlRadius: 12,
  shadow: "0 10px 30px -16px rgba(124,58,237,0.30)",
  chart1: "#7C3AED",
  chart2: "#C084FC",
  channels: ["#7C3AED", "#2563EB", "#EC4899", "#F59E0B"],
  kpi: [
    { tone: "#7C3AED", bg: "#EDE9FE" },
    { tone: "#2563EB", bg: "#DBEAFE" },
    { tone: "#16A34A", bg: "#DCFCE7" },
    { tone: "#EC4899", bg: "#FCE7F3" },
    { tone: "#F59E0B", bg: "#FEF3C7" },
    { tone: "#DC2626", bg: "#FEE2E2" },
  ],
};

export default function Demo7() {
  return <DashboardShell theme={theme} />;
}
