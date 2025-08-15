import os, typing as t, requests
from datetime import timedelta

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://kube-prom-kube-prometheus-prometheus.monitoring.svc:9090")

def _window_to_prom_expr(window: str) -> str:
    # accepts like "15m", "1h", "6h", "1d"
    return window

def stuffing_summary(users: t.List[str], window: str) -> t.List[t.Dict[str, t.Any]]:
    # Build case-insensitive user regex, e.g. (?i)alice|ben
    if not users:
        users = ["alice","ben"]
    regex = "(?i)" + "|".join(sorted(set(u.strip() for u in users if u.strip())))
    rng  = _window_to_prom_expr(window or "6h")
    expr = f'sum by (username) (increase(credential_stuffing_attempts_total{{username=~"{regex}"}}[{rng}]))'

    try:
        r = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": expr}, timeout=5)
        r.raise_for_status()
        data = r.json()
        if data.get("status") != "success":
            return []
        series = []
        for item in data.get("data", {}).get("result", []):
            username = item["metric"].get("username", "unknown")
            value = float(item["value"][1])
            series.append({"username": username, "value": value})
        # ensure both users appear, fill missing with 0
        want = [u.lower() for u in users]
        have = {s["username"].lower() for s in series}
        for u in want:
            if u not in have:
                series.append({"username": u, "value": 0.0})
        # stable order: input order
        order = {u.lower(): i for i, u in enumerate(want)}
        series.sort(key=lambda s: order.get(s["username"].lower(), 1_000))
        return series
    except Exception:
        return []
