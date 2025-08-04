import { useState } from "react";
import ScoreForm from "./ScoreForm";
import AlertsTable from "./AlertsTable";
import EventsTable from "./EventsTable";
import ShopIframe from "./ShopIframe";
import AlertsChart from "./AlertsChart";
import SecurityToggle from "./SecurityToggle";
import LoginForm from "./LoginForm";
import AttackSim from "./AttackSim";
import UserAccounts from "./UserAccounts";
import LoginStatus from "./LoginStatus";
import "./App.css";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [selectedUser, setSelectedUser] = useState("alice");

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
      <UserAccounts onSelect={setSelectedUser} />
      <LoginStatus token={token} />
      <ScoreForm token={token} onNewAlert={() => setRefreshKey(k => k + 1)} />
      <AlertsChart token={token} />
      <AlertsTable refresh={refreshKey} token={token} />
      <EventsTable token={token} />
      <ShopIframe />
      <div className="attack-section">
        <AttackSim user={selectedUser} />
        <div className="security-box">
          <SecurityToggle />
        </div>
      </div>
    </div>
  );
}

export default App;
