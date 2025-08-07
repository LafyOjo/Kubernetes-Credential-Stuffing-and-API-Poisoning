import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import SecurityMeter from "../SecurityMeter";
import LoginActivity from "../components/LoginActivity";
import { apiFetch, AUTH_TOKEN_KEY } from "../api";

function Dashboard() {
  const [ping, setPing] = useState(null);
  const [activity, setActivity] = useState([]);
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  let username = null;
  if (token) {
    try {
      const decoded = jwtDecode(token);
      username = decoded.sub;
    } catch {
      // ignore decoding errors
    }
  }

  useEffect(() => {
    apiFetch("/ping")
      .then((res) => res.json())
      .then((data) => setPing(data.message))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!username) return;
    apiFetch(`/users/${username}/activity`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setActivity(data))
      .catch(() => {});
  }, [username]);

  return (
    <div style={{ padding: "1rem" }}>
      <h1>APIShield+ Dashboard</h1>
      <p>Backend ping says: {ping ?? "Loading…"} </p>
      {username && <SecurityMeter username={username} />}
      {activity.length > 0 && <LoginActivity activities={activity} />}
    </div>
  );
}

export default Dashboard;
