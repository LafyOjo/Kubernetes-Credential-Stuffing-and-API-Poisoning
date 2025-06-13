import { useEffect, useState } from "react";

export default function AlertsTable({ refresh, token }) {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);

  const loadAlerts = async () => {
    try {
      const resp = await fetch("http://localhost:8001/api/alerts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error(await resp.text());
      setAlerts(await resp.json());
    } catch (err) {
      setError(err.message);
    }
  };

  // reload when component mounts or when `refresh` changes
  useEffect(() => {
    loadAlerts();
  }, [refresh]);

  if (error) return <p className="error-text">{error}</p>;
  if (alerts.length === 0) return <p>No alerts yet.</p>;

  return (
    <table className="alerts-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>IP Address</th>
          <th>Total Fails</th>
          <th>Detail</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {alerts.map(a => (
          <tr key={a.id}>
            <td>{a.id}</td>
            <td>{a.ip_address}</td>
            <td>{a.total_fails}</td>
            <td>{a.detail}</td>
            <td>{new Date(a.timestamp).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
