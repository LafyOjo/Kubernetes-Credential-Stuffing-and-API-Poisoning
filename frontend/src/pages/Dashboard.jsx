// frontend/src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import ScoreForm from "../ScoreForm";
import AlertsTable from "../AlertsTable";
import AuthEventsTable from "../AuthEventsTable";
import { apiFetch, AUTH_TOKEN_KEY } from "../api";

function Dashboard() {
  const [ping, setPing] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  useEffect(() => {
    apiFetch("/ping", { skipReauth: true })
      .then((res) => res.json())
      .then((data) => setPing(data.message))
      .catch((err) => console.error("Ping failed:", err));
  }, []);

  const handleNewAlert = () => setRefresh((r) => r + 1);

  return (
    <div className="container stack">
      <header className="dashboard-header">
        <h1>APIShield+ Dashboard</h1>
        <p className="subtle">Backend ping says: {ping ?? "Loading…"} </p>
      </header>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Risk Scoring</div>
        </div>
        <ScoreForm token={token} onNewAlert={handleNewAlert} />
      </section>

      <section className="card">
        <div className="card-header">
          <div className="card-title">Alerts</div>
        </div>
        <AlertsTable token={token} refresh={refresh} tableClassName="table" />
      </section>

      {/* If you added AuthEventsTable previously */}
      <section className="card">
        <div className="card-header">
          <div className="card-title">Recent Auth Activity</div>
        </div>
        <AuthEventsTable refresh={refresh} />
      </section>
    </div>
  );
}

export default Dashboard;
