import { useState, useEffect } from "react";
import { AUTH_TOKEN_KEY, USERNAME_KEY, logAuditEvent } from "./api";
import ScoreForm from "./ScoreForm";
import AlertsTable from "./AlertsTable";
import EventsTable from "./EventsTable";
import AlertsChart from "./AlertsChart";
import SecurityToggle from "./SecurityToggle";
import LoginForm from "./LoginForm";
import AttackSim from "./AttackSim";
import UserAccounts from "./UserAccounts";
import LoginStatus from "./LoginStatus";
import "./App.css";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const [token, setToken] = useState(localStorage.getItem(AUTH_TOKEN_KEY));
  const [selectedUser, setSelectedUser] = useState("alice");

  const handleLogout = async () => {
    const username = localStorage.getItem(USERNAME_KEY);
    await logAuditEvent("user_logout", username);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    if (username) {
      localStorage.removeItem(USERNAME_KEY);
    }
    setToken(null);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const current = localStorage.getItem(AUTH_TOKEN_KEY);
      setToken((prev) => (prev === current ? prev : current));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Refresh tables when auth status changes
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [token]);

  if (!token) {
    return (
      <div className="app-container">
        <h1 className="dashboard-header">Please log in</h1>
        <div className="dashboard-section">
          <LoginForm onLogin={setToken} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Dashboard title and logout */}
      <div className="header">
        <h1 className="dashboard-header">APIShield+ Dashboard</h1>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>
      <div className="dashboard-section">
        <UserAccounts onSelect={setSelectedUser} />
      </div>
      <div className="dashboard-section">
        <LoginStatus token={token} />
      </div>
      <div className="dashboard-section">
        <ScoreForm
          token={token}
          onNewAlert={() => setRefreshKey((k) => k + 1)}
        />
      </div>
      <div className="dashboard-section">
        <AlertsChart token={token} />
      </div>
      <div className="dashboard-section">
        <AlertsTable refresh={refreshKey} token={token} />
      </div>
      <div className="dashboard-section">
        <EventsTable token={token} />
      </div>
      <div className="dashboard-section">
        <div className="attack-section">
          <AttackSim user={selectedUser} />
          <div className="security-box">
            <SecurityToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

