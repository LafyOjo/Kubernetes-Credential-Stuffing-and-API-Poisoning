import React, { useState, useEffect } from "react";
import { AUTH_TOKEN_KEY, USERNAME_KEY, logAuditEvent, apiFetch } from "./api";
import ScoreForm from "./ScoreForm";
import AlertsTable from "./AlertsTable";
import EventsTable from "./EventsTable";
import AlertsChart from "./AlertsChart";
import SecurityToggle from "./SecurityToggle";
import LoginForm from "./LoginForm";
import UserAccounts from "./UserAccounts";
import LoginStatus from "./LoginStatus";
import "./App.css";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const [token, setToken] = useState(localStorage.getItem(AUTH_TOKEN_KEY));
  const [selectedUser, setSelectedUser] = useState("alice");
  const [policy, setPolicy] = useState(null);
  const [attackStatus, setAttackStatus] = useState(null);
  const [cartData, setCartData] = useState(null);


  // Poll for token changes across tabs/apps
  useEffect(() => {
    const id = setInterval(() => {
      const stored = localStorage.getItem(AUTH_TOKEN_KEY);
      setToken((prev) => (prev !== stored ? stored : prev));
    }, 1000);
    return () => clearInterval(id);
  }, []);


  const handleLogout = async () => {
    const username = localStorage.getItem(USERNAME_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    await logAuditEvent("user_logout", username);
    setToken(null);
    setPolicy(null);
    setAttackStatus(null);
    setCartData(null);
  };

  // Refresh tables when auth status changes
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [token]);

  if (!token) {
    return (
      <div className="app-container">
        <h1 className="dashboard-header">Please log in</h1>
        <div className="dashboard-section">
          <LoginForm onLogin={(tok, pol) => { setToken(tok); setPolicy(pol); }} />
        </div>
      </div>
    );
  }

  const runStuffing = async () => {
    setAttackStatus("Running attack…");
    setCartData(null);
    const user = policy === "ZeroTrust" ? "ben" : "alice";
    try {
      const resp = await apiFetch("/simulate/stuffing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user }),
      });
      const data = await resp.json();
      if (data.blocked) {
        setAttackStatus("Attack Blocked by our automated systems");
      } else {
        setCartData(data.cart);
        setAttackStatus("Attack Successful! Compromised Cart:");
      }
    } catch (err) {
      setAttackStatus("Attack failed");
    }
  };

  return (
    <div className="app-container">
      {/* Dashboard title and logout */}
      <div className="header">
        <h2 className="dashboard-header">APIShield+ Dashboard</h2>
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
          {policy === "NoSecurity" && (
            <button onClick={runStuffing}>Attack Demo Shop (Alice)</button>
          )}
          {policy === "ZeroTrust" && (
            <button onClick={runStuffing}>Attack Demo Shop (Ben)</button>
          )}
          <div className="security-box">
            <SecurityToggle />
          </div>
        </div>
        {attackStatus && <p>{attackStatus}</p>}
        {cartData && <pre>{JSON.stringify(cartData, null, 2)}</pre>}
      </div>
    </div>
  );
}

export default App;

