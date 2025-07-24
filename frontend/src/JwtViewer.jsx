import React from "react";

function decode(token) {
  if (!token) return null;
  try {
    const [header, payload] = token.split(".");
    return {
      header: JSON.parse(atob(header)),
      payload: JSON.parse(atob(payload)),
    };
  } catch {
    return null;
  }
}

export default function JwtViewer({ token }) {
  const decoded = decode(token);
  if (!decoded) return null;

  const copy = () => {
    navigator.clipboard.writeText(token).catch(() => {});
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <h3>JWT Details</h3>
      <pre style={{ wordBreak: "break-all", background: "#f3f3f3", padding: "0.5rem" }}>{token}</pre>
      <button onClick={copy}>Copy JWT</button>
      <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
        <div>
          <h4>Header</h4>
          <pre>{JSON.stringify(decoded.header, null, 2)}</pre>
        </div>
        <div>
          <h4>Payload</h4>
          <pre>{JSON.stringify(decoded.payload, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
