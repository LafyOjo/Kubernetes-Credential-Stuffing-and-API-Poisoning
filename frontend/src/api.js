export const API_BASE = process.env.REACT_APP_API_BASE || "";
export const API_KEY = process.env.REACT_APP_API_KEY || "";

export function logout() {
  localStorage.removeItem("token");
  window.location.reload();
}

export function logout() {
  localStorage.removeItem("token");
  window.location.reload();
}

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = { ...(options.headers || {}) };
  const token = localStorage.getItem("token");
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
