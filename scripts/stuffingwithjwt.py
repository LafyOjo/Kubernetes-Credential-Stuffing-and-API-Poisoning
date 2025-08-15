from stuffing import attack

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Simulate credential stuffing against the JWT-protected API"
    )
    parser.add_argument(
        "--rate", type=float, default=5, help="Attempts per second"
    )
    parser.add_argument(
        "--attempts", type=int, default=50, help="Number of attempts to send"
    )
    parser.add_argument("--user", default="alice", help="User to target")
    parser.add_argument(
        "--score-base", default="http://localhost:8001", help="Detector API base URL"
    )
    parser.add_argument(
        "--shop-url", default="http://localhost:3005", help="Demo shop base URL"
    )
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
        use_jwt=True,
        score_base=args.score_base,
        shop_url=args.shop_url,
        api_key=args.api_key,
        chain_url=args.chain_url,
        user=args.user,
    )

