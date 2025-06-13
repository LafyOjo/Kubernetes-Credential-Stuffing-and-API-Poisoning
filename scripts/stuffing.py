# scripts/stuffing.py

import requests
import random
import itertools
import time
import argparse


# load your creds list (rockyou or hardcoded)
def load_creds(path, limit=None):
    passwords = []
    with open(path, newline="", encoding="latin-1") as f:
        for i, line in enumerate(f):
            passwords.append(line.strip())
            if limit and i + 1 >= limit:
                break
    return passwords

passwords = load_creds("scripts/data/rockyou.txt", limit=5000)
pool = itertools.cycle(passwords)


def attack(rate_per_sec=10, attempts=50, use_jwt=False):
    """Send repeated login attempts and report detection results."""
    success = 0
    blocked = 0
    for _ in range(attempts):
        pwd = next(pool)
        ip = "10.0.0.1"
        user = "alice"

        if use_jwt:
            login_resp = requests.post(
                "http://localhost:8001/api/token",
                data={"username": user, "password": pwd},
                timeout=3,
            )
            token = login_resp.json().get("access_token") if login_resp.status_code == 200 else None
            login_ok = login_resp.status_code == 200
            if token:
                requests.get(
                    "http://localhost:8001/api/alerts",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=3,
                )
        else:
            login_resp = requests.post(
                "http://localhost:8080/login",
                json={"username": user, "password": pwd},
                headers={"X-Forwarded-For": ip},
                timeout=3,
            )
            login_ok = login_resp.status_code == 200

        score_payload = {
            "client_ip": ip,
            "auth_result": "success" if login_ok else "failure",
            "with_jwt": use_jwt,
        }

        try:
            score_resp = requests.post(
                "http://localhost:8001/score",
                json=score_payload,
                timeout=3,
            )
            if score_resp.json().get("status") == "blocked":
                blocked += 1
        except Exception as e:
            print("SCORE ERROR:", e)

        if login_ok:
            success += 1

        time.sleep(1 / rate_per_sec)

    print(f"Attempts: {attempts}, successes: {success}, blocked: {blocked}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--jwt", action="store_true", help="Use JWT login endpoint")
    parser.add_argument("--rate", type=float, default=5, help="Attempts per second")
    parser.add_argument("--attempts", type=int, default=50, help="Number of attempts to send")
    args = parser.parse_args()
    attack(rate_per_sec=args.rate, attempts=args.attempts, use_jwt=args.jwt)
