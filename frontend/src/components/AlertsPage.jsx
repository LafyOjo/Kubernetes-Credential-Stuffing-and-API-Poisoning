// frontend/src/pages/AlertsPage.jsx
import React from "react";
import AlertsTable from "../AlertsTable";

function AlertsPage() {
  return (
    <div style={{ padding: "1rem" }}>
      <h1>Alerts Dashboard</h1>
      <AlertsTable />
    </div>
  );
}

export default AlertsPage;
