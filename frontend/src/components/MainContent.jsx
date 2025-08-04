import { useEffect, useState } from "react";
import MetricCard from "./MetricCard";
import LineChartCard from "./LineChartCard";
import DonutChartCard from "./DonutChartCard";
import { apiFetch } from "../api";

const MainContent = ({ token }) => {
  const [metrics, setMetrics] = useState({
    totalHacks: 0,
    blocked: 0,
    accounts: 0,
  });
  const [lineData, setLineData] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const statsResp = await apiFetch("/api/alerts/stats");
        const stats = await statsResp.json();
        setLineData(stats);
        const totalHacks = stats.reduce((s, i) => s + i.invalid, 0);
        const blocked = stats.reduce((s, i) => s + i.blocked, 0);
        let accounts = 0;
        try {
          const resp2 = await apiFetch("/api/user-calls/");
          if (resp2.ok) {
            const data2 = await resp2.json();
            accounts = Object.keys(data2).length;
          }
        } catch (e) {
          // ignore
        }
        setMetrics({ totalHacks, blocked, accounts });
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const donutData = [
    { name: "Blocked", value: metrics.blocked },
    { name: "Safe", value: Math.max(metrics.totalHacks - metrics.blocked, 0) },
  ];

  const blockedPct = metrics.totalHacks
    ? (metrics.blocked / metrics.totalHacks) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Hacks"
          value={metrics.totalHacks}
          percentage={100}
          delta={0}
        />
        <MetricCard
          title="Blocked Attempts"
          value={metrics.blocked}
          percentage={blockedPct}
          delta={0}
        />
        <MetricCard
          title="Registered Accounts"
          value={metrics.accounts}
          percentage={100}
          delta={0}
        />
      </div>
      <LineChartCard data={lineData} />
      <DonutChartCard data={donutData} />
    </div>
  );
};

export default MainContent;
