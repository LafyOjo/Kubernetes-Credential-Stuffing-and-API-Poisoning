import { useEffect, useState } from "react";
import { apiFetch, ZERO_TRUST_ENABLED_KEY } from "./api";

export default function SecurityToggle({ forcedState = null }) {
  const [enabled, setEnabled] = useState(forcedState ?? true);
  const [error, setError] = useState(null);

  const loadState = async () => {
    try {
      const resp = await apiFetch("/api/security");
      if (resp.ok) {
        const data = await resp.json();
        setEnabled(data.enabled);
        localStorage.setItem(
          ZERO_TRUST_ENABLED_KEY,
          data.enabled ? "true" : "false"
        );
      } else {
        throw new Error(await resp.text());
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (forcedState === null) {
      loadState();
    } else {
      setEnabled(forcedState);
      localStorage.setItem(
        ZERO_TRUST_ENABLED_KEY,
        forcedState ? "true" : "false"
      );
    }
  }, [forcedState]);

  const toggle = async () => {
    try {
      const resp = await apiFetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled })
      });
      if (resp.ok) {
        const data = await resp.json();
        setEnabled(data.enabled);
        localStorage.setItem(
          ZERO_TRUST_ENABLED_KEY,
          data.enabled ? "true" : "false"
        );
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
        <input type="checkbox" checked={enabled} onChange={toggle} /> Zero Trust
        Enabled
      </label>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
