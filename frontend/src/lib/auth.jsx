import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { api, formatApiError, setTokens, clearTokens, getToken } from "./api";
import { logoutHostedUI } from "@/lib/cognito";

const AuthContext = createContext(null);

const IDENTITY_KEY = "oraone_identity";

function normalizeUser(profile) {
  if (!profile) return false;
  return {
    ...profile,
    id: profile.id || profile.userId || "",
    userId: profile.userId || profile.id || "",
    email: profile.email || "",
    name: profile.name || profile.full_name || "",
    full_name: profile.full_name || profile.name || "",
    role: profile.role || "owner",
  };
}

// ---------------- Identity (Phase 4) ----------------
const safeStorageGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const safeStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};
const safeStorageRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

function loadIdentityFromStorage() {
  const raw = safeStorageGet(IDENTITY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.user && parsed.organization && parsed.membership) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=out, object=in
  const [loading, setLoading] = useState(true);

  // Phase 4 — organization + membership context
  const initialIdentity = loadIdentityFromStorage();
  const [identity, setIdentity] = useState(initialIdentity); // { user, organization, membership, is_new_user } | null
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityError, setIdentityError] = useState(null);
  const identityInFlight = useRef(null);

  const clearIdentity = useCallback(() => {
    setIdentity(null);
    setIdentityError(null);
    safeStorageRemove(IDENTITY_KEY);
  }, []);

  const fetchIdentity = useCallback(async () => {
    if (!getToken()) {
      clearIdentity();
      return { ok: false, error: "Not signed in." };
    }

    if (identityInFlight.current) {
      return identityInFlight.current;
    }

    setIdentityLoading(true);
    setIdentityError(null);

    const promise = (async () => {
      try {
        const { data } = await api.get("/auth/identity");
        setIdentity(data);
        safeStorageSet(IDENTITY_KEY, JSON.stringify(data));
        return { ok: true, identity: data };
      } catch (e) {
        const msg =
          formatApiError(e?.response?.data?.detail) ||
          e?.message ||
          "Could not load your workspace.";
        setIdentityError(msg);
        return { ok: false, error: msg };
      } finally {
        setIdentityLoading(false);
        identityInFlight.current = null;
      }
    })();

    identityInFlight.current = promise;
    return promise;
  }, [clearIdentity]);

  const fetchMe = useCallback(async () => {
    if (!getToken()) {
      setUser(false);
      clearIdentity();
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get("/auth/me");
      setUser(normalizeUser(data));
      // Hydrate identity in the background; we don't block /auth/me on it.
      fetchIdentity();
    } catch {
      clearTokens();
      setUser(false);
      clearIdentity();
    } finally {
      setLoading(false);
    }
  }, [fetchIdentity, clearIdentity]);

  useEffect(() => {
    if (!getToken()) {
      setUser(false);
      clearIdentity();
      setLoading(false);
      return;
    }

    fetchMe();
  }, [fetchMe, clearIdentity]);

  const _err = (e) =>
    formatApiError(e?.response?.data?.detail) || e?.message || "Something went wrong.";

  const login = useCallback(async ({ email, password } = {}) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "");

    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, error: "Please enter both email and password." };
    }

    try {
      const { data } = await api.post("/auth/login", {
        email: normalizedEmail,
        password: normalizedPassword,
      });

      setTokens(data.access_token, data.refresh_token ?? null, { persistent: true });
      await fetchMe();
      // Block resolution on identity so the caller can redirect *only after*
      // user + organization context are ready (Phase 4 requirement #6).
      const identityResult = await fetchIdentity();
      if (!identityResult.ok) {
        return { ok: true, identityError: identityResult.error };
      }
      return { ok: true, identity: identityResult.identity };
    } catch (e) {
      return { ok: false, error: _err(e) };
    }
  }, [fetchMe, fetchIdentity]);

  const signup = useCallback(async ({ email, password, name } = {}) => {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPassword = String(password || "");
    const normalizedName = String(name || "").trim();

    if (!normalizedName) {
      return { ok: false, error: "Please enter your name." };
    }
    if (!normalizedEmail || !normalizedPassword) {
      return { ok: false, error: "Please enter email and password." };
    }

    try {
      const { data } = await api.post("/auth/signup", {
        email: normalizedEmail,
        password: normalizedPassword,
        name: normalizedName,
      });
      return {
        ok: true,
        message: data?.message || "Signup successful. Please verify your email if prompted, then log in.",
      };
    } catch (e) {
      return { ok: false, error: _err(e) };
    }
  }, []);

  const verify = useCallback(async ({ email, code }) => {
    try {
      await api.post("/auth/verify", { email, code });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: _err(e) };
    }
  }, []);

  const resend = useCallback(async ({ email }) => {
    try {
      await api.post("/auth/resend", { email });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: _err(e) };
    }
  }, []);

  const forgotPassword = useCallback(async ({ email }) => {
    try {
      await api.post("/auth/forgot-password", { email });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: _err(e) };
    }
  }, []);

  const resetPassword = useCallback(async ({ email, code, new_password }) => {
    try {
      await api.post("/auth/reset-password", { email, code, new_password });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: _err(e) };
    }
  }, []);

  const logout = useCallback(async ({ hosted = false } = {}) => {
    try {
      if (getToken()) {
        await api.post("/auth/logout");
      }
    } catch {
      // Best-effort logout; always clear local session.
    }

    clearTokens();
    setUser(false);
    clearIdentity();

    if (hosted) {
      logoutHostedUI();
    }
  }, [clearIdentity]);

  const refresh = fetchMe;
  const refreshSession = fetchMe;
  const getCurrentUser = fetchMe;
  const isAuthenticated = !!user;

  // Phase 4 — convenience accessors (read-only views into identity)
  const organization = identity?.organization || null;
  const membership = identity?.membership || null;
  const organizationId = organization?.id || null;
  const organizationName = organization?.name || null;
  const membershipRole = membership?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        // Phase 4
        identity,
        organization,
        membership,
        organizationId,
        organizationName,
        membershipRole,
        identityLoading,
        identityError,
        fetchIdentity,
        // existing
        signup,
        verify,
        resend,
        login,
        forgotPassword,
        resetPassword,
        logout,
        refresh,
        refreshSession,
        getCurrentUser,
        fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
