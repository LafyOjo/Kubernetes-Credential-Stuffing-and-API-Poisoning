import { useEffect, useState } from "react";

function getWsUrl() {
  if (process.env.REACT_APP_AUDIT_WS_URL) {
    return process.env.REACT_APP_AUDIT_WS_URL;
  }
  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname;
    return `${proto}://${host}:8001/api/audit/ws`;
  }
  return "ws://localhost:8001/api/audit/ws";
}

export default function AuditFeed() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    const ws = new WebSocket(getWsUrl());
    ws.onopen = () => setStatus("open");
    ws.onerror = () => setStatus("error");
    ws.onclose = () => setStatus((s) => (s === "error" ? "error" : "closed"));
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        if (data.event) {
          setEvents((prev) => [data.event, ...prev].slice(0, 50));
        }
      } catch (_) {
        // ignore malformed messages
      }
    };
    return () => ws.close();
  }, []);

  if (status === "connecting") {
    return <p>Connecting to audit feed...</p>;
  }
  if (status === "error") {
    return <p>Audit feed connection failed.</p>;
  }
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