import { useState } from "react";
import ScoreForm from "./ScoreForm";
import AlertsTable from "./AlertsTable";
import EventsTable from "./EventsTable";
import ShopIframe from "./ShopIframe";
import AlertsChart from "./AlertsChart";
import AlertsSummary from "./AlertsSummary";
import SecurityToggle from "./SecurityToggle";
import AutoLogoutToggle from "./AutoLogoutToggle";
import AttackSim from "./AttackSim";
import UserAccounts from "./UserAccounts";
import LoginStatus from "./LoginStatus";
import JwtViewer from "./JwtViewer";
import EndpointDemo from "./EndpointDemo";

export default function DashboardMain({ token }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedUser, setSelectedUser] = useState("alice");

  return (
    <div className="app-container">
      <h1 className="dashboard-header">APIShield+ Dashboard</h1>
      <UserAccounts onSelect={setSelectedUser} />
      <LoginStatus token={token} />
      <JwtViewer token={token} />
      <EndpointDemo token={token} />
      <ScoreForm onNewAlert={() => setRefreshKey(k => k + 1)} />
      <AlertsSummary token={token} />
      <AlertsChart token={token} />
      <AlertsTable refresh={refreshKey} token={token} />
      <EventsTable token={token} />
      <ShopIframe />
      <div className="attack-section">
        <AttackSim user={selectedUser} />
        <div className="security-box">
          <SecurityToggle />
          <AutoLogoutToggle />
        </div>
      </div>
    </div>
  );
}
