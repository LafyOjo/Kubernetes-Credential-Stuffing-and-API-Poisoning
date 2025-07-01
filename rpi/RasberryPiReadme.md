# Raspberry Pi Setup Guide

This document describes how to run the API security demo on a Raspberry Pi 4. These instructions cover the edge-hosted monitoring web service only (backend and frontend). The other optional Pi integrations mentioned in the main README are beyond the scope of this file.

## Educational use only

This project is intended for testing security concepts in controlled environments for educational purposes. Attacking systems without explicit authorization is strictly prohibited. The RockYou-derived password list in `scripts/data/rockyou.txt` is provided solely as a demonstration resource.

## Prerequisites

- Raspberry Pi 4 running Raspberry Pi OS (32- or 64-bit)
- Python 3.12 or newer
- Node.js (tested with Node 18)
- Git

The Pi should be connected to your local network so you can access the dashboard from another machine or a small SPI display.

## 1. Clone the repository

```bash
git clone https://github.com/your-username/Kubernetes-Credential-Stuffing-and-API-Poisoning.git
cd Kubernetes-Credential-Stuffing-and-API-Poisoning
```

## 2. Set up the backend

Create a Python virtual environment and install the backend requirements:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file with at least `SECRET_KEY` defined (see the main README for all options). Run the Alembic migration then start the API server:

```bash
alembic upgrade head
set -a
source .env
set +a
python server.py  # binds 0.0.0.0:8001 so other devices can connect
```

The backend will expose metrics and API routes on port `8001`.

## 3. Set up the frontend

Open a new terminal on the Pi, then install the frontend dependencies and start the React development server:

```bash
cd frontend
npm install
HOST=0.0.0.0 REACT_APP_API_BASE=http://<pi-ip>:8001 npm start
```

The dashboard will be available at [http://<pi-ip>:3000](http://<pi-ip>:3000). Replace `<pi-ip>` with the Pi's address on your LAN. If the backend runs on another host, adjust the `REACT_APP_API_BASE` variable accordingly.

## 4. Optional: attach a 3.5" SPI display

If you connect a 3.5" SPI display to the Pi's GPIO header, configure the appropriate framebuffer driver for your model. Once the display shows the Pi's desktop, open a browser pointed at `http://localhost:3000` to view the dashboard.

## 5. Next steps

With the web service running locally, you can explore the more advanced Raspberry Pi integrations outlined in the main README, such as local traffic generation with Mininet or on-device machine learning inference.

