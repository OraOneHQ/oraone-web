import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, KeyRound, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { AUTH } from "@/constants/testIds";
import { useSEO } from "@/lib/seo";

/* ─────────────────────────────────────────────────────────── */
/* Verify Email — confirm signup with 6-digit Cognito code     */
/* ─────────────────────────────────────────────────────────── */

export function VerifyEmail() {
  useSEO({ title: "Verify Email", description: "Verify your OraOne email address." });
  const { verify, resend } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const fromUrl = params.get("email");
    if (fromUrl && fromUrl !== email) setEmail(fromUrl);
  }, [params, email]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await verify({ email: email.trim().toLowerCase(), code: code.trim() });
    setBusy(false);
    if (res.ok) {
      toast.success("Email verified! You can log in now.");
      nav("/login");
    } else {
      toast.error(res.error || "Verification failed");
    }
  };

  const onResend = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }
    setResending(true);
    const res = await resend({ email: email.trim().toLowerCase() });
    setResending(false);
    if (res.ok) toast.success("A new code has been sent to your email.");
    else toast.error(res.error || "Could not resend code");
  };

  return (
    <div data-testid="verify-email-form">
      <div className="mx-auto size-14 rounded-2xl bg-[#EFF6FF] grid place-items-center mb-5">
        <Mail size={26} className="text-[#2563EB]" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0F172A]">
        Verify your email
      </h1>
      <p className="mt-2 text-[15px] text-[#64748B]">
        Enter the 6-digit code we sent to your inbox.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <div>
          <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Email</label>
          <div className="relative">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="verify-email-input"
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#7C3AED] focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">
            Verification code
          </label>
          <div className="relative">
            <KeyRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              pattern="\d{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              data-testid="verify-code-input"
              placeholder="6-digit code"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] tracking-[0.4em] font-mono placeholder-[#94A3B8] focus:border-[#7C3AED] focus:outline-none focus:ring-4 focus:ring-[#7C3AED]/10 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || code.length !== 6}
          data-testid="verify-submit"
          className="group w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold text-[15px] transition-all disabled:opacity-60 shadow-[0_18px_40px_-12px_rgba(124,58,237,0.55)]"
          style={{ background: "linear-gradient(90deg,#7C3AED 0%,#6366F1 100%)" }}
        >
          {busy ? "Verifying..." : "Verify Email"}
          <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          data-testid="verify-resend"
          className="text-sm font-semibold text-[#7C3AED] hover:underline disabled:opacity-60"
        >
          {resending ? "Sending..." : "Didn't get the code? Resend"}
        </button>
      </div>

      <p className="mt-7 text-center text-sm text-[#64748B]">
        Already verified?{" "}
        <Link to="/login" className="font-semibold text-[#7C3AED] hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Forgot Password — request a reset code                      */
/* ─────────────────────────────────────────────────────────── */

export function ForgotPassword() {
  useSEO({ title: "Forgot Password", description: "Reset your OraOne password." });
  const { forgotPassword } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await forgotPassword({ email: email.trim().toLowerCase() });
    setBusy(false);
    if (res.ok) {
      toast.success("If the account exists, a reset code has been sent.");
      nav(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } else {
      toast.error(res.error || "Could not start reset");
    }
  };

  return (
    <div data-testid="forgot-password-form">
      <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">Reset your password</h1>
      <p className="mt-2 text-[#64748B]">
        Enter your email and we&apos;ll send you a 6-digit code to reset your password.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Email Address</label>
          <div className="relative">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid={AUTH.forgotEmail}
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          data-testid={AUTH.forgotSubmit}
          className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {busy ? "Sending..." : "Send Reset Code"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#64748B]">
        Remembered?{" "}
        <Link to="/login" className="font-semibold text-[#2563EB] hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* Reset Password — submit code + new password                 */
/* ─────────────────────────────────────────────────────────── */

export function ResetPassword() {
  useSEO({ title: "Reset Password", description: "Set a new OraOne password." });
  const { resetPassword, forgotPassword } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    const res = await resetPassword({
      email: email.trim().toLowerCase(),
      code: code.trim(),
      new_password: password,
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Password updated. You can log in now.");
      nav("/login");
    } else {
      toast.error(res.error || "Reset failed");
    }
  };

  const resendCode = async () => {
    if (!email) {
      toast.error("Enter your email first");
      return;
    }

    setResending(true);
    const res = await forgotPassword({ email: email.trim().toLowerCase() });
    setResending(false);

    if (res.ok) {
      toast.success("A new verification code has been sent.");
    } else {
      toast.error(res.error || "Could not resend code");
    }
  };

  return (
    <div data-testid="reset-password-form">
      <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">Set a new password</h1>
      <p className="mt-2 text-[#64748B]">
        Enter the code we emailed you, and choose a strong new password.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Email</label>
          <div className="relative">
            <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="reset-email-input"
              placeholder="you@company.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Verification Code</label>
          <div className="relative">
            <KeyRound size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              required
              inputMode="numeric"
              maxLength={6}
              pattern="\d{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              data-testid="reset-code-input"
              placeholder="6-digit code"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm tracking-[0.4em] font-mono focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1.5">New Password</label>
          <div className="relative">
            <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              required
              minLength={8}
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid={AUTH.resetPassword}
              placeholder="At least 8 characters"
              className="w-full pl-10 pr-11 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              data-testid="reset-password-toggle"
              aria-label={showPw ? "Hide password" : "Show password"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
            >
              {showPw ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Confirm Password</label>
          <div className="relative">
            <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              required
              minLength={8}
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              data-testid="reset-confirm-input"
              placeholder="Confirm your new password"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E2E8F0] bg-white text-sm focus:border-[#2563EB] focus:outline-none focus:ring-4 focus:ring-[#2563EB]/10"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          data-testid={AUTH.resetSubmit}
          className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm disabled:opacity-60"
        >
          {busy ? "Saving..." : "Update Password"}
        </button>

        <button
          type="button"
          onClick={resendCode}
          disabled={resending}
          className="w-full py-3 rounded-xl border border-[#E2E8F0] text-[#0F172A] font-semibold text-sm hover:bg-[#F8FAFC] disabled:opacity-60"
        >
          {resending ? "Sending..." : "Resend Code"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#64748B]">
        Remembered?{" "}
        <Link to="/login" className="font-semibold text-[#2563EB] hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
