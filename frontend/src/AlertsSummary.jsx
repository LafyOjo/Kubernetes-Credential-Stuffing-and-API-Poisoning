import { useEffect, useState } from "react";
import { apiFetch } from "./api";

export default function AlertsSummary({ token, refresh }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const resp = await apiFetch("/api/alerts/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(await resp.text());
      setData(await resp.json());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  if (error) return <p className="error-text">{error}</p>;
  if (!data) return <p>Loading...</p>;

  return (
    <div className="alerts-summary">
      <p>Total Attempts: {data.total}</p>
      <p>Wrong Password Attempts: {data.wrong_password}</p>
      <p>Blocked Attempts: {data.blocked}</p>
      <p>Credential Stuffing Detections: {data.credential_stuffing}</p>
    </div>
  );
}
