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
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("theme-dark");
      root.classList.remove("theme-light");
    } else {
      root.classList.remove("theme-dark");
      root.classList.add("theme-light");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  function toggleTheme() {
    setIsDark((d) => !d);
  }

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
    return <LoginForm onLogin={setToken} />;
  }

  return (
    <div className="app-container stack">
      <header className="dashboard-header">
        <h1>APIShield+ Dashboard</h1>
        <div className="row">
          <button className="btn secondary" onClick={toggleTheme}>
            {isDark ? "Light mode" : "Dark mode"}
          </button>
          <button className="btn secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="card">
        <UserAccounts onSelect={setSelectedUser} />
      </section>

      <section className="card">
        <LoginStatus token={token} />
      </section>

      <section className="card">
        <ScoreForm
          token={token}
          onNewAlert={() => setRefreshKey((k) => k + 1)}
        />
      </section>

      <section className="card">
        <AlertsChart token={token} />
      </section>

      <section className="card">
        <AlertsTable refresh={refreshKey} />
      </section>

      <section className="card">
        <EventsTable />
      </section>

      <section className="card">
        <div className="attack-section">
          <AttackSim user={selectedUser} />
          <div className="security-box">
            <SecurityToggle />
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;

