import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, MessageSquare, MessageCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ONBOARDING } from "@/constants/testIds";

const AGENTS = [
  { id: "voice", title: "Voice Agent", desc: "Answer calls and automate conversations", icon: Phone, color: "#2563EB", testid: ONBOARDING.step1Voice },
  { id: "chat", title: "Chat Agent", desc: "Add a chatbot to my website", icon: MessageSquare, color: "#10B981", testid: ONBOARDING.step1Chat },
  { id: "whatsapp", title: "WhatsApp Agent", desc: "Automate WhatsApp conversations", icon: MessageCircle, color: "#22C55E", testid: ONBOARDING.step1Whatsapp },
];

export default function Step1Agent() {
  const nav = useNavigate();
  const [selected, setSelected] = useState(() => sessionStorage.getItem("onboard_agent") || "voice");

  const next = () => {
    sessionStorage.setItem("onboard_agent", selected);
    nav("/onboarding/business");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-4xl font-bold tracking-tighter text-[#0F172A]">Welcome to OraOne! 👋</h1>
      <p className="mt-3 text-[#64748B]">Let's set up your account in a few simple steps.</p>
      <p className="mt-8 text-sm font-semibold text-[#0F172A]">What would you like to set up first?</p>

      <div className="mt-4 space-y-3">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            data-testid={a.testid}
            onClick={() => setSelected(a.id)}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center gap-4 ${
              selected === a.id ? "border-[#2563EB] bg-[#EFF6FF]" : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
            }`}
          >
            <div className="size-12 rounded-xl grid place-items-center flex-shrink-0" style={{ background: `${a.color}15` }}>
              <a.icon size={20} style={{ color: a.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-[#0F172A]">{a.title}</p>
              <p className="text-sm text-[#64748B]">{a.desc}</p>
            </div>
            <div className={`size-5 rounded-full border-2 ${selected === a.id ? "border-[#2563EB] bg-[#2563EB]" : "border-[#CBD5E1]"} grid place-items-center`}>
              {selected === a.id && <div className="size-2 rounded-full bg-white" />}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10 flex justify-end">
        <button onClick={next} data-testid={ONBOARDING.step1Next} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm">
          Next <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}
