# Demo Shop

This directory contains a very small Node.js-based e-commerce example used in place of the previous shop demo.
It can integrate with the APIShield+ backend for additional telemetry. By default
this forwarding is **disabled** so the shop can run standalone without errors.
Set the environment variable `FORWARD_API=true` to enable calls to the backend.
Requests to the API use a short timeout controlled by `API_TIMEOUT_MS` (default `2000`).
Each protected endpoint checks the `X-Reauth-Password` header to require the
user's password on every request.

The server pre-registers a demo account so you can log in immediately with
`alice`/`secret`.

## Running

```
cd demo-shop
npm install
node server.js
```

With the server running you can simply open `http://localhost:3005/` in your
browser to view the demo shop UI. The static files are served from the
`shop-ui` directory automatically so no additional web server is required.

The service listens on port `3005` by default and exposes simple JSON endpoints:

- `POST /register` – create an account
- `POST /login` – log in and begin a session
- `POST /logout` – log out
- `GET /products` – list products
- `POST /cart` – add a product to the cart (requires `X-Reauth-Password`)
- `GET /cart` – view the cart (requires `X-Reauth-Password`)
- `POST /purchase` – clear the cart (requires `X-Reauth-Password`)

Set `API_BASE` to point at the running APIShield+ backend if it isn't at `http://localhost:8001`.
