import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useSEO } from "@/lib/seo";
import { useAuth } from "@/lib/auth";
import { Field, IconInput, PasswordInput, Checkbox } from "@/components/auth/AuthBits";
import { AuthShell, GradientButton } from "@/components/auth/AuthShell";

export default function Login() {
  useSEO({ title: "Login", description: "Sign in to your OraOne account" });
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
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
      setError(`Signed in, but we couldn't load your workspace: ${res.identityError}. Please retry in a moment.`);
      return;
    }
    nav("/app/dashboard", { replace: true });
  };

  return (
    <AuthShell cardTestId="login-form">
      <h1 className="text-center text-3xl font-extrabold tracking-tight text-[#0F172A]">Welcome Back</h1>
      <p className="mt-2 text-center text-sm text-[#64748B]">
        Sign in to continue managing your AI agents.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSignIn}>
        <Field label="Email">
          <IconInput
            icon={Mail}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            data-testid="login-email-input"
          />
        </Field>

        <Field label="Password">
          <PasswordInput
            icon={Lock}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            data-testid="login-password-input"
          />
        </Field>

        <div className="flex items-center justify-between">
          <Checkbox
            id="remember-me"
            checked={remember}
            onChange={setRemember}
            accentClass="peer-checked:border-[#2563EB] peer-checked:bg-[#2563EB] peer-focus-visible:ring-[#2563EB]/15"
            data-testid="login-remember"
          >
            Remember me
          </Checkbox>
          <Link to="/forgot-password" className="text-sm font-semibold text-[#2563EB] hover:underline">
            Forgot Password?
          </Link>
        </div>

        {error && <p className="text-sm text-[#DC2626]">{error}</p>}

        <GradientButton
          type="submit"
          busy={busy}
          busyLabel="Signing in..."
          trailingIcon={ArrowRight}
          data-testid="login-submit"
        >
          Continue
        </GradientButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#64748B]">
        New to OraOne?{" "}
        <Link to="/signup" className="font-semibold text-[#2563EB] hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
