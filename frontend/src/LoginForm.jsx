import { useState } from "react";
import { apiFetch, TOKEN_KEY, USERNAME_KEY, logAuditEvent } from "./api";

export default function LoginForm({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    try {
      const resp = await apiFetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        skipReauth: true,
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USERNAME_KEY, username);
      await logAuditEvent("user_login_success", username);
      onLogin(data.access_token);
    } catch (err) {
      await logAuditEvent("user_login_failure", username);
      setError(err.message);
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
        <input
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPassword(sp => !sp)}
          style={{ marginLeft: "0.5rem" }}
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </label>
      <button type="submit">Login</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
