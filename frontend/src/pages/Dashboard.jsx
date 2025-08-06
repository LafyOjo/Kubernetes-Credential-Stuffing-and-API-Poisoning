import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import ScoreForm from "../ScoreForm";
import AlertsTable from "../AlertsTable";
import EventsTable from "../EventsTable";
import SecurityMeter from "../SecurityMeter";
import SecurityProfile from "../components/SecurityProfile";
import LoginActivity from "../components/LoginActivity";
import { apiFetch, AUTH_TOKEN_KEY } from "../api";

function Dashboard() {
  const [ping, setPing] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [activity, setActivity] = useState([]);
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
    if (role === "user" && username) {
      apiFetch(`/users/${username}/activity`)
        .then((res) => res.json())
        .then((data) => setActivity(data))
        .catch((err) => console.error("Activity fetch failed:", err));
      apiFetch(`/users/${username}/security-profile`)
        .then((res) => res.json())
        .then((data) => setSecurityProfile(data))
        .catch((err) => console.error("Profile fetch failed:", err));
    }
  }, [role, username]);

  const handleNewAlert = () => setRefresh((r) => r + 1);

  if (role === "user") {
    return (
      <div style={{ padding: "1rem" }}>
        <h1>APIShield+ Dashboard</h1>
        <p>Backend ping says: {ping ?? "Loading…"} </p>

        <SecurityMeter username={username} />
        <SecurityProfile profile={securityProfile} />
        <LoginActivity activities={activity} />
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1>APIShield+ Dashboard</h1>
      <p>Backend ping says: {ping ?? "Loading…"} </p>

      <ScoreForm token={token} onNewAlert={handleNewAlert} />

      <hr style={{ margin: "2rem 0" }} />

      <AlertsTable token={token} refresh={refresh} />
      <EventsTable />
    </div>
  );
}

export default Dashboard;
