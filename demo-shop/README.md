# Demo Shop

This directory contains a very small Node.js-based e-commerce example used in place of the previous shop demo.
It can integrate with the APIShield+ backend for additional telemetry. By default
this forwarding is **enabled** so events reach the API unless explicitly disabled.
Set the environment variable `FORWARD_API=false` to run the shop standalone without API calls. Requests to the API use a short timeout controlled by `API_TIMEOUT_MS` (default `2000`). Set `REAUTH_PER_REQUEST=true` if you want the shop to require the password on every request.
Each protected endpoint checks the `X-Reauth-Password` header only when this option is enabled, and it is disabled by default so the shop behaves like a normal session-based app.

The server pre-registers demo accounts so you can log in immediately with
`alice`/`secret` or `ben`/`ILikeN1G3R!A##?`.
When `FORWARD_API=true` successful logins also return an `access_token`
from the APIShield backend so other apps, such as the dashboard, share the
same authentication state.

## Running

```
cd demo-shop
npm install
node server.js
```

When running in Kubernetes, after port-forwarding the services:

```
kubectl port-forward svc/detector -n demo 8001:8001
kubectl port-forward svc/front-end -n demo-shop 3005:80
```

set `API_PORT=8001` (or `API_BASE=http://localhost:8001`) in the shop's
environment so its axios client reaches the correct API host. Without these
variables audit log forwarding will fail silently.

Ensure the detector's `ALLOW_ORIGINS` environment variable includes
`http://localhost:3005` so browsers permit API calls from the demo-shop UI.

With the server running you can simply open `http://localhost:3005/` in your
browser to view the demo shop UI. The static files are served from the
`shop-ui` directory automatically so no additional web server is required.

The service listens on port `3005` by default and exposes simple JSON endpoints:

- `POST /register` – create an account
- `POST /login` – log in and begin a session
- `POST /logout` – log out
- `GET /session` – check whether the current browser session is logged in
- `GET /products` – list products
- `POST /cart` – add a product to the cart (requires `X-Reauth-Password` when
  `REAUTH_PER_REQUEST=true`)
- `GET /cart` – view the cart (requires `X-Reauth-Password` when
  `REAUTH_PER_REQUEST=true`)
- `POST /purchase` – clear the cart (requires `X-Reauth-Password` when
  `REAUTH_PER_REQUEST=true`)

The server builds the API URL from `API_BASE` or `API_PORT` and defaults to
`http://localhost:8001`. Adjust these variables if the APIShield backend is
running elsewhere.
