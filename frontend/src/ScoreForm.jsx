import { useState, useEffect } from "react";
import { apiFetch } from "./api";

const DEFAULT_THRESHOLD = 5;

export default function ScoreForm({ onNewAlert }) {
  const [ip, setIp] = useState("");
  const [result, setResult] = useState("success");
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const resp = await apiFetch("/config");
        if (resp.ok) {
          const data = await resp.json();
          if (data.fail_limit) {
            setThreshold(data.fail_limit);
          }
        }
      } catch (err) {
        // ignore config errors and keep default
        console.error("Failed to fetch config", err);
      }
    }
    fetchConfig();
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const resp = await apiFetch("/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_ip: ip, auth_result: result, with_jwt: Boolean(token) })
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      // if an alert was created, re-load the table
      if (data.fails_last_minute > threshold) {
        onNewAlert();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="score-form">
      <label>
        Client IP:
        <input
          type="text"
          placeholder="e.g. 10.0.0.1"
          value={ip}
          onChange={e => setIp(e.target.value)}
          required
        />
      </label>
      <label>
        Auth Result:
        <select
          value={result}
          onChange={e => setResult(e.target.value)}
        >
          <option value="success">success</option>
          <option value="failure">failure</option>
        </select>
      </label>
      <button type="submit">Submit to /score</button>
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
