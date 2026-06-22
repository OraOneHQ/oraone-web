import React from "react";
import { motion } from "framer-motion";
import { useSEO } from "@/lib/seo";

const cases = [
  { name: "Apollo Clinic", industry: "Healthcare", result: "95% appointments booked via AI Voice Agent", quote: "OraOne reduced our missed appointments by 80%." },
  { name: "RE/MAX India", industry: "Real Estate", result: "3X more qualified leads in 60 days", quote: "Our agents now focus only on hot leads." },
  { name: "Verma Motors", industry: "Automotive", result: "70% lower support cost via WhatsApp Agent", quote: "Customers love the instant replies." },
  { name: "Bright Dental", industry: "Healthcare", result: "24/7 appointment booking with zero staff", quote: "Best ROI investment we've made." },
];

export default function CaseStudiesPage() {
  useSEO({ title: "Case Studies", description: "How leading businesses use OraOne to scale customer conversations." });
  return (
    <div>
      <section className="bg-[#F8FAFC] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-[#0F172A]">Case Studies</h1>
          <p className="mt-4 text-[#64748B] max-w-2xl mx-auto">Real results from real businesses using OraOne.</p>
        </div>
      </section>
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-6">
          {cases.map((c, i) => (
            <motion.div key={c.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="p-8 rounded-3xl bg-white border border-[#E2E8F0] hover:shadow-premium transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl gradient-bg grid place-items-center text-white font-bold">{c.name.slice(0, 1)}</div>
                <div>
                  <p className="text-lg font-semibold text-[#0F172A]">{c.name}</p>
                  <p className="text-xs text-[#64748B]">{c.industry}</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-[#2563EB] tracking-tight">{c.result}</p>
              <p className="mt-4 text-[#64748B] italic">"{c.quote}"</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
