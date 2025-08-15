# Demo Shop UI

This directory contains a very simple HTML/JavaScript front-end for the Node.js demo shop.

Open `index.html` in your browser after starting the shop server with:

```bash
cd demo-shop
npm install
node server.js
```

The UI communicates with the API on `http://localhost:3005`. You can browse products, register and log in, add items to your cart, and simulate a purchase. Each protected action includes the password in the `X-Reauth-Password` header so the backend can validate the session on every request. If a protected call is denied (HTTP 401), the UI now logs you out automatically so the login button becomes available again.

FORWARD_API=true
API_BASE=http://127.0.0.1:8001
API_KEY=demo-key
API_TIMEOUT_MS=5000