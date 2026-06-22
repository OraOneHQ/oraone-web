import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { setTokens } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/marketing/Logo";
import { exchangeCodeForSession } from "@/lib/cognito";

export default function AuthCallback() {
  const nav = useNavigate();
  const location = useLocation();
  const { fetchMe, fetchIdentity } = useAuth();

  const [errorMsg, setErrorMsg] = useState(null);
  const exchanged = useRef(false); // guard against double-execution in StrictMode

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const oauthError = params.get("error");
    const oauthErrorDesc = params.get("error_description");

    // --- OAuth error returned by Cognito ---
    if (oauthError) {
      setErrorMsg(oauthErrorDesc || oauthError);
      return;
    }

    // --- Path 1: authorization code present — exchange manually ---
    if (code && !exchanged.current) {
      exchanged.current = true;

      (async () => {
        try {
          const tokens = await exchangeCodeForSession(code);
          setTokens(tokens.access_token, tokens.refresh_token ?? null, { persistent: true });
          // Clean the ?code= from the URL immediately
          window.history.replaceState({}, document.title, window.location.pathname);
          await fetchMe();
          // Block redirect on identity hydration (Phase 4 requirement #6).
          const identityResult = await fetchIdentity();
          if (!identityResult.ok) {
            setErrorMsg(
              `Signed in, but we couldn't load your workspace: ${identityResult.error}`
            );
            return;
          }
          nav("/app/overview", { replace: true });
        } catch (e) {
          setErrorMsg(e.message || "Authentication failed. Please try again.");
        }
      })();
      return;
    }

    // No code and no oauth error -> invalid callback request
    if (!code) {
      setErrorMsg("Missing authorization code in callback URL.");
    }
  }, [location.search, fetchMe, fetchIdentity, nav]);

  // --- Error state ---
  if (errorMsg) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF] p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-premium border border-[#E2E8F0] p-8 text-center space-y-5">
          <div className="flex justify-center">
            <Logo className="h-9 w-auto" />
          </div>
          <div className="w-12 h-12 mx-auto rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Authentication failed</h1>
            <p className="mt-2 text-sm text-[#64748B] leading-relaxed">{errorMsg}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => nav("/login", { replace: true })}
              className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors"
            >
              Back to Login
            </button>
            <button
              onClick={() => nav("/", { replace: true })}
              className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#0F172A] text-sm font-semibold transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Loading / in-progress state ---
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#F8FAFC] to-[#EFF6FF]">
      <div className="flex flex-col items-center gap-6">
        <Logo className="h-9 w-auto" />
        <div className="relative w-12 h-12">
          <svg
            className="w-12 h-12 animate-spin text-[#2563EB]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-20"
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#0F172A]">Signing you in…</p>
          <p className="mt-1 text-xs text-[#94A3B8]">Verifying your credentials with Cognito</p>
        </div>
      </div>
    </div>
  );
}
