import { useState } from "react";

export default function AttackSim() {
  const [blocked, setBlocked] = useState(0);
  const [results, setResults] = useState([]);

  const sendAttempt = async () => {
    try {
      const token = localStorage.getItem("token");
      const resp = await fetch("http://localhost:8001/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_ip: "10.0.0.1", auth_result: "failure", with_jwt: Boolean(token) })
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setResults(r => [...r, data.status]);
      if (data.status === "blocked") {
        setBlocked(b => b + 1);
      }
    } catch (err) {
      setResults(r => [...r, "error"]);
    }
  };

  return (
    <div className="attack-sim">
      <button onClick={sendAttempt}>Send Attempt</button>
      <div className="results">
        <p>Blocked attempts: {blocked}</p>
        <ul>
          {results.map((res, idx) => (
            <li key={idx}>{res}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
