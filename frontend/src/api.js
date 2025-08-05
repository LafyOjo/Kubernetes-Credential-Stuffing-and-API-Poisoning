// Base URL for the backend API. If unset, requests use relative paths and rely on CRA's proxy.
export const API_BASE = process.env.REACT_APP_API_BASE || "";
export const API_KEY = process.env.REACT_APP_API_KEY || "";
export const AUTH_TOKEN_KEY = "apiShieldAuthToken";
export const USERNAME_KEY = "apiShieldUsername";
export const ZERO_TRUST_ENABLED_KEY = "zeroTrustEnabled";

export async function logAuditEvent(event, username) {
  try {
    const payload = { event };
    if (username) payload.username = username;
    await apiFetch("/api/audit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Fail silently; audit logging should not disrupt UX
    console.error("audit log failed", err);
  }
}

function logout() {
  const username = localStorage.getItem(USERNAME_KEY);
  if (localStorage.getItem(AUTH_TOKEN_KEY)) {
    logAuditEvent("user_logout", username);
  }
  localStorage.removeItem(AUTH_TOKEN_KEY);
  if (username) {
    localStorage.removeItem(USERNAME_KEY);
  }
  window.location.reload();
}

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = { ...(options.headers || {}) };
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const skipAuth =
    url.endsWith("/login") ||
    url.endsWith("/register") ||
    url.endsWith("/api/token");
  if (token && !skipAuth && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const zeroTrust = localStorage.getItem(ZERO_TRUST_ENABLED_KEY) === "true";
  if (zeroTrust && API_KEY && !headers["X-API-Key"]) {
    headers["X-API-Key"] = API_KEY;
  }

  let resp = await fetch(url, { ...options, headers });
  if (resp.status !== 401 || skipAuth) {
    return resp;
  }

  const pw = window.prompt("Please enter your password:");
  if (!pw) {
    logout();
    return resp;
  }

  const retryHeaders = { ...headers, "X-Reauth-Password": pw };
  resp = await fetch(url, { ...options, headers: retryHeaders });
  if (resp.status === 401) {
    logout();
  }
  return resp;
}
