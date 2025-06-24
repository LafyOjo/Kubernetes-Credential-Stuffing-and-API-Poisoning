// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import ScoreForm from "../ScoreForm";
import AlertsTable from "../AlertsTable";

const API_BASE = process.env.REACT_APP_API_BASE || "";

function Dashboard() {
  const [ping, setPing] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/ping`)
      .then((res) => res.json())
      .then((data) => setPing(data.message))
      .catch((err) => console.error("Ping failed:", err));
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Credential‐Stuffing &amp; Alerts Dashboard</h1>
      <p>Backend ping says: {ping ?? "Loading…"} </p>

      <ScoreForm />

      <hr style={{ margin: "2rem 0" }} />

      <AlertsTable />
    </div>
  );
}

export default Dashboard;
