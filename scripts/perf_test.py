#!/usr/bin/env python3
import argparse
import asyncio
import time

import httpx

async def worker(client, url, payload, semaphore, results):
    async with semaphore:
        start = time.perf_counter()
        resp = await client.post(url, json=payload)
        latency = time.perf_counter() - start
        results.append(latency)
        resp.raise_for_status()

async def run(url: str, concurrency: int, total: int):
    payload = {"client_ip": "127.0.0.1", "auth_result": "success"}
    semaphore = asyncio.Semaphore(concurrency)
    results: list[float] = []
    async with httpx.AsyncClient() as client:
        tasks = [asyncio.create_task(worker(client, url, payload, semaphore, results)) for _ in range(total)]
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
    args = parser.parse_args()
    asyncio.run(run(args.url, args.concurrency, args.total))
