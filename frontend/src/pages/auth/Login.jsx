import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSEO } from "@/lib/seo";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Login() {
  useSEO({ title: "Login", description: "Sign in to your OraOne account" });
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    const res = await login({ email, password });
    setBusy(false);

    if (!res?.ok) {
      setError(res?.error || "Login failed.");
      return;
    }

    if (res.identityError) {
      // Authentication succeeded but workspace context didn't load.
      // Surface the issue rather than dropping the user into a broken dashboard.
      setError(
        `Signed in, but we couldn't load your workspace: ${res.identityError}. Please retry in a moment.`
      );
      return;
    }

    nav("/app/overview", { replace: true });
  };

  return (
    <div data-testid="login-form">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]">Welcome back</h1>
      <p className="mt-2 text-[15px] text-[#64748B]">Log in to your OraOne account</p>

      <form className="mt-8 space-y-4" onSubmit={handleSignIn}>
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]"
        />
        {error && <p className="text-sm text-[#DC2626]">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          data-testid="login-submit"
          className="group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-[15px] transition-all disabled:opacity-60 shadow-[0_18px_40px_-12px_rgba(124,58,237,0.55)]"
          style={{ background: "linear-gradient(90deg,#7C3AED 0%,#6366F1 100%)" }}
        >
          {busy ? "Signing in…" : "Sign in with Email"}
          <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#64748B]">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="font-semibold text-[#7C3AED] hover:underline">Create one</Link>
      </p>
      <div className="mt-7 relative overflow-hidden rounded-2xl px-5 py-4 flex items-center gap-4 border border-[#E9D5FF]" style={{ background: "linear-gradient(135deg,#F5F0FF 0%,#EEF2FF 100%)" }}>
        <div className="size-11 rounded-xl grid place-items-center bg-white shadow-[0_4px_14px_-4px_rgba(124,58,237,0.35)] shrink-0">
          <ShieldCheck size={20} className="text-[#7C3AED]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#0F172A]">Your data is safe with us</p>
          <p className="mt-0.5 text-[12.5px] text-[#64748B] leading-snug">We use enterprise-grade encryption and security practices to protect your information.</p>
        </div>
      </div>
    </div>
  );
}
