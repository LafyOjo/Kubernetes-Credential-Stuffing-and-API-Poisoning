#!/usr/bin/env python3
import argparse
import asyncio
import time
from urllib.parse import urlparse
from typing import Dict, Optional

import httpx


async def worker(
    client,
    url,
    payload,
    semaphore,
    results,
    base_headers,
    chain_info,
    chain_endpoint,
):
    async with semaphore:
        headers = dict(base_headers)
        chain = chain_info.get("chain")
        if chain:
            headers["X-Chain-Password"] = chain
        start = time.perf_counter()
        resp = await client.post(url, json=payload, headers=headers)
        latency = time.perf_counter() - start
        results.append(latency)
        resp.raise_for_status()
        if chain_endpoint:
            try:
                refresh = await client.get(chain_endpoint, headers=base_headers)
                refresh.raise_for_status()
                chain_info["chain"] = refresh.json().get("chain")
            except Exception as exc:
                print("CHAIN ERROR:", exc)


async def run(
    url: str,
    concurrency: int,
    total: int,
    api_key: Optional[str] = None,
    chain_url: Optional[str] = "/api/security/chain",
):
    payload = {"client_ip": "127.0.0.1", "auth_result": "success"}
    semaphore = asyncio.Semaphore(concurrency)
    results: list[float] = []
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    base_headers: Dict[str, str] = {}
    chain_info: Dict[str, Optional[str]] = {"chain": None}
    chain_endpoint = None
    async with httpx.AsyncClient() as client:
        if api_key:
            base_headers["X-API-Key"] = api_key
            if chain_url:
                chain_endpoint = (
                    chain_url if chain_url.startswith("http") else f"{base}{chain_url}"
                )
                try:
                    resp = await client.get(chain_endpoint, headers=base_headers)
                    resp.raise_for_status()
                    chain_info["chain"] = resp.json().get("chain")
                except Exception as exc:
                    print("CHAIN ERROR:", exc)
        tasks = [
            asyncio.create_task(
                worker(
                    client,
                    url,
                    payload,
                    semaphore,
                    results,
                    base_headers,
                    chain_info,
                    chain_endpoint,
                )
            )
            for _ in range(total)
        ]
        await asyncio.gather(*tasks)
    avg = sum(results) / len(results)
    print(f"Sent {len(results)} requests")
    print(f"Average latency: {avg:.4f}s")
    print(f"Max latency: {max(results):.4f}s")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simple load test")
    parser.add_argument("--url", default="http://localhost:8001/score")
    parser.add_argument("--concurrency", type=int, default=10)
    parser.add_argument("--total", type=int, default=100)
    parser.add_argument("--api-key", help="API key for protected endpoints")
    parser.add_argument(
        "--chain-url",
        default="/api/security/chain",
        help="Endpoint to fetch rotating chain value",
    )
    args = parser.parse_args()
    asyncio.run(
        run(
            args.url,
            args.concurrency,
            args.total,
            api_key=args.api_key,
            chain_url=args.chain_url,
        )
    )
