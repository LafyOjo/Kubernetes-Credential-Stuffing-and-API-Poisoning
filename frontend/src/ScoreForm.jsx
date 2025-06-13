import { useState } from "react";

const ALERT_THRESHOLD = 5;

export default function ScoreForm({ onNewAlert }) {
  const [ip, setIp] = useState("");
  const [result, setResult] = useState("success");
  const [error, setError] = useState(null);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    try {
      const resp = await fetch("http://localhost:8001/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_ip: ip, auth_result: result })
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      // if an alert was created, re-load the table
      if (data.fails_last_minute > ALERT_THRESHOLD) {
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
