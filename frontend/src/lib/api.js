import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";
export const API_BASE = `${BACKEND_URL}/api`;

const ACCESS_KEY = "oraone_access_token";
const REFRESH_KEY = "oraone_refresh_token";
const PERSIST_KEY = "oraone_auth_persistent";

const safeGet = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (storage, key, value) => {
  try {
    storage.setItem(key, value);
  } catch {
    // ignore storage write failures
  }
};

const safeRemove = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {
    // ignore storage failures
  }
};

export const getToken = () => {
  return safeGet(sessionStorage, ACCESS_KEY) || safeGet(localStorage, ACCESS_KEY);
};

export const getRefreshToken = () => {
  return safeGet(sessionStorage, REFRESH_KEY) || safeGet(localStorage, REFRESH_KEY);
};

export const isPersistentSession = () => safeGet(localStorage, PERSIST_KEY) === "1";

export const setTokens = (access, refresh, { persistent = true } = {}) => {
  const target = persistent ? localStorage : sessionStorage;
  const alternate = persistent ? sessionStorage : localStorage;
  safeSet(target, PERSIST_KEY, persistent ? "1" : "0");
  safeRemove(alternate, ACCESS_KEY);
  safeRemove(alternate, REFRESH_KEY);
  if (access) safeSet(target, ACCESS_KEY, access);
  if (refresh) safeSet(target, REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  safeRemove(localStorage, ACCESS_KEY);
  safeRemove(localStorage, REFRESH_KEY);
  safeRemove(localStorage, PERSIST_KEY);
  safeRemove(sessionStorage, ACCESS_KEY);
  safeRemove(sessionStorage, REFRESH_KEY);
  safeRemove(sessionStorage, PERSIST_KEY);
};

export const api = axios.create({
  baseURL: API_BASE,
  // Bearer-token auth — no need for cross-origin cookies. Avoids CORS
  // credentials issues when the ingress/CDN rewrites Access-Control-Allow-Origin.
  headers: { "Content-Type": "application/json" },
});

// Attach Authorization header on every request when we have a token.
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

let refreshInFlight = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;

    if (status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshInFlight) {
        refreshInFlight = axios
          .post(
            `${API_BASE}/auth/refresh`,
            { refresh_token: refreshToken },
            { headers: { "Content-Type": "application/json" } }
          )
          .then(({ data }) => {
            setTokens(data.access_token, data.refresh_token || refreshToken, {
              persistent: isPersistentSession(),
            });
            return data.access_token;
          })
          .finally(() => {
            refreshInFlight = null;
          });
      }

      const newAccessToken = await refreshInFlight;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(original);
    } catch {
      clearTokens();
      return Promise.reject(error);
    }
  }
);

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
