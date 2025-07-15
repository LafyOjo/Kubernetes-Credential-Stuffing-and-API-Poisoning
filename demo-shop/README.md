# Demo Shop

This directory contains a very small Node.js-based e-commerce example used in place of the previous shop demo.
It demonstrates integration with the APIShield+ backend. User registrations and login attempts are forwarded to the
backend so detections still work. Each protected endpoint checks the `X-Reauth-Password` header to require the user's
password on every request.

## Running

```
cd demo-shop
npm install
node server.js
```

The service listens on port `3005` by default and exposes simple JSON endpoints:

- `POST /register` – create an account
- `POST /login` – log in and begin a session
- `POST /logout` – log out
- `GET /products` – list products
- `POST /cart` – add a product to the cart (requires `X-Reauth-Password`)
- `GET /cart` – view the cart (requires `X-Reauth-Password`)
- `POST /purchase` – clear the cart (requires `X-Reauth-Password`)

Set `API_BASE` to point at the running APIShield+ backend if it isn't at `http://localhost:8001`.
