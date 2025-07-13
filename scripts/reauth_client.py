#!/usr/bin/env python3
"""Small demo client showing per-request reauthentication."""

import argparse
import getpass
import os
import requests


def login(base: str, username: str) -> tuple[str, str]:
    """Prompt for the initial password and obtain a JWT."""
    pw = getpass.getpass("Password: ")
    resp = requests.post(f"{base}/login", json={"username": username, "password": pw}, timeout=5)
    resp.raise_for_status()
    token = resp.json()["access_token"]
    return token, pw


def call_me(base: str, token: str) -> None:
    pw = getpass.getpass("Re-auth password: ")
    headers = {"Authorization": f"Bearer {token}", "X-Reauth-Password": pw}
    resp = requests.get(f"{base}/api/me", headers=headers, timeout=5)
    print(resp.status_code, resp.json())


def main() -> None:
    parser = argparse.ArgumentParser(description="Demo client requiring the password on every request")
    parser.add_argument("username", help="Account username")
    parser.add_argument("--base", default=os.environ.get("API_BASE", "http://localhost:8001"), help="API base URL")
    parser.add_argument("--times", type=int, default=1, help="Number of requests to send")
    args = parser.parse_args()

    token, _ = login(args.base, args.username)
    for _ in range(args.times):
        call_me(args.base, token)


if __name__ == "__main__":
    main()
