export const API_BASE =
  process.env.REACT_APP_API_BASE || window.location.origin;
export const API_KEY = process.env.REACT_APP_API_KEY || "";
export const AUTH_TOKEN_KEY = "apiShieldAuthToken";

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
export const TOKEN_KEY = "apiShieldAuthToken";

export function logout() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    fetch(`${API_BASE}/api/audit/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ event: "user_logout" }),
    }).catch(() => {});
  }
  localStorage.removeItem(TOKEN_KEY);
  window.location.reload();
}

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = { ...(options.headers || {}) };
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  const skipAuth =
    url.endsWith("/login") || url.endsWith("/register") || url.endsWith("/api/token");
  if (token && !skipAuth && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (API_KEY && !headers["X-API-Key"]) {
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

export async function logAuditEvent(event) {
  try {
    await apiFetch("/api/audit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    });
  } catch (err) {
    // Fail silently; audit logging should not disrupt UX
    console.error("audit log failed", err);
  }
}
