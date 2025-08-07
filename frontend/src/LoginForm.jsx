import { useState } from "react";
import { apiFetch, AUTH_TOKEN_KEY, USERNAME_KEY, logAuditEvent } from "./api";

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    try {
      const resp = await apiFetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
      localStorage.setItem(USERNAME_KEY, username);

      await fetch(`${process.env.REACT_APP_SHOP_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      await logAuditEvent({ event: "user_login_success", username }).catch(() => {});
      onLogin(data.access_token, data.policy);
    } catch (err) {
      console.error("Login failed:", err.message);
      await logAuditEvent({ event: "user_login_failure", username }).catch(() => {});
      setError(err.message || "An unexpected error occurred.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Username:
        <input value={username} onChange={e => setUsername(e.target.value)} />
      </label>
      <label>
        Password:
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      <button type="submit">Login</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
