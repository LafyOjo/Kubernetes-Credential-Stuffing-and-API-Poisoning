import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export default function SecurityToggle() {
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState(null);

  const loadState = async () => {
    try {
      const resp = await apiFetch("/api/security", { skipReauth: true });
      if (resp.ok) {
        const data = await resp.json();
        setEnabled(data.enabled);
      } else {
        throw new Error(await resp.text());
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const toggle = async () => {
    try {
      const resp = await apiFetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
        skipReauth: true,
      });
      if (resp.ok) {
        const data = await resp.json();
        setEnabled(data.enabled);
      } else {
        throw new Error(await resp.text());
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="security-toggle">
      <label>
        <input type="checkbox" checked={enabled} onChange={toggle} /> Security
        Enabled
      </label>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
