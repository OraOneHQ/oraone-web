import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSEO } from "@/lib/seo";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Signup() {
  useSEO({ title: "Sign up", description: "Create your OraOne account in minutes." });
  const { signup } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    setBusy(true);
    const res = await signup({ email, password, name });
    setBusy(false);

    if (!res?.ok) {
      setError(res?.error || "Signup failed.");
      return;
    }

    nav(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`, { replace: true });
  };

  return (
    <div data-testid="signup-form">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]">Create your account</h1>
      <p className="mt-2 text-[15px] text-[#64748B]">Get started in minutes. No credit card required.</p>

      <form className="mt-8 space-y-4" onSubmit={handleSignUp}>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full Name"
          className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create password"
          className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]"
        />
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]"
        />
        {error && <p className="text-sm text-[#DC2626]">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          data-testid="signup-submit"
          className="group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-[15px] transition-all disabled:opacity-60 shadow-[0_18px_40px_-12px_rgba(124,58,237,0.55)]"
          style={{ background: "linear-gradient(90deg,#7C3AED 0%,#6366F1 100%)" }}
        >
          {busy ? "Creating account..." : "Create Account"}
          <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>

      <div data-testid="signup-ai-disclaimer" className="mt-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3 flex gap-2.5">
        <ShieldCheck size={16} className="text-[#7C3AED] mt-0.5 flex-shrink-0" />
        <p className="text-[11.5px] text-[#475569] leading-relaxed">
          <span className="font-semibold text-[#0F172A]">AI Disclaimer:</span> OraOne uses AI models to generate responses. Outputs may occasionally be inaccurate.
        </p>
      </div>
      <p className="mt-7 text-center text-sm text-[#64748B]">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-[#7C3AED] hover:underline">Log in</Link>
      </p>
      <p className="mt-3 text-center text-[11px] text-[#94A3B8]">
        By signing up you agree to our{" "}
        <Link to="/terms" className="underline">Terms of Service</Link>{" "}and{" "}
        <Link to="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}
