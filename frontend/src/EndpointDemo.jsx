import React, { useState } from "react";
import { apiFetch, API_BASE } from "./api";

export default function EndpointDemo({ token }) {
  const [protectedData, setProtectedData] = useState("Not fetched");
  const [unprotectedData, setUnprotectedData] = useState("Not fetched");
  const [msg, setMsg] = useState("");

  const fetchProtected = async () => {
    setMsg("");
    try {
      const resp = await apiFetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setProtectedData(JSON.stringify(data));
      setMsg("Fetched protected data");
    } catch (err) {
      setMsg(err.message);
      setProtectedData("Error");
    }
  };

  const fetchUnprotected = async () => {
    setMsg("");
    try {
      const resp = await fetch(`${API_BASE}/ping`);
      const data = await resp.json();
      setUnprotectedData(JSON.stringify(data));
      setMsg("Fetched unprotected data");
    } catch (err) {
      setMsg(err.message);
      setUnprotectedData("Error");
    }
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <h3>API Endpoint Demo</h3>
      <button onClick={fetchProtected} disabled={!token}>Fetch Protected</button>
      <button onClick={fetchUnprotected} style={{ marginLeft: "0.5rem" }}>Fetch Unprotected</button>
      {msg && <p>{msg}</p>}
      <div style={{ display: "flex", gap: "1rem" }}>
        <div>
          <h4>Protected Data</h4>
          <pre>{protectedData}</pre>
        </div>
        <div>
          <h4>Unprotected Data</h4>
          <pre>{unprotectedData}</pre>
        </div>
      </div>
    </div>
  );
}
