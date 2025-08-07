import { useEffect, useState } from "react";

const WS_URL = process.env.REACT_APP_AUDIT_WS_URL || "ws://localhost:8001/api/audit/ws";

export default function AuditFeed() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.event) {
          setEvents((prev) => [data.event, ...prev].slice(0, 50));
        }
      } catch (e) {
        // ignore malformed messages
      }
    };
    return () => ws.close();
  }, []);

  if (events.length === 0) {
    return <p>No audit events yet.</p>;
  }

  return (
    <div>
      <h3>Audit Events</h3>
      <ul>
        {events.map((e, idx) => (
          <li key={idx}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
