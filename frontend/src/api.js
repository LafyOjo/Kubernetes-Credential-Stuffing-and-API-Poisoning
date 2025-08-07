export const AUTH_TOKEN_KEY = 'apiShieldAuthToken';
const API_BASE_URL = 'http://127.0.0.1:8001'; // Or use process.env.REACT_APP_API_URL

export function apiFetch(path, options = {}) {
  // 1. Get the token from localStorage on EVERY request.
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  // 2. Create the headers object, including any custom headers.
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 3. If the token exists, add the Authorization header.
  //    This is the crucial step that was missing.
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const finalOptions = {
    ...options,
    headers,
  };

  // 4. Make the fetch call with the correct headers.
  return fetch(`${API_BASE_URL}${path}`, finalOptions)
    .then(async (res) => {
      if (!res.ok) {
        // If the server returns an error, try to parse it and throw a proper error.
        const errorData = await res.json().catch(() => ({}));
        const error = new Error(errorData.detail || `Request failed with status ${res.status}`);
        error.status = res.status;
        throw error;
      }
      return res;
    });
}

// Helper function for logging events, which now also uses the authenticated apiFetch.
export function logAuditEvent(event) {
  return apiFetch('/api/audit/log', {
    method: 'POST',
    body: JSON.stringify(event),
  });
}

