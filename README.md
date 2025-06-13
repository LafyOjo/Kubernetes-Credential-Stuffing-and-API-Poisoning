# API Security Demo

This repository contains a small FastAPI service used to detect credential stuffing attempts and a React dashboard for viewing alerts.

## Configuration

The backend reads environment variables from a `.env` file on startup. The
`SECRET_KEY` must be set; otherwise `backend/app/core/security.py` raises an
error during import.

Example `.env`:

```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=super-secret-key
```

## Running the backend

1. Create and activate a virtual environment and install the requirements:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Create a `.env` file in `backend/` as shown in the **Configuration** section.

3. Run Alembic migrations to create the `alerts` table:

```bash
alembic upgrade head
```

4. Load the variables from `.env` and start the API server:

```bash
set -a
source .env
set +a
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

## Credential Stuffing Simulation

1. Start the React application:

   ```bash
   cd frontend
   npm install
   npm start
   ```

   The dashboard will be served at <http://localhost:3000>.

2. Log in and locate the **Credential Stuffing Simulation** section. Click
   **Send Attempt** multiple times to generate failed login requests against the
   backend. The UI displays how many attempts were blocked once the detection
   threshold is reached.

For command-line testing there are two standalone scripts:

```bash
python scripts/stuffing.py --help
python scripts/stuffingwithjwt.py --help
```

`stuffing.py` performs a basic credential stuffing attack against the insecure
login endpoint. The `stuffingwithjwt.py` variant targets the JWT-protected API
and illustrates how using token-based authentication blocks the attack.

## Running with Kubernetes

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [kind](https://kind.sigs.k8s.io/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/)

### Steps

1. Spin up a local cluster and deploy Sock Shop:

   ```bash
   bash infra/kind/up.sh
   ```

   This creates a kind cluster, installs Prometheus and Grafana via Helm, and deploys the Sock Shop demo application.
   The Sock Shop manifest is included locally at `infra/kind/sock-shop.yaml`.

2. Build the detector image and deploy it to the cluster:

   ```bash
   docker build -t detector:latest -f backend/Dockerfile backend
   kubectl apply -f infra/k8s/
   ```

3. Access the services using port-forwarding (in separate terminals):

   ```bash
   kubectl port-forward svc/front-end -n sock-shop 8080:80        # Sock Shop UI
   kubectl port-forward svc/detector -n demo 8001:8001            # Detector API & metrics
   kubectl port-forward svc/kube-prom-prometheus -n monitoring 9090
   kubectl port-forward svc/kube-prom-grafana -n monitoring 3001:80
   ```

4. Generate traffic to observe detections:

   ```bash
   python scripts/stuffing.py
   ```

## `/score` endpoint

The backend exposes `POST /score` which accepts a JSON payload:

```json
{ "client_ip": "10.0.0.1", "auth_result": "success" | "failure", "with_jwt": true | false }
```

Include `with_jwt` as `true` when the request uses a JWT access token.

Every call increments the `login_attempts_total` Prometheus counter labelled by IP. When `auth_result` is `failure`, the service counts failures for that IP during the last minute. Once five failures occur within that window, a row is inserted in the `alerts` table with `detail` set to "Blocked: too many failures" and the response is:

```json
{ "status": "blocked", "fails_last_minute": <count> }
```

Otherwise it records the failure and returns `{"status": "ok"}`. A successful result simply records the metric.

## `/api/alerts/stats` endpoint

Authenticated clients can fetch aggregated statistics with `GET /api/alerts/stats`.
The response is a list of objects containing the minute, how many invalid
credential attempts occurred, and how many times blocking was triggered.
These stats power the dashboard chart.

## JWT authentication

Send a `POST` request to `/login` with a JSON body containing a `username` and `password`. If the credentials are valid the response will include a JWT access token:

```json
{"access_token": "<token>", "token_type": "bearer"}
```

Include this token in the `Authorization: Bearer <token>` header when calling protected routes such as `/api/alerts`. Token creation and verification happen in `app.core.security`.

## User registration

Create an account by sending a `POST` request to `/register` with JSON fields `username` and `password`. The password is securely hashed before storing in the database. After registering, obtain a token from `/login` and include it in `Authorization` headers when calling secured APIs.

## CORS configuration

The backend allows cross-origin requests from `http://localhost:3000` so the React frontend can make authenticated calls without being blocked by the browser's same-origin policy.

## Running the tests

The unit tests live in `backend/tests`. Install the backend requirements before
executing them:

```bash
pip install -r backend/requirements.txt
pytest
```
