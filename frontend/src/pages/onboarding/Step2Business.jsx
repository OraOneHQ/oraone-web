import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { ONBOARDING } from "@/constants/testIds";

const INDUSTRIES = ["Healthcare", "Real Estate", "Education", "Insurance", "Finance", "Retail", "Hospitality", "Automotive", "Other"];

export default function Step2Business() {
  const nav = useNavigate();
  const [form, setForm] = useState(() => JSON.parse(sessionStorage.getItem("onboard_business") || "null") || {
    company_name: "",
    industry: "Healthcare",
    phone: "",
    website: "",
    email: "",
  });

  const next = (e) => {
    e.preventDefault();
    sessionStorage.setItem("onboard_business", JSON.stringify(form));
    nav("/onboarding/channels");
  };

  return (
    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={next}>
      <h1 className="text-4xl font-bold tracking-tighter text-[#0F172A]">Tell us about your business</h1>
      <p className="mt-3 text-[#64748B]">This helps us customize your AI agents.</p>

      <div className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Business Name</label>
          <input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} data-testid={ONBOARDING.step2CompanyName} placeholder="Your Business Name" className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Industry</label>
          <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} data-testid={ONBOARDING.step2Industry} className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10">
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Business Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid={ONBOARDING.step2Phone} placeholder="+1 (555) 123-4567" className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Business Website (Optional)</label>
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} data-testid={ONBOARDING.step2Website} placeholder="https://www.yourbusiness.com" className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Business Email (Optional)</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid={ONBOARDING.step2Email} placeholder="contact@yourbusiness.com" className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10" />
        </div>
      </div>

      <div className="mt-10 flex justify-between">
        <button type="button" onClick={() => nav("/onboarding/agent")} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E2E8F0] text-[#0F172A] font-semibold text-sm hover:bg-[#F8FAFC]">
          <ArrowLeft size={16} /> Back
        </button>
        <button type="submit" data-testid={ONBOARDING.step2Next} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm">
          Next <ArrowRight size={16} />
        </button>
      </div>
    </motion.form>
  );
}
