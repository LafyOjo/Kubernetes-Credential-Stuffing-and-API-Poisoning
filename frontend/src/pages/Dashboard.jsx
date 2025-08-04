// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import ScoreForm from "../ScoreForm";
import AlertsTable from "../AlertsTable";
import { apiFetch } from "../api";

function Dashboard() {
  const [ping, setPing] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const token = localStorage.getItem("token");

  useEffect(() => {
    apiFetch("/ping")
      .then((res) => res.json())
      .then((data) => setPing(data.message))
      .catch((err) => console.error("Ping failed:", err));
  }, []);

  const handleNewAlert = () => setRefresh((r) => r + 1);

  return (
    <div style={{ padding: "1rem" }}>
      <h1>APIShield+ Dashboard</h1>
      <p>Backend ping says: {ping ?? "Loading…"} </p>

      <ScoreForm token={token} onNewAlert={handleNewAlert} />

      <hr style={{ margin: "2rem 0" }} />

      <AlertsTable token={token} refresh={refresh} />
    </div>
  );
}

export default Dashboard;
