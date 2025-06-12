# API Security Demo

This repository contains a small FastAPI service used to detect credential stuffing attempts and a React dashboard for viewing alerts.

## Running the backend

1. Create and activate a virtual environment and install the requirements:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Configure the database by creating a `.env` file in `backend/`:

```env
DATABASE_URL=sqlite:///./app.db
```

3. Run Alembic migrations to create the `alerts` table:

```bash
alembic upgrade head
```

4. Start the API server:

```bash
uvicorn app.main:app --reload --port 8001
```

Prometheus metrics will be exposed at `http://localhost:8001/metrics`.

## Running the frontend

```bash
cd frontend
npm install
npm start
```

The React application will be available at [http://localhost:3000](http://localhost:3000).

## `/score` endpoint

The backend exposes `POST /score` which accepts a JSON payload:

```json
{ "client_ip": "10.0.0.1", "auth_result": "success" | "failure" }
```

Every call increments the `login_attempts_total` Prometheus counter labelled by IP. When `auth_result` is `failure`, the service counts failures for that IP during the last minute. Once five failures occur within that window, a row is inserted in the `alerts` table with `detail` set to "Blocked: too many failures" and the response is:

```json
{ "status": "blocked", "fails_last_minute": <count> }
```

Otherwise it records the failure and returns `{"status": "ok"}`. A successful result simply records the metric.

## JWT authentication

Posting valid credentials to `/login` returns a JWT access token. Protected routes such as `/api/alerts` require including this token in the `Authorization: Bearer <token>` header. Token creation and verification happen in `app.core.security`.
