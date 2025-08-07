const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3005;
// Build the API base URL from API_BASE. Defaults to 127.0.0.1:8001.
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8001';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT_MS || '2000', 10);
// Forward shop events to the APIShield backend unless explicitly disabled.
// Disable backend integration entirely by setting FORWARD_API=false.
const FORWARD_API = process.env.FORWARD_API !== 'false';
const REAUTH_PER_REQUEST = process.env.REAUTH_PER_REQUEST === 'true';
// ZERO_TRUST_API_KEY used for authenticating backend requests
const API_KEY = process.env.API_KEY;
if (FORWARD_API && !API_KEY) {
  console.error(
    'Missing API_KEY environment variable. Start the shop with `API_KEY=<your ZERO_TRUST_API_KEY> node server.js`.'
  );
  process.exit(1);
}

const api = axios.create({ baseURL: API_BASE, timeout: API_TIMEOUT });
if (API_KEY) {
  api.defaults.headers.common['X-API-Key'] = API_KEY;
}

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3005',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3005'
    ],
    credentials: true
  })
);
app.use(bodyParser.json());
app.use(session({
  secret: 'demo-secret',
  resave: false,
  saveUninitialized: true
}));

// Serve the static front-end so visiting '/' shows the shop UI
app.use(express.static(path.join(__dirname, '../shop-ui')));

const products = [
  { id: 1, name: 'Demo Socks', price: 10 },
  { id: 2, name: 'Demo Hat', price: 15 },
  { id: 3, name: 'Demo T-Shirt', price: 20 },
  { id: 4, name: 'Demo Mug', price: 8 },
  { id: 5, name: 'VIP Support', price: 50 },
  { id: 6, name: 'Demo Hoodie', price: 35 },
  { id: 7, name: 'Sticker Pack', price: 5 },
  { id: 8, name: 'Demo Backpack', price: 45 },
  { id: 9, name: 'Water Bottle', price: 12 },
  { id: 10, name: 'Demo Sunglasses', price: 25 },
  { id: 11, name: 'Running Shorts', price: 30 },
  { id: 12, name: 'Training Jacket', price: 60 },
  { id: 13, name: 'Athletic Pants', price: 40 },
  { id: 14, name: 'Sports Duffel', price: 55 },
  { id: 15, name: 'Performance Cap', price: 22 }
];

// Pre‑register demo users so the credentials alice/secret and
// ben/ILikeN1G3R!A##? work out of the box
const users = {
  alice: { password: 'secret', cart: [] },
  ben: { password: 'ILikeN1G3R!A##?', cart: [] }
};

function requireAuth(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (REAUTH_PER_REQUEST) {
    const pw = req.get('X-Reauth-Password');
    if (!pw || pw !== req.session.password) {
      return res.status(401).json({ error: 'Reauthentication failed' });
    }
  }
  next();
}

async function sendAuditLog(req, event, usernameOverride) {
  if (!FORWARD_API) return;
  const username = usernameOverride || req.session.username;
  if (!username) {
    console.error('Missing username for audit log');
    return;
  }
  try {
    await api.post('/api/audit/log', { event, username });
  } catch (e) {
    console.error('Audit log failed', e);
  }
}

app.post('/register', async (req, res) => {
  // Accept both the legacy `user`/`pass` fields and the
  // newer `username`/`password` pair used by the backend.
  const username = req.body.username || req.body.user;
  const password = req.body.password || req.body.pass;
  if (!username || !password) return res.status(400).json({ error: 'missing' });
  if (users[username]) return res.status(409).json({ error: 'exists' });
  users[username] = { password, cart: [] };
  if (FORWARD_API) {
    try {
      await api.post('/register', { username, password });
    } catch (e) {
      console.error('Register API call failed');
    }
    await sendAuditLog(req, 'user_register', username);
  }
  res.json({ status: 'ok' });
});

app.post('/login', async (req, res) => {
  // Handle both `username`/`password` and legacy `user`/`pass` fields.
  const username = req.body.username || req.body.user;
  const password = req.body.password || req.body.pass;
  if (!users[username] || users[username].password !== password) {
    if (FORWARD_API) {
      await api
        .post('/login', { username, password })
        .catch((e) => {
          // Ignore expected 401 but surface other errors
          if (e.response?.status !== 401) {
            console.error('Login API call failed', e);
          }
        });
      try {
        await api.post('/score', {
          client_ip: req.ip,
          auth_result: 'failure',
          with_jwt: false,
        });
      } catch (e) {
        console.error('Score API call failed');
      }
      await sendAuditLog(req, 'user_login_failure', username);
    }
    return res.status(401).json({ error: 'invalid credentials' });
  }
  req.session.username = username;
  req.session.password = password;
  if (FORWARD_API) {
    try {
      const apiResp = await api.post('/login', { username, password });
      req.session.apiToken = apiResp.data.access_token;
    } catch (e) {
      console.error('Backend login failed');
    }
    try {
      await api.post('/score', {
        client_ip: req.ip,
        auth_result: 'success',
        with_jwt: false,
      });
    } catch (e) {
      console.error('Score API call failed');
    }
    await sendAuditLog(req, 'user_login_success', username);
  }
  res.json({ access_token: req.session.apiToken || null });
});

app.post('/logout', async (req, res) => {
  if (FORWARD_API) {
    if (req.session.apiToken) {
      try {
        await api.post('/logout', null, {
          headers: { Authorization: `Bearer ${req.session.apiToken}` },
        });
      } catch (e) {
        console.error('Backend logout failed', e);
      }
    }
    await sendAuditLog(req, 'user_logout');
  }
  req.session.apiToken = null;
  req.session.destroy(() => res.json({ status: 'ok' }));
});

// Report whether the current session is authenticated
app.get('/session', (req, res) => {
  if (req.session.username) {
    return res.json({ loggedIn: true, username: req.session.username });
  }
  res.json({ loggedIn: false });
});

app.get('/products', (req, res) => {
  res.json(products);
});

app.post('/cart', requireAuth, (req, res) => {
  const { productId } = req.body;
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'not found' });
  users[req.session.username].cart.push(product);
  res.json({ status: 'added' });
});

app.get('/cart', async (req, res) => {
  let token = null;
  const auth = req.get('Authorization');
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.session.apiToken) {
    token = req.session.apiToken;
  }
  if (!token) {
    return res.status(401).send('Unauthorized');
  }
  try {
    const me = await api.get('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const username = me.data.username;
    const userCart = users[username]?.cart || [];
    res.json({ items: userCart });
  } catch (e) {
    res.status(401).send('Unauthorized');
  }
});

app.post('/purchase', requireAuth, (req, res) => {
  users[req.session.username].cart = [];
  res.json({ status: 'purchased' });
});

app.get('/activity/:username', requireAuth, async (req, res) => {
  if (!req.session.apiToken) {
    return res.status(401).json({ error: 'no api token' });
  }
  if (!FORWARD_API) {
    return res.json([]);
  }
  try {
    const resp = await api.get(`/api/audit/activity/${req.params.username}`, {
      headers: { Authorization: `Bearer ${req.session.apiToken}` },
    });
    res.json(resp.data);
  } catch (e) {
    console.error('Activity fetch failed');
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api-calls', requireAuth, async (req, res) => {
  if (!req.session.apiToken) {
    return res.status(401).json({ error: 'no api token' });
  }
  if (!FORWARD_API) {
    return res.json({});
  }
  try {
    const resp = await api.get('/api/user-calls/me', {
      headers: { Authorization: `Bearer ${req.session.apiToken}` },
    });
    const count = resp.data.count ?? resp.data;
    res.json({ [req.session.username]: count });
  } catch (e) {
    console.error('User call fetch failed');
    res.status(500).json({ error: 'failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Demo shop running on port ${PORT}`);
  // Automatically open the shop home page in the default browser
  const url = `http://localhost:${PORT}/`;
  const cmd = process.platform === 'win32'
    ? 'start'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  try {
    const child = spawn(cmd, [url], { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    // ignore failures on systems without an opener
  }
});
