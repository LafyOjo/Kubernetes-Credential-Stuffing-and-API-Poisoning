"""Simple live traffic inference example.

Capture packets from a network interface, compute lightweight
statistics, and run them through a pre-trained Keras model.
"""

import argparse
import time
from typing import List

import numpy as np
from scapy.all import sniff, TCP
from tensorflow import keras


def extract_features(pkts: List) -> np.ndarray:
    """Compute a small set of features from captured packets."""
    total = len(pkts)
    if not total:
        return np.zeros((1, 8), dtype=np.float32)

    lengths = [len(p) for p in pkts]
    syn_count = sum(1 for p in pkts if p.haslayer(TCP) and p[TCP].flags == 'S')
    ack_count = sum(1 for p in pkts if p.haslayer(TCP) and p[TCP].flags == 'A')

    features = np.array([
        total,
        np.mean(lengths),
        np.std(lengths),
        syn_count / total,
        ack_count / total,
        max(lengths),
        min(lengths),
        sum(lengths) / 1024,  # total KB transferred
    ], dtype=np.float32)
    return features.reshape(1, -1)


def main(iface: str, model_path: str, duration: float):
    model = keras.models.load_model(model_path)
    print(f"Loaded model from {model_path}")

    while True:
        print(f"Capturing {duration}s of traffic on {iface}...")
        pkts = sniff(iface=iface, timeout=duration)
        feats = extract_features(pkts)
        prob = float(model.predict(feats, verbose=0)[0][0])
        print(f"Prediction for last window: {prob:.4f}")
        time.sleep(0.5)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run live ML inference")
    parser.add_argument("--iface", default="eth0", help="Network interface")
    parser.add_argument("--model", default="training/trained_model.h5",
                        help="Path to trained Keras model")
    parser.add_argument("--duration", type=float, default=10.0,
                        help="Capture window in seconds")
    args = parser.parse_args()
    main(args.iface, args.model, args.duration)
