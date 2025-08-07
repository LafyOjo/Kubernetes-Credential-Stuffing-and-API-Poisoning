import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import ScoreForm from "../ScoreForm";
import AlertsTable from "../AlertsTable";
import EventsTable from "../EventsTable";
import SecurityMeter from "../SecurityMeter";
import SecurityProfile from "../components/SecurityProfile";
import LoginActivity from "../components/LoginActivity";
import AttackSim from "../AttackSim";
import { apiFetch, AUTH_TOKEN_KEY } from "../api";

function Dashboard() {
  const [ping, setPing] = useState(null);
  const [refresh, setRefresh] = useState(0);
  // Store per-user activity and profile information
  const [activity, setActivity] = useState({});
  const [securityProfile, setSecurityProfile] = useState({});
  // Retrieve the authentication token for API requests
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  let username = null;
  let role = null;
  if (token) {
    try {
      const decoded = jwtDecode(token);
      username = decoded.sub;
      role = decoded.role;
    } catch (err) {
      // ignore bad token
    }
  }

  useEffect(() => {
    apiFetch("/ping")
      .then((res) => res.json())
      .then((data) => setPing(data.message))
      .catch((err) => console.error("Ping failed:", err));
  }, []);

  useEffect(() => {
    async function fetchUserData(u) {
      try {
        const actRes = await apiFetch(`/users/${u}/activity`);
        if (actRes.ok) {
          const actData = await actRes.json();
          setActivity((prev) => ({ ...prev, [u]: actData }));
        }
      } catch (err) {
        console.error("Activity fetch failed:", err);
      }

      try {
        const profRes = await apiFetch(`/users/${u}/security-profile`);
        if (profRes.ok) {
          const profData = await profRes.json();
          setSecurityProfile((prev) => ({ ...prev, [u]: profData }));
        }
      } catch (err) {
        console.error("Profile fetch failed:", err);
      }
    }

    if (role === "user" && username) {
      fetchUserData(username);
    } else if (role === "admin") {
      ["alice", "ben"].forEach(fetchUserData);
    }
  }, [role, username]);

  const handleNewAlert = () => setRefresh((r) => r + 1);

  if (role === "user") {
    return (
      <div style={{ padding: "1rem" }}>
        <h1>APIShield+ Dashboard</h1>
        <p>Backend ping says: {ping ?? "Loading…"} </p>

        <SecurityMeter username={username} />
        {securityProfile[username] && (
          <SecurityProfile profile={securityProfile[username]} />
        )}
        {activity[username] && (
          <LoginActivity activities={activity[username]} />
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1>APIShield+ Dashboard</h1>
      <p>Backend ping says: {ping ?? "Loading…"} </p>

      {/* Admin overview panel */}
      <ScoreForm token={token} onNewAlert={handleNewAlert} />

      <hr style={{ margin: "2rem 0" }} />

      <AlertsTable refresh={refresh} />
      <EventsTable />

      {/* Per-user security statistics */}
      <div style={{ marginTop: "2rem" }}>
        <h2>Alice</h2>
        <SecurityMeter username="alice" />
        {securityProfile.alice && (
          <SecurityProfile profile={securityProfile.alice} />
        )}
        {activity.alice && <LoginActivity activities={activity.alice} />}

        <h2>Ben</h2>
        <SecurityMeter username="ben" />
        {securityProfile.ben && (
          <SecurityProfile profile={securityProfile.ben} />
        )}
        {activity.ben && <LoginActivity activities={activity.ben} />}
      </div>

      {/* Attack simulation section */}
      <div
        style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc" }}
      >
        <AttackSim />
      </div>
    </div>
  );
}

export default Dashboard;
