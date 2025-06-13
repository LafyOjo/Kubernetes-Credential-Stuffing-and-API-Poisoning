import React, { useState } from "react";

const DUMMY_PASSWORDS = [
  "wrongpass",
  "123456",
  "password1",
  "secret",
  "letmein",
];

export default function AttackSim() {
  const [targetUser, setTargetUser] = useState("alice");
  const [attemptsInput, setAttemptsInput] = useState(20);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const simulateAttack = async () => {
    setRunning(true);
    setResults(null);
    let successes = 0;
    let blocked = 0;
    let firstAttempt = null;
    let firstTime = null;
    let firstInfo = null;

    const start = performance.now();

    for (let i = 0; i < attemptsInput; i++) {
      const pwd = DUMMY_PASSWORDS[i % DUMMY_PASSWORDS.length];
      let loginOk = false;
      let token = null;
      try {
        const resp = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: targetUser, password: pwd }),
        });
        loginOk = resp.ok;
        if (loginOk) {
          const data = await resp.json();
          token = data.access_token;
        }
      } catch (err) {
        console.error("Login error", err);
      }

      try {
        await fetch("/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_ip: "10.0.0.1",
            auth_result: loginOk ? "success" : "failure",
          }),
        });
      } catch (err) {
        console.error("Score error", err);
      }

      if (loginOk) {
        successes++;
        if (firstAttempt === null) {
          firstAttempt = i + 1;
          firstTime = (performance.now() - start) / 1000;
          if (token) {
            try {
              const infoResp = await fetch("/api/me", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (infoResp.ok) {
                firstInfo = await infoResp.json();
              }
            } catch (err) {
              console.error("Info error", err);
            }
          }
        }
      }

      setResults({
        attempts: i + 1,
        successes,
        blocked,
        first_success_attempt: firstAttempt,
        first_success_time: firstTime,
        first_user_info: firstInfo,
      });

      await new Promise((res) => setTimeout(res, 100));
    }

    const totalTime = (performance.now() - start) / 1000;
    setResults((r) => ({ ...r, total_time: totalTime }));
    setRunning(false);
  };

  return (
    <div className="attack-sim">
      <h2>Credential Stuffing Simulation</h2>
      <div className="attack-controls">
        <label>
          Target User:
          <input
            value={targetUser}
            onChange={(e) => setTargetUser(e.target.value)}
          />
        </label>
        <label>
          Attempts:
          <input
            type="number"
            min="1"
            value={attemptsInput}
            onChange={(e) => setAttemptsInput(parseInt(e.target.value, 10))}
          />
        </label>
        <button onClick={simulateAttack} disabled={running}>
          {running ? "Running..." : "Start Attack"}
        </button>
      </div>
      {results && (
        <div className="attack-results">
          <p>Total Attempts: {results.attempts}</p>
          <p>Successful Logins: {results.successes}</p>
          {results.first_success_attempt && (
            <>
              <p>
                First Success: attempt {results.first_success_attempt} (in{' '}
                {results.first_success_time?.toFixed(2)}s)
              </p>
              {results.first_user_info && (
                <p>
                  User Info:{' '}
                  <code>{JSON.stringify(results.first_user_info)}</code>
                </p>
              )}
            </>
          )}
          {results.total_time && (
            <p>Total Time: {results.total_time.toFixed(2)}s</p>
          )}
        </div>
      )}
    </div>
  );
}

