const API_BASE = 'http://localhost:3005';
const TOKEN_KEY = 'apiShieldAuthToken';

const AUTH_TOKEN_KEY = 'apiShieldAuthToken';
// Allow overriding the audit service base URL via environment variables; otherwise
// replace any port in API_BASE with :8001 for local development.
const envAudit =
  typeof process !== 'undefined' && process.env
    ? process.env.REACT_APP_AUDIT_URL
    : undefined;
const AUDIT_BASE =
  window.location.hostname === 'localhost'
    ? API_BASE.replace(/:\d+/, ':8001')
    : envAudit || API_BASE.replace(/:\d+/, ':8001');
const AUDIT_URL = `${AUDIT_BASE}/api/audit/log`;

let username = null;
let reauthRequired = false;

function setContent(html, callback) {
  $('#content').fadeOut(200, function () {
    $('#content').html(html).fadeIn(200, function () {
      if (typeof callback === 'function') callback();
    });
  });
}

async function fetchJSON(url, options = {}) {
  const { noAuth, ...opts } = options;
  const fetchOpts = { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...opts };
  if (!noAuth) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      fetchOpts.headers['Authorization'] = `Bearer ${token}`;
    }
    if (reauthRequired) {
      const pw = window.prompt('Please enter your password:');
      if (!pw) {
        try { await logout(); } catch {}
        throw new Error('Unauthorized');
      }
      fetchOpts.headers['X-Reauth-Password'] = pw;
    }
  }
  let res;
  try {
    res = await fetch(url, fetchOpts);
  } catch {
    throw new Error('Network error');
  }
  if (res.status === 401 && !noAuth) {
    const pw = window.prompt('Please enter your password:');
    if (!pw) {
      try { await logout(); } catch {}
      throw new Error('Unauthorized');
    }
    const retryOpts = {
      ...fetchOpts,
      headers: { ...fetchOpts.headers, 'X-Reauth-Password': pw }
    };
    res = await fetch(url, retryOpts);
    if (res.status === 401) {
      try { await logout(); } catch {}
      throw new Error('Unauthorized');
    }
    reauthRequired = true;
  } else if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function logAuditEvent(event) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  try {
    await fetch(AUDIT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ event })
    });
  } catch (e) {
    // ignore logging errors
    console.error('audit log failed', e);
  }
}

async function loadProducts() {
  const products = await fetchJSON(`${API_BASE}/products`, { noAuth: true });
  const list = products.map(p => `
    <div class="col-md-4 mb-3">
      <div class="card h-100 text-center">
        <div class="card-body">
          <h5 class="card-title">${p.name}</h5>
          <p class="card-text">$${p.price}</p>
          <button class="btn btn-primary" onclick="addToCart(${p.id})">Add to cart</button>
        </div>
      </div>
    </div>`).join('');
  setContent(`<div class="card"><h2 class="mb-4">Products</h2><div class="row">${list}</div></div>`);
}

async function addToCart(id) {
  try {
    await fetchJSON(`${API_BASE}/cart`, {
      method: 'POST',
      body: JSON.stringify({ productId: id })
    });
    showMessage('Added to cart');
    updateCartCount();
  } catch (e) {
    showMessage('You must be logged in', true);
  }
}

async function viewCart() {
  try {
    const items = await fetchJSON(`${API_BASE}/cart`);
    const rows = items.map(i => `<tr><td>${i.name}</td><td class="text-end">$${i.price}</td></tr>`).join('');
    setContent(`
      <div class="card">
        <h2>Your Cart</h2>
        <table class="table mb-3" id="cartItems">
          <thead><tr><th>Product</th><th class="text-end">Price</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <button class="btn btn-primary" onclick="purchase()">Purchase</button>
      </div>
    `);
  } catch (e) {
    showMessage('You must be logged in', true);
  }
}

async function purchase() {
  await fetchJSON(`${API_BASE}/purchase`, { method: 'POST' });
  showMessage('Purchase complete');
  updateCartCount();
  loadProducts();
}

function showServices() {
  setContent(`
    <div class="card">
      <h2>Our Services</h2>
      <ul class="list-group mb-3">
        <li class="list-group-item">Gift wrapping</li>
        <li class="list-group-item">Premium support</li>
        <li class="list-group-item">Express shipping</li>
      </ul>
    </div>
  `);
}

function showAbout() {
  setContent(`
    <div class="card">
      <h2>About Us</h2>
      <p class="lead">Demo Shop is a tiny storefront used to showcase API security features.</p>
      <p>All purchases are simulated and no real payments are processed.</p>
    </div>
  `);
}

function showContact() {
  setContent(`
    <div class="card">
      <h2>Contact Us</h2>
      <p>Email: <a href="mailto:support@example.com">support@example.com</a></p>
      <p>Phone: 555-1234</p>
    </div>
  `);
}

async function viewStats() {
  try {
    const data = await fetchJSON(`${API_BASE}/api-calls`);
    const list = Object.entries(data)
      .map(([user, count]) => `<li>${user}: ${count}</li>`)
      .join('');
    setContent(`<div class="card"><h2>API Calls</h2><ul class="stats-list">${list}</ul></div>`);
  } catch (e) {
    showMessage('Failed to load stats', true);
  }
}

function showLogin() {
  setContent(`
    <div class="card">
      <h2>Login</h2>
      <form id="loginForm">
        <div class="form-group">
          <label>Username</label>
          <input id="username" type="text" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input id="pw" type="password" class="form-control" required>
        </div>
        <button type="submit" class="btn btn-primary">Login</button>
      </form>
      <p>Demo credentials: alice / secret</p>
      <p>Or <a href="#" id="registerLink">register</a></p>
    </div>
  `, () => {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      username = document.getElementById('username').value;
      const pw = document.getElementById('pw').value;
      try {
        const data = await fetchJSON(`${API_BASE}/login`, {
          method: 'POST',
          body: JSON.stringify({ username, password: pw }),
          noAuth: true
        });
        localStorage.setItem(TOKEN_KEY, data.access_token);

        localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
        await logAuditEvent('user_login_success');
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-block';
        updateCartCount();
        loadProducts();
      } catch (e) {
        showMessage('Login failed', true);
        username = null;
        localStorage.removeItem(TOKEN_KEY);
      }
    });
    document.getElementById('registerLink').addEventListener('click', showRegister);
  });
}

function showRegister() {
  setContent(`
    <div class="card">
      <h2>Register</h2>
      <form id="regForm">
        <input type="text" id="regUser" placeholder="Username" required><br>
        <input type="password" id="regPw" placeholder="Password" required><br>
        <button type="submit" class="btn btn-primary">Register</button>
      </form>
    </div>
  `, () => {
    document.getElementById('regForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const usernameVal = document.getElementById('regUser').value;
      const pw = document.getElementById('regPw').value;
      try {
        await fetchJSON(`${API_BASE}/register`, {
          method: 'POST',
          body: JSON.stringify({ username: usernameVal, password: pw }),
          noAuth: true
        });
        showMessage('Registered! Please log in.');
        showLogin();
      } catch (e) {
        showMessage('Registration failed', true);
      }
    });
  });
}

// Determine whether the user already has an active session
async function checkSession() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    username = null;
    document.getElementById('loginBtn').style.display = 'inline-block';
    document.getElementById('logoutBtn').style.display = 'none';
    updateCartCount();
    return;
  }
  try {
    const data = await fetchJSON(`${API_BASE}/session`);
    if (data.loggedIn) {
      username = data.username;
      document.getElementById('loginBtn').style.display = 'none';
      document.getElementById('logoutBtn').style.display = 'inline-block';
    } else {
      localStorage.removeItem(TOKEN_KEY);
      username = null;
      document.getElementById('loginBtn').style.display = 'inline-block';
      document.getElementById('logoutBtn').style.display = 'none';
    }
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    username = null;
    document.getElementById('loginBtn').style.display = 'inline-block';
    document.getElementById('logoutBtn').style.display = 'none';
  }
  updateCartCount();
}

async function logout() {
  try {
    await fetchJSON(`${API_BASE}/logout`, { method: 'POST', noAuth: true });
  } catch {
    showMessage('Logout failed', true);
    return;
  }
  await logAuditEvent('user_logout');
  username = null;
  document.getElementById('loginBtn').style.display = 'inline-block';
  document.getElementById('logoutBtn').style.display = 'none';
  updateCartCount();
  loadProducts();
}

async function updateCartCount() {
  if (!username) {
    document.getElementById('cartCount').textContent = 0;
    return;
  }
  try {
    const items = await fetchJSON(`${API_BASE}/cart`);
    document.getElementById('cartCount').textContent = items.length;
  } catch {
    document.getElementById('cartCount').textContent = 0;
  }
}

function showMessage(text, isError = false) {
  const msg = $('#message');
  msg.toggleClass('alert-danger', isError).toggleClass('alert-success', !isError);
  msg.text(text).fadeIn(200).delay(1500).fadeOut(200);
}

function init() {
  document.getElementById('homeBtn').addEventListener('click', loadProducts);
  document.getElementById('aboutBtn').addEventListener('click', showAbout);
  document.getElementById('cartBtn').addEventListener('click', viewCart);
  document.getElementById('loginBtn').addEventListener('click', showLogin);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('statsBtn').addEventListener('click', viewStats);
  document.getElementById('servicesBtn').addEventListener('click', showServices);
  document.getElementById('contactBtn').addEventListener('click', showContact);

  loadProducts();
  checkSession();

  // Poll for token changes across tabs/apps
  let lastToken = localStorage.getItem(AUTH_TOKEN_KEY);
  setInterval(() => {
    const current = localStorage.getItem(AUTH_TOKEN_KEY);
    if (current !== lastToken) {
      lastToken = current;
      checkSession();
    }
  }, 1000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
