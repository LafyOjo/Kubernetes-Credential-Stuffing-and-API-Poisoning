const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3005;
const API_BASE = process.env.API_BASE || 'http://localhost:8001';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT_MS || '10000', 10);
const API_KEY = process.env.API_KEY || '';
axios.defaults.timeout = API_TIMEOUT;
if (API_KEY) {
  axios.defaults.headers.common['X-API-Key'] = API_KEY;
}
// Disable backend integration entirely by setting FORWARD_API=false
// Disable integration with the APIShield backend unless explicitly enabled.
// Most demos run the shop standalone so suppress the noisy API errors by default.
const FORWARD_API = process.env.FORWARD_API === 'true';
const REAUTH_PER_REQUEST = process.env.REAUTH_PER_REQUEST === 'true';

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

// Pre‑register a demo user so the credentials alice/secret work out of the box
const users = {
  alice: { password: 'secret', cart: [] }
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

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'missing' });
  if (users[username]) return res.status(409).json({ error: 'exists' });
  users[username] = { password, cart: [] };
  if (FORWARD_API) {
    try {
            await axios.post(
        `${API_BASE}/register`,
        { username, password },
        { timeout: API_TIMEOUT }
      );
    } catch (e) {
      console.error('Register API call failed');
    }
    try {
      await axios.post(
        `${API_BASE}/api/audit/log`,
        { event: 'user_register', username },
        { timeout: API_TIMEOUT }
      );
    } catch (e) {
      console.error('Audit log failed');
    }
  }
  res.json({ status: 'ok' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!users[username] || users[username].password !== password) {
    if (FORWARD_API) {
      try {
        await axios.post(
          `${API_BASE}/login`,
          { username, password },
          { timeout: API_TIMEOUT }
        );
      } catch (e) {
        // Ignore expected 401 but surface other errors
        if (e.response?.status !== 401) {
          console.error('Login API call failed');
        }
      }
      try {
        await axios.post(
          `${API_BASE}/score`,
          {
            client_ip: req.ip,
            auth_result: 'failure',
            with_jwt: false
          },
          { timeout: API_TIMEOUT }
        );
      } catch (e) {
        console.error('Score API call failed');
      }
      try {
        await axios.post(
          `${API_BASE}/api/audit/log`,
          { event: 'user_login_failure', username },
          { timeout: API_TIMEOUT }
        );
      } catch (e) {
        console.error('Audit log failed');
      }
    }
    return res.status(401).json({ error: 'invalid credentials' });
  }
  req.session.username = username;
  req.session.password = password;
  if (FORWARD_API) {
    try {
const apiResp = await axios.post(
        `${API_BASE}/login`,
        { username, password },
        { timeout: API_TIMEOUT }
      );      req.session.apiToken = apiResp.data.access_token;
    } catch (e) {
      console.error('Backend login failed');
    }
    try {
      await axios.post(       `${API_BASE}/score`,
        {
          client_ip: req.ip,
          auth_result: 'success',
          with_jwt: false
        },
        { timeout: API_TIMEOUT }
      );
    } catch (e) {
      console.error('Score API call failed');
    }
    try {
      await axios.post(
        `${API_BASE}/api/audit/log`,
        { event: 'user_login_success', username },
        { timeout: API_TIMEOUT }
      );
    } catch (e) {
      console.error('Audit log failed');
    }
  }
  res.json({ status: 'ok' });
});

app.post('/logout', async (req, res) => {
  if (FORWARD_API && req.session.apiToken) {
    try {
      await axios.post(
        `${API_BASE}/logout`,
        null,
        {
          headers: { Authorization: `Bearer ${req.session.apiToken}` },
          timeout: API_TIMEOUT,
        }
      );
    } catch (e) {
      console.error('Backend logout failed', e);
    }
  }
  if (FORWARD_API) {
    try {
      await axios.post(
        `${API_BASE}/api/audit/log`,
        { event: 'user_logout', username: req.session.username },
        { timeout: API_TIMEOUT }
      );
    } catch (e) {
      console.error('Audit log failed', e);
    }
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

app.get('/cart', requireAuth, (req, res) => {
  res.json(users[req.session.username].cart);
});

app.post('/purchase', requireAuth, (req, res) => {
  users[req.session.username].cart = [];
  res.json({ status: 'purchased' });
});

app.get('/api-calls', requireAuth, async (req, res) => {
  if (!req.session.apiToken) {
    return res.status(401).json({ error: 'no api token' });
  }
  if (!FORWARD_API) {
    return res.json({});
  }
  try {
    const resp = await axios.get(
      `${API_BASE}/api/user-calls`,
      {
        headers: { Authorization: `Bearer ${req.session.apiToken}` },
        timeout: API_TIMEOUT,
      }
    );
    res.json(resp.data);
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
