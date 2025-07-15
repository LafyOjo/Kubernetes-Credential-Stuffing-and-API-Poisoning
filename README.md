# APIShield+ Demo

This repository contains a small FastAPI service used to detect credential stuffing attempts and a React dashboard for viewing alerts.

## For final project dissertation Use Only

This project is intended for testing security concepts in controlled environments
for educational purposes. Attacking systems without explicit authorization is
strictly prohibited. The RockYou‑derived password list included under
`scripts/data/rockyou.txt` is provided solely as a demonstration resource.

## Configuration

The backend reads environment variables from a `.env` file on startup. The
`SECRET_KEY` must be set; otherwise `backend/app/core/security.py` raises an
error during import. Two optional variables control the credential stuffing
detection logic, and another toggles SQLAlchemy debug logging:

- `FAIL_LIMIT` – how many failures are allowed within the window before
  blocking a client (default `5`).
- `FAIL_WINDOW_SECONDS` – the size of the window in seconds used when counting
  failures (default `60`).
- `DB_ECHO` – set to `true` to log SQL statements (default `false`).
- `ACCESS_TOKEN_EXPIRE_MINUTES` – lifetime of issued JWT tokens in minutes
  (default `30`).
- `REGISTER_WITH_SHOP` – set to `true` to also register the account with Sock Shop (default `false`).
- `LOGIN_WITH_SHOP` – set to `true` to also log into Sock Shop when authenticating (default `false`).
- `SOCK_SHOP_URL` – base URL for Sock Shop when forwarding registrations (default `http://localhost:8080`).
- `SOCK_SHOP_PATH` – path to the included `sockshop-master` sources used when starting the demo.
- `ANOMALY_DETECTION` – set to `true` to enable ML-based request anomaly checks (default `false`).
- `REAUTH_PER_REQUEST` – set to `true` to require the user's password on every API call (default `false`).
- `ZERO_TRUST_API_KEY` – if set, every request must include this value in the
  `X-API-Key` header. Invalid keys are logged via `/score` and show up in
  Prometheus metrics.

When enabled, clients must supply the password again via the
`X-Reauth-Password` header. The dashboard automatically prompts for
the password whenever the API replies with `401` and then retries the
request. Enter the same password you used to log in. If you cancel or
enter it incorrectly, you will be logged out and returned to the login
screen. The helper script `scripts/reauth_client.py` demonstrates
prompting for the password before each request when calling the API
from the command line.

To try it manually, register an account and then run:

`X-Reauth-Password` header. The helper script
`scripts/reauth_client.py` demonstrates prompting for the password
before each request.

To try it manually, register an account and then run:

```bash
python scripts/reauth_client.py alice --base http://localhost:8001 --times 2
```

The script logs in and prompts for your password before every request.
Canceling the prompt or entering the wrong password logs you out and
returns to the login screen. Set `REAUTH_PER_REQUEST=false` in `.env` if
you prefer to disable this extra check.

Set `REAUTH_PER_REQUEST=false` in `.env` if you prefer to disable this
extra check.


Example `.env`:

```env
DATABASE_URL=sqlite:///./app.db
SECRET_KEY=super-secret-key
# Optional tuning parameters
# Block after this many failures within FAIL_WINDOW_SECONDS
FAIL_LIMIT=5
# Number of seconds to look back when counting failures
FAIL_WINDOW_SECONDS=60
# Log SQL queries
DB_ECHO=true
# JWT token expiry in minutes
ACCESS_TOKEN_EXPIRE_MINUTES=30
# Forward successful registrations to Sock Shop
REGISTER_WITH_SHOP=true
# Forward logins to Sock Shop
LOGIN_WITH_SHOP=true
# Where the Sock Shop API is hosted
SOCK_SHOP_URL=http://localhost:8080
# Location of the Helidon Sock Shop source
SOCK_SHOP_PATH=./sockshop-master
# Enable ML-based anomaly checks
ANOMALY_DETECTION=true
# Require password on every API request
REAUTH_PER_REQUEST=true
# Require X-API-Key header on every request
ZERO_TRUST_API_KEY=demo-key
```

## Running the backend

1. Create and activate a virtual environment and install the requirements:

```bash
cd backend
python3 -m venv .venv
source .venv/Scripts/activate always check because sometimes some operating systems may save this in the libs/bin folder
pip install -r requirements.txt
# Packages are pinned to versions that ship wheels for Python 3.12. If
# installation fails with compiler errors, make sure build tools such as
# a C compiler and Rust are available.
```

2. Create a `.env` file in `backend/` as shown in the **Configuration** section.

3. Run Alembic migrations to create the `alerts` table:

```bash
alembic upgrade head
```
**Note:** If `app.db` already exists from a previous run, `alembic upgrade head` may fail. Remove the file or run `alembic stamp head` before rerunning the upgrade.

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

# if there is an error re-run the command with the below command this is because linux runs commands differently to windows which is why there may be an error
npm install --save-dev cross-env

# If there is still an error go to the package-lock.json and input this code to hard-code the URL into the react-development server 
"scripts": 
{
"start": "cross-env REACT_APP_API_BASE=http://localhost:8001 react-scripts start",
"build": "cross-env REACT_APP_API_BASE=http://localhost:8001 react-scripts build",
"test": "cross-env REACT_APP_API_BASE=http://localhost:8001 react-scripts test",
  "eject": "react-scripts eject"
}
# once this is done then 
npm start
```

The start script sets `REACT_APP_API_BASE` to `http://localhost:8001`. Override
this variable when building or running the frontend if the API lives at a
different URL. Set `REACT_APP_API_KEY` if the backend requires an `X-API-Key`
header.

The React application will be available at [http://localhost:3000](http://localhost:3000).

## Starting the Sock Shop

The Helidon-based Sock Shop sources are located in the `sockshop-master/` directory.
To run the shop locally without Kubernetes execute:

```bash
cd sockshop-master
mvn -q package
kubectl apply -k k8s/core -n sock-shop
```

The UI will be exposed on <http://localhost:8080> when port-forwarding the
`front-end` service as shown in the Kubernetes section.

## Credential Stuffing Simulation

1. Start the React application:

   ```bash
   cd frontend
   npm install
   npm start
   ```

   The dashboard will be served at <http://localhost:3000>.

   The dashboard shows two demo accounts, **Alice** and **Ben**. Selecting an
   account displays how secure it is as a progress bar and lists the enabled
   protections. Alice intentionally has reduced security while Ben has all
   security features enabled. When a login succeeds the simulator fetches the
   user's cart and orders from Sock Shop, demonstrating how Alice's data is
   exposed while Ben remains safe.

   account displays how secure it is and lists the enabled protections. Alice
   intentionally has reduced security while Ben has all security features
   enabled.

2. Log in and locate the **Credential Stuffing Simulation** section. Choose a
   target account and click **Start Attack**. When targeting Alice the attack
   will usually succeed quickly. Ben's account requires the correct chain token
   so repeated guesses are blocked.

3. To use the command-line to login and create a user that would be used across the services and for the 
   purpose of testing we need to use the terminal, below is an example of how to register a user and login
   
   ```
  $ curl -X POST http://localhost:8001/register \
    -H "Content-Type: application/json" \
    -d '{"username":"alice","password":"secret"}'

  $ curl -X POST http://localhost:8001/register \
    -H "Content-Type: application/json" \
    -d '{"username":"ben","password":"ILikeN1G3R!A##?"}'
  ```
   After registering with the detector service, send the same credentials to
   Sock Shop so both backends share the account:

   ```bash
   curl -X POST http://localhost:8080/register \
     -H "Content-Type: application/json" \
     -d '{"username":"alice","password":"secret"}'

  curl -X POST http://localhost:8080/register \
    -H "Content-Type: application/json" \
    -d '{"username":"ben","password":"ILikeN1G3R!A##?"}'
   ```
  and to login we would either login from the react-native application or we would enter in the command below

   ```
   $ curl -X POST http://localhost:8001/login
   -H "Content-Type: application/json"
   -d '{"username": "alice", "password": "secret"}'
   ```
   The response contains a JWT access token. Include it in the `Authorization`
   header when calling protected endpoints or when logging out:

   ```bash
   curl -X POST http://localhost:8001/logout \
     -H "Authorization: Bearer <token>"
   ```
   
For command-line testing there are three standalone scripts:

```bash
python scripts/reauth_client.py --help
python scripts/stuffing.py --help
python scripts/stuffingwithjwt.py --help
```
Both scripts accept `--score-base` and `--shop-url` to override the default addresses (`http://localhost:8001` for the detector API and `http://localhost:8080` for the Sock Shop UI).


`stuffing.py` performs a basic credential stuffing attack against the insecure
login endpoint. The `stuffingwithjwt.py` variant targets the JWT-protected API
and illustrates how using token-based authentication blocks the attack.

The password list at `scripts/data/rockyou.txt` is derived from the widely
circulated RockYou breach dataset. It is provided in this repository solely for
demonstration purposes and no license or ownership is claimed.

## Running with Kubernetes

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [kind](https://kind.sigs.k8s.io/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/)

### Steps

1. Spin up a local cluster and deploy Sock Shop using the manifests from `sockshop-master`:

   ```bash
    bash infra/kind/up.sh
   ```

   This creates a kind cluster, installs Prometheus and Grafana via Helm, and deploys the Sock Shop demo application.
   The Sock Shop manifest is included locally at `infra/kind/sock-shop.yaml` and the full source lives under `sockshop-master/`.

2. Generate a certificate and create the TLS secret:

   ```bash
   bash scripts/generate-cert.sh
   kubectl create secret tls detector-tls \
       --cert=server.crt --key=server.key -n demo
   ```

3. Create a Secret containing the required environment variables:

   ```bash
   kubectl create secret generic detector-env \
       --from-literal=SECRET_KEY=<random-secret> \
       --from-literal=DATABASE_URL=sqlite:///app.db \
       --from-literal=ZERO_TRUST_API_KEY=demo-key \
       -n demo
   ```

   Replace `<random-secret>` with any string you want to use as the secret key.
4. Build the detector image:

   ```bash
   docker build -t detector:latest -f backend/Dockerfile backend
   ```

5. Load the image into the kind cluster so the Deployment can pull it:

   ```bash
   kind load docker-image detector:latest --name cred-demo
   ```

   If the image isn't loaded before applying the manifests, the detector pod will
   remain in the `Pending` state. Check its status with:

   ```bash
   kubectl get pods -n demo
   ```

6. Deploy the Kubernetes manifests:

   ```bash
   kubectl apply -f infra/k8s/
   ```

7. Access the services using port-forwarding (in separate terminals):

   ```bash
   kubectl port-forward svc/front-end -n sock-shop 8080:80   -> remember to enter in on local-browser 'http://localhost:8080' to load up the sock-shop     # Sock Shop UI
   kubectl port-forward svc/detector -n demo 8001:8001            # Detector API & metrics (HTTPS)
   kubectl port-forward svc/kube-prom-prometheus -n monitoring 9090 or kubectl port-forward svc/kube-prom-kube-prometheus-prometheus -n monitoring 9090
   kubectl port-forward svc/kube-prom-grafana -n monitoring 3001:80
   ```

   Verify the API is reachable via HTTPS:

   ```bash
   curl -k https://localhost:8001/ping
   ```

8. Generate traffic to observe detections:

   ```bash
   python scripts/stuffing.py --score-base https://localhost:8001 --shop-url http://localhost:8080
   ```

## `/score` endpoint

The backend exposes `POST /score` which accepts a JSON payload:

```json
{ "client_ip": "10.0.0.1", "auth_result": "success" | "failure", "with_jwt": true | false }
```

Include `with_jwt` as `true` when the request uses a JWT access token.

Every call increments the `login_attempts_total` Prometheus counter labelled by IP. When `auth_result` is `failure`, the service counts how many failures have occurred for that IP in the last `FAIL_WINDOW_SECONDS` seconds (60 by default). If the count meets or exceeds `FAIL_LIMIT` (default 5) the request is blocked, an alert row is inserted with `detail` set to "Blocked: too many failures" and the response is:

```json
{ "status": "blocked", "fails_last_minute": <count> }
```

Otherwise it records the failure and returns `{"status": "ok"}`. A successful result simply records the metric.

When `ZERO_TRUST_API_KEY` is enabled, any request missing or providing the wrong
`X-API-Key` header is also counted as a failure via this endpoint so the
dashboard and Prometheus reflect the attempts.

## `/config` endpoint

`GET /config` returns the failure threshold the service is currently using when evaluating login attempts. The value reflects the `FAIL_LIMIT` environment variable or the default of `5`:

```json
{ "fail_limit": 5 }
```

## `/api/security` endpoints

The backend keeps a global `SECURITY_ENABLED` flag (default `true`) controlling
whether failed login attempts trigger blocking. Use `GET /api/security` to
retrieve the current state and `POST /api/security` with a JSON body of
`{"enabled": true|false}` to update it.

When disabled, calls to `/score` will continue to record metrics but will never
return `{"status": "blocked"}`.

When security is enabled the service also expects each request to `/score`
include an `X-Chain-Password` header. This value is derived from the previous
call's password combined with a random nonce. Fetch the current value from
`GET /api/security/chain` and supply it with each request. After validation the
password is rotated so replayed requests are rejected.

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

### Demonstrating token validation

Run `python scripts/demo_auth.py` after starting the API to see how a valid JWT grants access while a random token is rejected. The script prints the status codes for both attempts and the issued token appears in the server logs thanks to the new middleware.

## User registration

Create an account by sending a `POST` request to `/register` with JSON fields `username` and `password`. The password is securely hashed before storing in the database. After registering, obtain a token from `/login` and include it in `Authorization` headers when calling secured APIs.

## CORS configuration

The backend allows cross-origin requests from `http://localhost:3000` so the React frontend can make authenticated calls without being blocked by the browser's same-origin policy.

## Running the tests

The unit tests live in `backend/tests`. Install the backend requirements and run
pytest from the `backend` directory so the `app` package is discoverable:

```bash
pip install -r backend/requirements.txt
cd backend
PYTHONPATH=. pytest
```

## Edge-hosted monitoring on Raspberry Pi

To run the dashboard directly on a Raspberry Pi, follow the steps in
`rpi/RasberryPiReadme.md`. In short, install the backend and frontend
dependencies, then launch both services to expose the API on port `8001` and the
React UI on port `3000` for any device on your LAN. A convenience script
`python rpi/start_edge_service.py` starts both processes at once.

## Local traffic generation with Mininet

To emulate traffic directly on a Raspberry Pi or other host install
[Mininet](http://mininet.org/) and run the helper script in the `mininet`
directory:

```bash
sudo python3 mininet/gen_traffic.py
```

The script creates two virtual hosts connected by a switch. One host runs a
simple Python HTTP server while the other issues a few baseline requests followed
by a larger burst to mimic attack traffic. After sending the requests you will
be dropped into the Mininet CLI where additional commands such as `pingall` or
`iperf` can be used. Type `exit` to shut down the network.

## On-device ML inference

Capture live packets on the Pi and evaluate them using a TensorFlow model. Place your model file at `training/trained_model.h5` and run:

```bash
python training/run_inference.py --iface eth0
```

## Lightweight SDN controller

Run a small [Ryu](https://osrg.github.io/ryu/) controller to gather OpenFlow
statistics from an Open vSwitch instance. After installing the requirements at
`sdn-controller/requirements.txt`, launch the controller with:

```bash
ryu-manager sdn-controller/simple_monitor.py
```

Point your switch at the Pi's IP on port `6633`. The script logs packet and byte
counts for each active flow. Edit the code to forward these stats to the
detector service if desired.

## SPI display dashboard

Attach a small SPI screen to the Raspberry Pi and render live alert statistics
without opening a browser:

```bash
pip install -r rpi/requirements.txt
python rpi/spi_display.py --api-base http://<pi-ip>:8001
```

The script polls `/api/alerts/stats` and draws the latest values on the display
using `pygame`.

## Performance evaluation

Prometheus scrapes metrics from the detector service at `/metrics`. Use
`scripts/perf_test.py` to send concurrent requests and measure average latency.
Launch the API and then run:

```bash
python scripts/perf_test.py --concurrency 20 --total 200
```

View CPU and memory usage for the on-device model by running
`training/run_inference.py`. Metrics are exported on port `8002` and can be
scraped by Prometheus.

## Touchscreen feature menu

When the Pi has a 3.5" display attached you can launch an interactive menu to
start any of the optional features. The menu works with both a touchscreen and
a keyboard:

```bash
python rpi/menu.py
```

Select a feature to run it and press `Esc` to return to the menu.


## License

This project is licensed under the [MIT License](LICENSE).
