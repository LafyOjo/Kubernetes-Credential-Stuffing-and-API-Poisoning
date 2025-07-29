import React, { useEffect, useState } from "react";
import { API_BASE } from "./api";

function parseMetrics(text) {
  const data = {};
  text.split("\n").forEach(line => {
    if (line.startsWith("api_cpu_percent")) {
      data.cpu = parseFloat(line.split(" ")[1]);
    } else if (line.startsWith("api_memory_bytes")) {
      data.memory = parseFloat(line.split(" ")[1]);
    } else if (line.startsWith("api_request_latency_milliseconds_sum")) {
      data.latSum = parseFloat(line.split(" ")[1]);
    } else if (line.startsWith("api_request_latency_milliseconds_count")) {
      data.latCount = parseFloat(line.split(" ")[1]);
    }
  });
  if (data.latSum && data.latCount) {
    data.avgLatency = data.latSum / data.latCount;
  }
  return data;
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/metrics`)
      .then(res => res.text())
      .then(text => setMetrics(parseMetrics(text)))
      .catch(err => console.error("Metrics fetch error", err));
  }, []);

  if (!metrics) {
    return <p>Loading metrics...</p>;
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Performance Metrics</h2>
      <p>CPU Usage: {metrics.cpu ?? "-"}%</p>
      <p>Memory Usage: {metrics.memory ? Math.round(metrics.memory / 1024 / 1024) : "-"} MB</p>
      {metrics.avgLatency && (
        <p>Avg Request Latency: {metrics.avgLatency.toFixed(2)} ms</p>
      )}
    </div>
  );
}
