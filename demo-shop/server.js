const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3005;
const API_BASE = process.env.API_BASE || 'http://localhost:8001';

app.use(bodyParser.json());
app.use(session({
  secret: 'demo-secret',
  resave: false,
  saveUninitialized: true
}));

const products = [
  { id: 1, name: 'Demo Socks', price: 10 },
  { id: 2, name: 'Demo Hat', price: 15 }
];

const users = {};

function requireAuth(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const pw = req.get('X-Reauth-Password');
  if (!pw || pw !== req.session.password) {
    return res.status(401).json({ error: 'Reauthentication failed' });
  }
  next();
}

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'missing' });
  if (users[username]) return res.status(409).json({ error: 'exists' });
  users[username] = { password, cart: [] };
  try {
    await axios.post(`${API_BASE}/register`, { username, password });
  } catch (e) {
    console.error('Register API call failed');
  }
  res.json({ status: 'ok' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!users[username] || users[username].password !== password) {
    try {
      await axios.post(`${API_BASE}/score`, {
        client_ip: req.ip,
        auth_result: 'failure',
        with_jwt: false
      });
    } catch (e) {
      console.error('Score API call failed');
    }
    return res.status(401).json({ error: 'invalid credentials' });
  }
  req.session.username = username;
  req.session.password = password;
  try {
    await axios.post(`${API_BASE}/score`, {
      client_ip: req.ip,
      auth_result: 'success',
      with_jwt: false
    });
  } catch (e) {
    console.error('Score API call failed');
  }
  res.json({ status: 'ok' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ status: 'ok' }));
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

app.listen(PORT, () => {
  console.log(`Demo shop running on port ${PORT}`);
});
