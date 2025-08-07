import React, { useState } from "react";

export const USER_DATA = {
  alice: {
    name: "Alice",
    password: "secret",

    security: 25,
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

  return (
    <div className="user-accounts">
      <div className="btn-group mb-3">
        {Object.keys(USER_DATA).map((username) => (
          <button
            key={username}
            type="button"
            onClick={() => handleSelect(username)}
            className={`btn btn-${active === username ? "primary" : "outline-primary"}`}
          >
            {USER_DATA[username].name}
          </button>
        ))}
      </div>
      {Object.entries(USER_DATA).map(([username, data]) => (
        <div
          key={username}
          id={`user-card-${username}`}
          className="card"
          style={{ display: active === username ? "block" : "none" }}
        >
          <div className="card-body">
            <h3 className="card-title">{data.name} Security</h3>
            <div className="security-meter mb-3">
              <div
                className={`security-meter-bar ${
                  data.security < 50 ? "low-security" : "high-security"
                }`}
                style={{ width: `${data.security}%` }}
              >
                {data.security}%
              </div>
            </div>
          </div>
          <ul className="list-group list-group-flush">
            {data.features.map((feature) => (
              <li key={feature} className="list-group-item">
                {feature}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
