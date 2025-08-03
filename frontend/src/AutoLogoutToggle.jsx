import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export default function AutoLogoutToggle() {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState(null);

  const loadState = async () => {
    try {
      const resp = await apiFetch("/api/security");
      if (resp.ok) {
        const data = await resp.json();
        setEnabled(data.logout_on_compromise);
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
        body: JSON.stringify({ logout_on_compromise: !enabled })
      });
      if (resp.ok) {
        const data = await resp.json();
        setEnabled(data.logout_on_compromise);
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
        <input type="checkbox" checked={enabled} onChange={toggle} /> Auto Logout on
        Hack
      </label>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
