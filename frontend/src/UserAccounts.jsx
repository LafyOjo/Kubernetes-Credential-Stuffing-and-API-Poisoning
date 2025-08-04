import React, { useState } from "react";

export const USER_DATA = {
  alice: {
    name: "Alice",
    password: "secret",
    security: 0,
    twoFactor: false,
    securityQuestion: false,
    role: "user",
    features: [
      "Weak password",
      "No MFA",
      "Token reuse allowed",
      "No JWT protection",
    ],
  },
  ben: {
    name: "Ben",
    password: "ILikeN1G3R!A##?",
    security: 90,
    twoFactor: true,
    securityQuestion: false,
    role: "user",
    features: [
      "Strong password requirements",
      "MFA enabled",
      "JWT-protected endpoints",
      "Rotating chain token",
    ],
  },
};

export default function UserAccounts({ onSelect }) {
  const [active, setActive] = useState("alice");

  const select = (u) => {
    setActive(u);
    if (onSelect) onSelect(u);
  };

  const info = USER_DATA[active];

  return (
    <div className="user-accounts">
      <div className="user-buttons">
        {Object.keys(USER_DATA).map((u) => (
          <button
            key={u}
            onClick={() => select(u)}
            className={active === u ? "active" : ""}
          >
            {USER_DATA[u].name}
          </button>
        ))}
      </div>
      <div className="user-info">
        <h3>{info.name} Security</h3>
        <div className="progress">
          <div style={{ width: `${info.security}%` }} />
        </div>

        <p>{info.security}% safe</p>
        <ul>
          {info.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
