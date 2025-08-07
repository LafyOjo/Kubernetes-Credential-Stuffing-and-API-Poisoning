import React, { useState, useEffect, useContext } from "react";
import { AUTH_TOKEN_KEY, USERNAME_KEY, logAuditEvent, apiFetch } from "./api";
import ScoreForm from "./ScoreForm";
import AlertsTable from "./AlertsTable";
import EventsTable from "./EventsTable";
import AlertsChart from "./AlertsChart";
import SecurityToggle from "./SecurityToggle";
import SecurityMeter from "./SecurityMeter";
import LoginForm from "./LoginForm";
import UserAccounts from "./UserAccounts";
import LoginStatus from "./LoginStatus";
import { AuthContext } from "./AuthContext";
import  jwtDecode  from "jwt-decode";
import AuditFeed from "./AuditFeed";
import "./App.css";
import "./Dashboard.css";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const [token, setToken] = useState(localStorage.getItem(AUTH_TOKEN_KEY));
  const [selectedUser, setSelectedUser] = useState("alice");
  const [zeroTrustEnabled, setZeroTrustEnabled] = useState(null);
  const [attackStatus, setAttackStatus] = useState(null);
  const [compromisedData, setCompromisedData] = useState(null);
  const [adminTarget, setAdminTarget] = useState("alice");
  const [adminResults, setAdminResults] = useState(null);
  const { user, setUser } = useContext(AuthContext);


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
    if (username) {
      await logAuditEvent({ event: "user_logout", username }).catch(() => {});
    }
    setToken(null);
    setZeroTrustEnabled(null);
    setAttackStatus(null);
    setCompromisedData(null);
    setUser(null);
  };

  // Refresh tables and decode user info when auth status changes
  useEffect(() => {
    setRefreshKey((k) => k + 1);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ username: decoded.sub, role: decoded.role });
      } catch (err) {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [token, setUser]);

  if (!token) {
    return (
      <div className="app-container">
        <h1 className="dashboard-header">Please log in</h1>
        <div className="dashboard-container">
          <div className="dashboard-card">
            <LoginForm
              onLogin={(tok, pol) => {
                setToken(tok);
                setZeroTrustEnabled(pol === "ZeroTrust");
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="app-container">
        <div className="header">
          <h2 className="dashboard-header">APIShield+ Dashboard</h2>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <div className="dashboard-container">
          {user && user.username === "alice" && (
            <div className="dashboard-card">
              <h2>Alice’s Security Status</h2>
              <SecurityMeter username="alice" />
            </div>
          )}
          {user && user.username === "ben" && (
            <div className="dashboard-card">
              <h2>Ben’s Security Status</h2>
              <SecurityMeter username="ben" />
            </div>
          )}
        </div>
      </div>
    );
  }

  const runDemoShopAttack = async () => {
    setAttackStatus("Running attack…");
    setCompromisedData(null);
    const user = zeroTrustEnabled ? "ben" : "alice";
    try {
      const resp = await apiFetch("/simulate/demo-shop-attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user }),
      });
      const data = await resp.json();
      if (data.blocked) {
        setAttackStatus(
          data.detail || "Attack Blocked by our automated systems"
        );
      } else {
        let activity = [];
        try {
          const actResp = await apiFetch(`/api/audit/activity/${user}`);
          if (actResp.ok) {
            activity = await actResp.json();
          }
        } catch (err) {
          // ignore
        }
        setCompromisedData({ cart: data.cart, activity });
        setAttackStatus("Attack Successful! Compromised Data:");
      }
    } catch (err) {
      setAttackStatus("Attack failed");
    }
  };

  async function runAdminAttack() {
    setAdminResults(null);
    try {
      const res = await apiFetch("/simulate/admin-attack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: adminTarget, attempts: 50 }),
      });
      const data = await res.json();
      setAdminResults(data);
    } catch (err) {
      setAdminResults({ summary: "Attack failed" });
    }
  }

  return (
    <div className="app-container">
      {/* Dashboard title and logout */}
      <div className="header">
        <h2 className="dashboard-header">APIShield+ Dashboard</h2>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>
      <div className="dashboard-container">
        <div className="dashboard-card">
          <UserAccounts onSelect={setSelectedUser} />
        </div>
        <div className="dashboard-card">
          <LoginStatus token={token} />
        </div>
        <div className="dashboard-card">
          <ScoreForm
            token={token}
            onNewAlert={() => setRefreshKey((k) => k + 1)}
          />
        </div>
        <div className="dashboard-card">
          <AlertsChart token={token} />
        </div>
        <div className="dashboard-card">
          <AlertsTable refresh={refreshKey} token={token} />
        </div>
        <div className="dashboard-card">
          <EventsTable token={token} />
        </div>
        <div className="dashboard-card">
          <AuditFeed />
        </div>
        <div className="dashboard-card">
          <h2>Alice’s Security Status</h2>
          <SecurityMeter username="alice" />
        </div>
        <div className="dashboard-card">
          <h2>Ben’s Security Status</h2>
          <SecurityMeter username="ben" />
        </div>
        <div className="dashboard-card">
          <div className="attack-section">
            {zeroTrustEnabled === false && (
              <button onClick={runDemoShopAttack}>Attack Demo Shop (Alice)</button>
            )}
            {zeroTrustEnabled === true && (
              <button onClick={runDemoShopAttack}>Attack Demo Shop (Ben)</button>
            )}
            <div className="security-box">
              <SecurityToggle forcedState={zeroTrustEnabled} />
            </div>
          </div>
          {attackStatus && <p>{attackStatus}</p>}
          {compromisedData && (
            <div>
              <h4>Compromised Data</h4>
              <div>
                <h5>Audit Log</h5>
                <ul>
                  {compromisedData.activity.map((a) => (
                    <li key={a.id}>
                      {a.event} - {a.timestamp}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>Cart</h5>
                <pre>{JSON.stringify(compromisedData.cart, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
        <div className="dashboard-card">
          <div className="attack-controls">
            <span>Target: </span>
            <select
              value={adminTarget}
              onChange={(e) => setAdminTarget(e.target.value)}
            >
              <option value="alice">Alice (Weak Policy)</option>
              <option value="ben">Ben (Strong Policy)</option>
            </select>
            <button onClick={runAdminAttack}>Launch Attack</button>
          </div>
          {adminResults && (
            <div>
              <div>Summary: {adminResults.summary}</div>
              {adminResults.compromisedData && (
                <div>
                  <div>
                    <h5>Audit Log</h5>
                    <ul>
                      {adminResults.compromisedData.activity.map((a, idx) => (
                        <li key={idx}>
                          {a.event} - {a.timestamp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5>Cart</h5>
                    <pre>
                      {JSON.stringify(adminResults.compromisedData.cart, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

