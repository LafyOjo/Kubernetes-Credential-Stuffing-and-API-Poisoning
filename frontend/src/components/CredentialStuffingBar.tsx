import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

type Series = { username: string; value: number };
type Resp = { range: string; series: Series[] };

export default function CredentialStuffingBar() {
  const [range, setRange] = useState("6h");
  const [users, setUsers] = useState<string[]|null>(["alice","ben"]);
  const [data, setData] = useState<Series[]|null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const qs = new URLSearchParams({ range, users: (users||[]).join(",") });
      const r = await fetch(`/api/metrics/credential-stuffing-summary?${qs.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body: Resp = await r.json();
      setData(body.series);
    } catch (e:any) {
      setErr(e.message || "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [range, JSON.stringify(users)]);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Credential Stuffing – Per User</h3>
        <div className="flex gap-2">
          <select className="border rounded px-2 py-1" value={range} onChange={e=>setRange(e.target.value)}>
            <option value="1h">Last 1h</option>
            <option value="6h">Last 6h</option>
            <option value="24h">Last 24h</option>
          </select>
          <div className="flex items-center gap-2 text-sm">
            {["alice","ben"].map(u=>(
              <label key={u} className="flex items-center gap-1">
                <input type="checkbox"
                  checked={users?.includes(u) ?? false}
                  onChange={(e)=>{
                    if (e.target.checked) setUsers([...(users||[]), u]);
                    else setUsers((users||[]).filter(x=>x!==u));
                  }}/>
                {u}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="h-64 border rounded p-2">
        {loading && <div className="text-sm opacity-70">Loading…</div>}
        {err && <div className="text-sm text-red-600">Error: {err}</div>}
        {!loading && !err && (data?.length ?? 0) === 0 && (
          <div className="text-sm opacity-70">No data in selected range.</div>
        )}
        {data && data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="username" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" name="Attempts" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
