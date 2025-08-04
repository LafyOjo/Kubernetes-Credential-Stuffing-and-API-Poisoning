import React, { useState, useEffect } from "react";
import { USER_DATA } from "./UserAccounts";
import { apiFetch, API_BASE } from "./api";
const SHOP_URL = process.env.REACT_APP_SHOP_URL || "http://localhost:3005";

const DUMMY_PASSWORDS = [
  "wrongpass",
  "123456",
  "password1",
  "secret",
  "letmein",
];

export default function AttackSim({ user }) {
  const [targetUser, setTargetUser] = useState(user || "alice");

  useEffect(() => {
    if (user) {
      setTargetUser(user);
    }
  }, [user]);

  useEffect(() => {
    async function ensureUsers() {
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
    }
    ensureUsers();
  }, []);

  const [attemptsInput, setAttemptsInput] = useState(20);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [chain, setChain] = useState(null);

  const simulateAttack = async () => {
    setRunning(true);
    setResults(null);
    setError(null);
    setChain(null);
    let securityEnabled = false;
    let chainToken = null;
    try {
      const secResp = await apiFetch("/api/security");
      if (secResp.ok) {
        const data = await secResp.json();
        securityEnabled = data.enabled;
        if (securityEnabled) {
          try {
            const chainResp = await apiFetch("/api/security/chain");
            if (chainResp.ok) {
              const chainData = await chainResp.json();
              chainToken = chainData.chain;
              setChain(chainToken);
            }
          } catch (err) {
            console.error("Chain fetch error", err);
          }
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
    let firstCart = null;
    let firstOrders = null;

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
        if (securityEnabled && chainToken) {
          headers["X-Chain-Password"] = chainToken;
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
        try {
          const chainResp = await apiFetch("/api/security/chain");
          if (chainResp.ok) {
            const chainData = await chainResp.json();
            chainToken = chainData.chain;
            setChain(chainToken);
          }
        } catch (err) {
          console.error("Chain refresh error", err);
        }
      }

      if (loginOk) {
        successes++;
        if (firstAttempt === null) {
          firstAttempt = i + 1;
          firstTime = (performance.now() - start) / 1000;
          if (token) {
            try {
              const infoResp = await apiFetch("/api/me", {
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

      if (shopOk && firstCart === null) {
        try {
          const cartResp = await fetch(`${SHOP_URL}/carts/${targetUser}/items`);
          if (cartResp.ok) {
            firstCart = await cartResp.json();
          }
          const orderResp = await fetch(
            `${SHOP_URL}/orders/search/customerId?custId=${targetUser}`
          );
          if (orderResp.ok) {
            firstOrders = await orderResp.json();
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
        first_cart: firstCart,
        first_orders: firstOrders,
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
                First Success: attempt {results.first_success_attempt} (in{' '}
                {results.first_success_time?.toFixed(2)}s)
              </p>
              {results.first_user_info && (
                <p>
                  User Info{' '}
                  <code>{JSON.stringify(results.first_user_info)}</code>
                </p>
              )}
              {results.first_cart && (
                <p>
                  Cart <code>{JSON.stringify(results.first_cart)}</code>
                </p>
              )}
              {results.first_orders && (
                <p>
                  Orders <code>{JSON.stringify(results.first_orders)}</code>
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
