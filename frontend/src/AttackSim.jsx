import React, { useState, useEffect, useRef } from "react";
import { USER_DATA } from "./UserAccounts";
import { apiFetch, API_BASE, AUTH_TOKEN_KEY } from "./api";
import AlertsChart from "./AlertsChart";
const SHOP_URL = process.env.REACT_APP_SHOP_URL || "http://localhost:3005";

const DUMMY_PASSWORDS = [
  "wrongpass",
  "123456",
  "password1",
  "secret",
  "letmein",
];

export default function AttackSim({ user, token }) {
  const [targetUser, setTargetUser] = useState(user || "alice");

  useEffect(() => {
    if (user) {
      setTargetUser(user);
    }
  }, [user]);

  useEffect(() => {
    async function setupDemoUsers() {
      for (const [name, info] of Object.entries(USER_DATA)) {
        try {
          await apiFetch("/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: name, password: info.password }),
          });
          await fetch(`${SHOP_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: name, password: info.password }),
          });
        } catch (err) {
          // ignore errors (likely already registered)
        }
      }

      try {
        const strict = await apiFetch("/api/policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            failed_attempts_limit: 3,
            mfa_required: true,
            geo_fencing_enabled: true,
          }),
        });
        const lenient = await apiFetch("/api/policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            failed_attempts_limit: 10,
            mfa_required: false,
            geo_fencing_enabled: false,
          }),
        });
        if (strict.ok) {
          const sData = await strict.json();
          await apiFetch(`/api/users/ben/policy/${sData.id}`, { method: "POST" });
        }
        if (lenient.ok) {
          const lData = await lenient.json();
          await apiFetch(`/api/users/alice/policy/${lData.id}`, { method: "POST" });
        }
      } catch (err) {
        console.error("policy setup error", err);
      }
    }
    setupDemoUsers();
  }, []);

  const [attemptsInput, setAttemptsInput] = useState(20);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [chainToken, setChainToken] = useState(null);
  const chainRef = useRef(null);

  const fetchChainToken = async () => {
    try {
      const resp = await apiFetch("/api/security/chain");
      if (resp.ok) {
        const data = await resp.json();
        setChainToken(data.chain);
        chainRef.current = data.chain;
        return data.chain;
      }
    } catch (err) {
      console.error("Chain fetch error", err);
    }
    return null;
  };

  const simulateAttack = async () => {
    setRunning(true);
    setResults(null);
    setError(null);
    setChainToken(null);
    chainRef.current = null;
    let securityEnabled = false;
    try {
      const secResp = await apiFetch("/api/security");
      if (secResp.ok) {
        const data = await secResp.json();
        securityEnabled = data.enabled;
        if (securityEnabled) {
          await fetchChainToken();
        }
      }
    } catch (err) {
      console.error("Security state error", err);
    }
    let successes = 0;
    let blocked = 0;
    let firstAttempt = null;
    let firstTime = null;
    let firstInfo = null;
    let cart = null;

    const start = performance.now();

    for (let i = 0; i < attemptsInput; i++) {
      const pwd = DUMMY_PASSWORDS[i % DUMMY_PASSWORDS.length];
      let loginOk = false;
      let token = null;
      try {
        const resp = await fetch(`${API_BASE}/login`, {
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

      let shopOk = false;
      try {
        const shopResp = await fetch(`${SHOP_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: targetUser, password: pwd }),
          credentials: "include",
        });
        shopOk = shopResp.status === 200;
      } catch (err) {
        console.error("Shop login error", err);
      }

      try {
        const headers = { "Content-Type": "application/json" };
        if (securityEnabled && chainRef.current) {
          headers["X-Chain-Password"] = chainRef.current;
        }
        const scoreResp = await apiFetch("/score", {
          method: "POST",
          headers,
          body: JSON.stringify({
            client_ip: "10.0.0.1",
            auth_result: loginOk ? "success" : "failure",
          }),
        });
        if (securityEnabled && scoreResp.status === 401) {
          setError("Attack blocked by security");
          setRunning(false);
          return;
        }
        if (scoreResp.ok) {
          const data = await scoreResp.json();
          if (data.status === "blocked") {
            blocked++;
          }
        }
      } catch (err) {
        console.error("Score error", err);
      }

      if (securityEnabled) {
        await fetchChainToken();
      }

      if (loginOk) {
        successes++;
        if (firstAttempt === null) {
          firstAttempt = i + 1;
          firstTime = (performance.now() - start) / 1000;
          if (token) {
            try {
              const prevToken = localStorage.getItem(AUTH_TOKEN_KEY);
              localStorage.setItem(AUTH_TOKEN_KEY, token);
              const infoResp = await apiFetch("/api/me");
              if (infoResp.ok) {
                firstInfo = await infoResp.json();
              }
              if (prevToken) {
                localStorage.setItem(AUTH_TOKEN_KEY, prevToken);
              } else {
                localStorage.removeItem(AUTH_TOKEN_KEY);
              }
            } catch (err) {
              console.error("Info error", err);
            }
          }
        }
      }

      if (shopOk && cart === null) {
        try {
          const cartResp = await fetch(`${SHOP_URL}/cart`, {
            credentials: "include",
          });
          if (cartResp.ok) {
            cart = await cartResp.json();
          }
        } catch (err) {
          console.error("Fetch shop info", err);
        }
      }

      setResults({
        attempts: i + 1,
        successes,
        blocked,
        first_success_attempt: firstAttempt,
        first_success_time: firstTime,
        first_user_info: firstInfo,
        cart,
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
          <select value={targetUser} onChange={(e) => setTargetUser(e.target.value)}>
            <option value="alice">Alice</option>
            <option value="ben">Ben</option>
          </select>
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
      {error && <p className="error-text">{error}</p>}
      {results && (
        <div className="attack-results">
          <p>Total Attempts: {results.attempts}</p>
          <p>Successful Logins: {results.successes}</p>
          {results.first_success_attempt && (
            <>
              <p>
                First Success: attempt {results.first_success_attempt} (in{" "}
                {results.first_success_time?.toFixed(2)}s)
              </p>
              {results.first_user_info && (
                <p>
                  User Info{" "}
                  <code>{JSON.stringify(results.first_user_info)}</code>
                </p>
              )}
              {results.cart && (
                <div>
                  <p>Cart</p>
                  <pre>
                    <code>{JSON.stringify(results.cart, null, 2)}</code>
                  </pre>
                </div>
              )}
            </>
          )}
          {results.total_time && (
            <p>Total Time: {results.total_time.toFixed(2)}s</p>
          )}
        </div>
      )}
      <div className="attack-alerts">
        <AlertsChart token={token} />
      </div>
    </div>
  );
}
