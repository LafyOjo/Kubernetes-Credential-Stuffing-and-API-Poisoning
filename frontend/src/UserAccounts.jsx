import React, { useState } from "react";

export const USER_DATA = {
  alice: {
    name: "Alice",
    password: "secret",

    security: 30,
    features: [
      "Weak password",
      "No MFA",
      "Token reuse allowed",
    ],
  },
  ben: {
    name: "Ben",
    password: "ILikeN1G3R!A##?",

    security: 90,
    features: [
      "Strong password requirements",
      "MFA enabled",
      "Rotating chain token",
    ],
  },
};

export default function UserAccounts({ onSelect }) {
  const [active, setActive] = useState("alice");

  const handleSelect = (username) => {
    setActive(username);
    onSelect?.(username);
  };

  const selected = USER_DATA[active];

  return (
    <div className="user-accounts">
      <div className="user-selector">
        {Object.keys(USER_DATA).map((username) => (
          <button
            key={username}
            onClick={() => handleSelect(username)}
            className={active === username ? "active" : ""}
          >
            {USER_DATA[username].name}
          </button>
        ))}
      </div>
      <div className="user-info">
        <h3>{selected.name} Security</h3>
        <p>{selected.security}% safe</p>
        <ul>
          {selected.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
