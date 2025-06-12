import { useState } from "react";
import ScoreForm from "./ScoreForm";
import AlertsTable from "./AlertsTable";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <h1>Credential-Stuffing & Alerts Dashboard</h1>
      <ScoreForm onNewAlert={() => setRefreshKey(k => k + 1)} />
      <AlertsTable refresh={refreshKey} />
    </div>
  );
}

export default App;
