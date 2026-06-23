import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSEO } from "@/lib/seo";
import { ArrowRight, Phone, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.32v2.76h3.55c2.08-1.91 3.23-4.74 3.23-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.76c-.99.66-2.25 1.06-3.73 1.06-2.87 0-5.3-1.94-6.16-4.54H2.18v2.85A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.85z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.65l3.15-3.15C17.45 2.1 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.85C6.7 7.32 9.13 5.38 12 5.38z"/>
    </svg>
  );
}

export default function Login() {
  useSEO({ title: "Login", description: "Sign in to your OraOne account" });
  const { login } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("email"); // 'email' | 'phone'
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
      setError(
        `Signed in, but we couldn't load your workspace: ${res.identityError}. Please retry in a moment.`
      );
      return;
    }

    nav("/app/overview", { replace: true });
  };

  const handlePhoneSignIn = (e) => {
    e.preventDefault();
    setError("");
    if (!phone || phone.replace(/\D/g, "").length < 8) {
      setError("Enter a valid phone number.");
      return;
    }
    toast.info("Phone sign-in: OTP feature coming soon.");
  };

  const handleGoogle = () => {
    toast.info("Google sign-in: redirecting to Cognito Hosted UI...");
    const domain = process.env.REACT_APP_COGNITO_DOMAIN;
    const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
    const redirect = process.env.REACT_APP_COGNITO_REDIRECT_URI;
    if (!domain || !clientId || !redirect) {
      toast.error("Google sign-in is not configured.");
      return;
    }
    const url = `${domain}/oauth2/authorize?identity_provider=Google&redirect_uri=${encodeURIComponent(
      redirect
    )}&response_type=code&client_id=${clientId}&scope=email+openid+profile`;
    window.location.href = url;
  };

  return (
    <div data-testid="login-form">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A]">Welcome back</h1>
      <p className="mt-1.5 text-[14px] text-[#64748B]">Log in to your OraOne account</p>

      {/* Social buttons */}
      <div className="mt-5 space-y-2.5">
        <button
          type="button"
          onClick={handleGoogle}
          data-testid="login-google-btn"
          className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] text-sm font-semibold hover:bg-[#F8FAFC] transition-colors"
        >
          <GoogleIcon size={18} />
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "phone" ? "email" : "phone")}
          data-testid="login-phone-toggle-btn"
          className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-[#0F172A] text-sm font-semibold hover:bg-[#F8FAFC] transition-colors"
        >
          {mode === "phone" ? <Mail size={16} /> : <Phone size={16} />}
          {mode === "phone" ? "Continue with Email" : "Continue with Phone"}
        </button>
      </div>

      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 h-px bg-[#E2E8F0]" />
        <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-[#E2E8F0]" />
      </div>

      {mode === "email" ? (
        <form className="space-y-3" onSubmit={handleSignIn}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            data-testid="login-email-input"
            className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            data-testid="login-password-input"
            className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]"
          />
          <div className="text-right">
            <Link to="/forgot-password" className="text-xs font-semibold text-[#7C3AED] hover:underline">Forgot Password?</Link>
          </div>
          {error && <p className="text-sm text-[#DC2626]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            data-testid="login-submit"
            className="group w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-[15px] transition-all disabled:opacity-60 shadow-[0_18px_40px_-12px_rgba(124,58,237,0.55)]"
            style={{ background: "linear-gradient(90deg,#7C3AED 0%,#6366F1 100%)" }}
          >
            {busy ? "Signing in…" : "Sign in with Email"}
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={handlePhoneSignIn}>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            data-testid="login-phone-input"
            className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/15 focus:border-[#2563EB]"
          />
          {error && <p className="text-sm text-[#DC2626]">{error}</p>}
          <button
            type="submit"
            data-testid="login-phone-submit"
            className="group w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-[15px] transition-all shadow-[0_18px_40px_-12px_rgba(124,58,237,0.55)]"
            style={{ background: "linear-gradient(90deg,#7C3AED 0%,#6366F1 100%)" }}
          >
            Send OTP <ArrowRight size={17} />
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-[#64748B]">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="font-semibold text-[#7C3AED] hover:underline">Create one</Link>
      </p>
    </div>
  );
}