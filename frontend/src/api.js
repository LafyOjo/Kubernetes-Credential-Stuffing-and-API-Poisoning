export const API_BASE = process.env.REACT_APP_API_BASE || "";

export function logout() {
  localStorage.removeItem("token");
  window.location.reload();
}

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  let resp = await fetch(url, options);
  if (
    resp.status !== 401 ||
    url.endsWith("/login") ||
    url.endsWith("/register") ||
    url.endsWith("/api/token")
  ) {
    return resp;
  }

  const pw = window.prompt("Please enter your password:");
  if (!pw) {
    logout();
    return resp;
  }

  const headers = { ...(options.headers || {}), "X-Reauth-Password": pw };
  resp = await fetch(url, { ...options, headers });
  if (resp.status === 401) {
    logout();
  }
  return resp;
}
