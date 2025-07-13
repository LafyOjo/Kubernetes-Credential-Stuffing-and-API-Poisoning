export const API_BASE = process.env.REACT_APP_API_BASE || "";

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  let resp = await fetch(url, options);
  if (resp.status !== 401) {
    return resp;
  }
  const pw = window.prompt("Please enter your password:");
  if (!pw) {
    return resp;
  }
  const headers = { ...(options.headers || {}), "X-Reauth-Password": pw };
  resp = await fetch(url, { ...options, headers });
  return resp;
}
