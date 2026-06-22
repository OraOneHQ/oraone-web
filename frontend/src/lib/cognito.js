import { api, clearTokens } from "@/lib/api";

const COGNITO_DOMAIN = (
  process.env.REACT_APP_COGNITO_DOMAIN
  || "https://ap-south-2hbzhcgsk9.auth.ap-south-2.amazoncognito.com"
).replace(/\/+$/, "");

const CLIENT_ID = process.env.REACT_APP_COGNITO_CLIENT_ID || "2v4a1aufa8cqkvc09963ols01a";
const REDIRECT_URI = process.env.REACT_APP_COGNITO_REDIRECT_URI || "http://localhost:3000/auth/callback";
const LOGOUT_URI = process.env.REACT_APP_COGNITO_LOGOUT_URI || "http://localhost:3000/login";

function buildAuthorizeUrl(mode = "login") {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid email profile",
  });

  if (mode === "signup") {
    params.set("screen_hint", "signup");
  }

  return `${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

export function loginWithHostedUI(mode = "login") {
  window.location.assign(buildAuthorizeUrl(mode));
}

export function buildLogoutUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: LOGOUT_URI,
  });
  return `${COGNITO_DOMAIN}/logout?${params.toString()}`;
}

export function logoutHostedUI() {
  clearTokens();
  window.location.assign(buildLogoutUrl());
}

export async function exchangeCodeForSession(code) {
  const { data } = await api.post("/auth/exchange", {
    code,
    redirect_uri: REDIRECT_URI,
  });
  return data;
}
