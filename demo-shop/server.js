const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors({ origin: ["http://localhost:3000", "http://127.0.0.1:3000"], credentials: true }));
const PORT = process.env.PORT || 3005;
const API_BASE = process.env.API_BASE || 'http://localhost:8001';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT_MS || '10000', 10);
const API_KEY = process.env.API_KEY || '';
const APISHIELD_URL = process.env.APISHIELD_URL || 'http://localhost:8001';
axios.defaults.timeout = API_TIMEOUT;
if (API_KEY) {
  axios.defaults.headers.common['X-API-Key'] = API_KEY;
}

// Disable backend integration entirely by setting FORWARD_API=false
const FORWARD_API = process.env.FORWARD_API === 'true';
const REAUTH_PER_REQUEST = process.env.REAUTH_PER_REQUEST === 'true';

async function sendAuthEvent({ user, action, success, source }) {
  try {
    await fetch(`${APISHIELD_URL}/events/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(API_KEY ? { 'X-API-Key': API_KEY } : {}) },
      body: JSON.stringify({ user, action, success, source })
    });
  } catch (e) {
    console.error('Failed to send auth event:', e.message);
  }
}

app.use(bodyParser.json());
app.use(session({
  secret: 'demo-secret',
  resave: false,
  saveUninitialized: true
}));

// Serve the static front-end so visiting '/' shows the shop UI
app.use(express.static(path.join(__dirname, '../shop-ui')));

// --- Product catalog with images & categories ---
const products = [
  { id: 1,  name: 'Tree Runner NZ',     price: 110, category: 'men',    image: '/images/product-1.jpg' },
  { id: 2,  name: 'Tree Runner Cruiser',price: 110, category: 'women',  image: '/images/product-2.jpg' },
  { id: 3,  name: 'Wool Runner MZ',     price: 120, category: 'men',    image: '/images/product-3.jpg' },
  { id: 4,  name: 'Wool Runner MZ W',   price: 120, category: 'women',  image: '/images/product-4.jpg' },
  { id: 5,  name: 'Everyday No‑Show',   price: 14,  category: 'access', image: '/images/product-5.jpg' },
  { id: 6,  name: 'Everyday Ankle',     price: 16,  category: 'access', image: '/images/product-6.jpg' },
  { id: 7,  name: 'Trino™ Tee',         price: 35,  category: 'men',    image: '/images/product-7.jpg' },
  { id: 8,  name: 'Trino™ Tee W',       price: 35,  category: 'women',  image: '/images/product-8.jpg' },
  { id: 9,  name: 'Everyday Cap',       price: 22,  category: 'access', image: '/images/product-9.jpg' },
  { id: 10, name: 'Wool Hoodie',        price: 95,  category: 'men',    image: '/images/product-10.jpg' },
  { id: 11, name: 'Wool Hoodie W',      price: 95,  category: 'women',  image: '/images/product-11.jpg' },
  { id: 12, name: 'Sport Duffel',       price: 55,  category: 'access', image: '/images/product-12.jpg' }
];

// Pre‑register a demo user so the credentials alice/secret work out of the box
const users = {
  alice: {
    password: 'secret',
    cart: [],
    profile: {
      fullName: 'Alice Doe',
      email: 'alice@example.com',
      phone: '',
      address1: '1 Demo Street',
      address2: '',
      city: 'Sampleville',
      postcode: 'AB1 2CD',
      country: 'UK',
      updatedAt: new Date().toISOString(),
    }
  }
};

function requireAuth(req, res, next) {
  if (!req.session.username) return res.status(401).json({ error: 'Unauthorized' });
  if (REAUTH_PER_REQUEST) {
    const pw = req.get('X-Reauth-Password');
    if (!pw || pw !== req.session.password) {
      return res.status(401).json({ error: 'Reauthentication failed' });
    }
  }
  next();
}

// --- Auth ---
app.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing' });
  if (users[username]) return res.status(409).json({ error: 'exists' });
  users[username] = { password, cart: [], profile: { fullName: '', email: '', phone: '', address1: '', address2: '', city: '', postcode: '', country: '' } };
  if (FORWARD_API) {
    try {
      await axios.post(`${API_BASE}/register`, { username, password }, { timeout: API_TIMEOUT });
    } catch { console.error('Register API call failed'); }
    try {
      await axios.post(`${API_BASE}/api/audit/log`, { event: 'user_register', username }, { timeout: API_TIMEOUT });
    } catch { console.error('Audit log failed'); }
  }
  res.json({ status: 'ok' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const ok = !!users[username] && users[username].password === password;
  sendAuthEvent({ user: username || null, action: 'demo-shop', success: !!ok, source: 'demo-shop' });
  if (!ok) {
    if (FORWARD_API) {
      try { await axios.post(`${API_BASE}/login`, { username, password }, { timeout: API_TIMEOUT }); } catch (e) { if (e.response?.status !== 401) console.error('Login API call failed'); }
      try { await axios.post(`${API_BASE}/score`, { client_ip: req.ip, auth_result: 'failure', with_jwt: false }, { timeout: API_TIMEOUT }); } catch { console.error('Score API call failed'); }
      try { await axios.post(`${API_BASE}/api/audit/log`, { event: 'user_login_failure', username }, { timeout: API_TIMEOUT }); } catch { console.error('Audit log failed'); }
    }
    return res.status(401).json({ error: 'invalid credentials' });
  }
  req.session.username = username;
  req.session.password = password;
  if (FORWARD_API) {
    try {
      const apiResp = await axios.post(`${API_BASE}/login`, { username, password }, { timeout: API_TIMEOUT });
      req.session.apiToken = apiResp.data.access_token;
    } catch { console.error('Backend login failed'); }
    try { await axios.post(`${API_BASE}/score`, { client_ip: req.ip, auth_result: 'success', with_jwt: false }, { timeout: API_TIMEOUT }); } catch { console.error('Score API call failed'); }
    try { await axios.post(`${API_BASE}/api/audit/log`, { event: 'user_login_success', username }, { timeout: API_TIMEOUT }); } catch { console.error('Audit log failed'); }
  }
  res.json({ status: 'ok' });
});

app.post('/logout', async (req, res) => {
  if (FORWARD_API && req.session.apiToken) {
    try { await axios.post(`${API_BASE}/logout`, null, { headers: { Authorization: `Bearer ${req.session.apiToken}` }, timeout: API_TIMEOUT }); } catch (e) { console.error('Backend logout failed', e); }
  }
  if (FORWARD_API) {
    try { await axios.post(`${API_BASE}/api/audit/log`, { event: 'user_logout', username: req.session.username }, { timeout: API_TIMEOUT }); } catch (e) { console.error('Audit log failed', e); }
  }
  const username = req.session.username;
  req.session.apiToken = null;
  req.session.destroy(err => {
    sendAuthEvent({ user: username || null, action: 'demo-shop', success: !err, source: 'demo-shop' });
    if (err) { console.error('Session destruction failed', err); return res.status(500).json({ status: 'error' }); }
    res.json({ status: 'ok' });
  });
});

// --- Profile ---
app.get('/profile', requireAuth, (req, res) => {
  const u = users[req.session.username];
  res.json({ username: req.session.username, profile: u.profile || {} });
});

app.post('/profile', requireAuth, async (req, res) => {
  const cur = users[req.session.username];
  cur.profile = { ...cur.profile, ...(req.body || {}), updatedAt: new Date().toISOString() };
  if (FORWARD_API) {
    try { await axios.post(`${API_BASE}/api/audit/log`, { event: 'profile_update', username: req.session.username }, { timeout: API_TIMEOUT }); } catch { console.error('Audit log failed'); }
  }
  res.json({ status: 'ok', profile: cur.profile });
});

// --- Catalog & Cart ---
app.get('/products', (req, res) => {
  const { category } = req.query; // men | women | access
  const list = category ? products.filter(p => p.category === String(category)) : products;
  res.json(list);
});

app.post('/cart', requireAuth, (req, res) => {
  const { productId } = req.body || {};
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

// Report whether the current session is authenticated
app.get('/session', (req, res) => {
  if (req.session.username) return res.json({ loggedIn: true, username: req.session.username });
  res.json({ loggedIn: false });
});

app.get('/api-calls', requireAuth, async (req, res) => {
  if (!req.session.apiToken) return res.status(401).json({ error: 'no api token' });
  if (!FORWARD_API) return res.json({});
  try {
    const resp = await axios.get(`${API_BASE}/api/user-calls`, { headers: { Authorization: `Bearer ${req.session.apiToken}` }, timeout: API_TIMEOUT });
    res.json(resp.data);
  } catch {
    console.error('User call fetch failed');
    res.status(500).json({ error: 'failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Demo shop running on port ${PORT}`);
  const url = `http://localhost:${PORT}/`;
  const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try { const child = spawn(cmd, [url], { stdio: 'ignore', detached: true }); child.on('error', () => {}); child.unref(); } catch {}
});