import { useState, useEffect } from "react";
import { apiFetch } from "./api";

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
        body: JSON.stringify({ username, password })
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      localStorage.setItem("token", data.access_token);
      onLogin(data.access_token);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const autoUser = process.env.REACT_APP_AUTO_USER;
    const autoPass = process.env.REACT_APP_AUTO_PASS;
    if (autoUser && autoPass && !localStorage.getItem("token")) {
      setUsername(autoUser);
      setPassword(autoPass);
      (async () => {
        try {
          const resp = await apiFetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: autoUser, password: autoPass })
          });
          if (!resp.ok) throw new Error(await resp.text());
          const data = await resp.json();
          localStorage.setItem("token", data.access_token);
          onLogin(data.access_token);
        } catch (err) {
          setError(err.message);
        }
      })();
    }
  }, [onLogin]);

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
