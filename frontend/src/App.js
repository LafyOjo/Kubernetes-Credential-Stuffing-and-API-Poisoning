import { useState } from "react";
import ScoreForm from "./ScoreForm";
import AlertsTable from "./AlertsTable";
import AlertsChart from "./AlertsChart";
import SecurityToggle from "./SecurityToggle";
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
      <h1 className="dashboard-header">APIShield+ Dashboard</h1>
      <ScoreForm onNewAlert={() => setRefreshKey(k => k + 1)} />
      <AlertsChart token={token} />
      <AlertsTable refresh={refreshKey} token={token} />
      <div className="attack-section">
        <AttackSim />
        <div className="security-box">
          <SecurityToggle />
        </div>
      </div>
    </div>
  );
}

export default App;
