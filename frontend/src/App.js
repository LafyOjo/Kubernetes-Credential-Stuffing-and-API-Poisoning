import { useState } from "react";
import ScoreForm from "./ScoreForm";
import AlertsTable from "./AlertsTable";
import AlertsChart from "./AlertsChart";
import LoginForm from "./LoginForm";
import AttackSim from "./AttackSim";
import "./App.css";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [token, setToken] = useState(localStorage.getItem("token"));

  if (!token) {
    return (
      <div className="app-container">
        <h1 className="dashboard-header">Please log in</h1>
        <LoginForm onLogin={setToken} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <h1 className="dashboard-header">Credential-Stuffing &amp; Alerts Dashboard</h1>
      <ScoreForm onNewAlert={() => setRefreshKey(k => k + 1)} />
      <AlertsChart token={token} />
      <AlertsTable refresh={refreshKey} token={token} />
      <AttackSim />
    </div>
  );
}

export default App;
