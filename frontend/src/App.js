import { useState } from "react";
import ScoreForm from "./ScoreForm";
import AlertsTable from "./AlertsTable";
import LoginForm from "./LoginForm";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [token, setToken] = useState(localStorage.getItem("token"));

  if (!token) {
    return (
      <div>
        <h1>Please log in</h1>
        <LoginForm onLogin={setToken} />
      </div>
    );
  }

  return (
    <div>
      <h1>Credential-Stuffing & Alerts Dashboard</h1>
      <ScoreForm onNewAlert={() => setRefreshKey(k => k + 1)} />
      <AlertsTable refresh={refreshKey} token={token} />
    </div>
  );
}

export default App;
