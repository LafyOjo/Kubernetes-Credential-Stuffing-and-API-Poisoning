const API_BASE = 'http://localhost:3005';
const TOKEN_KEY = 'apiShieldAuthToken';
const AUTH_TOKEN_KEY = 'apiShieldAuthToken';

const envAudit = (typeof process !== 'undefined' && process.env) ? process.env.REACT_APP_AUDIT_URL : undefined;
const AUDIT_BASE = window.location.hostname === 'localhost' ? API_BASE.replace(/:\d+/, ':8001') : envAudit || API_BASE.replace(/:\d+/, ':8001');
const AUDIT_URL = `${AUDIT_BASE}/api/audit/log`;
const APISHIELD_KEY = window.APISHIELD_KEY || 'demo-key';

let username = null;
let reauthRequired = false;

function setContent(html, callback) {
  const el = document.getElementById('content');
  el.style.opacity = 0;
  setTimeout(() => { el.innerHTML = html; el.style.opacity = 1; if (typeof callback === 'function') callback(); }, 150);
}

async function fetchJSON(url, options = {}) {
  const { noAuth, ...opts } = options;
  const fetchOpts = { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...opts };
  if (!noAuth) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) fetchOpts.headers['Authorization'] = `Bearer ${token}`;
    if (reauthRequired) {
      const pw = window.prompt('Please enter your password:');
      if (!pw) { try { await logout(); } catch {} throw new Error('Unauthorized'); }
      fetchOpts.headers['X-Reauth-Password'] = pw;
    }
  }
  let res = await fetch(url, fetchOpts).catch(() => { throw new Error('Network error'); });
  if (res.status === 401 && !noAuth) {
    const pw = window.prompt('Please enter your password:');
    if (!pw) { try { await logout(); } catch {} throw new Error('Unauthorized'); }
    const retry = { ...fetchOpts, headers: { ...fetchOpts.headers, 'X-Reauth-Password': pw } };
    res = await fetch(url, retry);
    if (res.status === 401) { try { await logout(); } catch {} throw new Error('Unauthorized'); }
    reauthRequired = true;
  } else if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function logAuditEvent(event) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json', 'X-API-Key': APISHIELD_KEY };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    await fetch(AUDIT_URL, { method: 'POST', headers, body: JSON.stringify({ event }) });
  } catch (e) {
    console.error('audit log failed', e);
  }
}

// --- Views ---
async function loadProducts(category) {
  document.getElementById('hero').style.display = category ? 'none' : 'block';
  const url = category ? `${API_BASE}/products?category=${encodeURIComponent(category)}` : `${API_BASE}/products`;
  const products = await fetchJSON(url, { noAuth: true });
  const list = products.map(p => `
    <article class="product">
      <div class="img"><img src="${p.image}" alt="${p.name}" loading="lazy"/></div>
      <div class="body">
        <div class="title">${p.name}</div>
        <div class="row"><div class="price">£${p.price}</div><button class="btn" onclick="addToCart(${p.id})">Add</button></div>
      </div>
    </article>
  `).join('');
  setContent(`<div class="stack"><div class="row" style="justify-content:space-between"><h2>${category ? category[0].toUpperCase()+category.slice(1) : 'Featured'}</h2><div class="muted">${products.length} items</div></div><div class="grid">${list}</div></div>`);
}

async function addToCart(id) {
  try { await fetchJSON(`${API_BASE}/cart`, { method:'POST', body: JSON.stringify({ productId: id }) }); showMessage('Added to cart'); updateCartCount(); }
  catch { showMessage('You must be logged in', true); }
}

async function viewCart() {
  try {
    const items = await fetchJSON(`${API_BASE}/cart`);
    const rows = items.map(i => `<tr><td>${i.name}</td><td class="text-end">£${i.price}</td></tr>`).join('');
    setContent(`
      <div class="card">
        <h2>Your Cart</h2>
        <table class="table mb-3" id="cartItems">
          <thead><tr><th>Product</th><th class="text-end">Price</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <button class="btn" onclick="purchase()">Purchase</button>
      </div>`);
  } catch { showMessage('You must be logged in', true); }
}

async function purchase() { await fetchJSON(`${API_BASE}/purchase`, { method:'POST' }); showMessage('Purchase complete'); updateCartCount(); loadProducts(); }

function showServices() { setContent(`<div class="card"><h2>Our Services</h2><ul class="stack"><li>Gift wrapping</li><li>Premium support</li><li>Express shipping</li></ul></div>`); }
function showAbout() { setContent(`<div class="card"><h2>About Us</h2><p class="muted">Demo Shop is a tiny storefront used to showcase API security features.</p></div>`); }
function showContact() { setContent(`<div class="card"><h2>Contact</h2><p>Email: <a href="mailto:support@example.com">support@example.com</a></p><p>Phone: 555‑1234</p></div>`); }

// --- Profile ---
async function showProfile() {
  try {
    const data = await fetchJSON(`${API_BASE}/profile`);
    const p = data.profile || {};
    setContent(`
      <div class="card">
        <h2>Profile</h2>
        <p class="muted" style="margin-top:-.25rem">Manage your contact & shipping details</p>
        <form class="form" id="profileForm">
          <div class="field"><label>Full name</label><input id="pf_fullName" value="${p.fullName || ''}" /></div>
          <div class="field"><label>Email</label><input id="pf_email" value="${p.email || ''}" /></div>
          <div class="field"><label>Phone</label><input id="pf_phone" value="${p.phone || ''}" /></div>
          <div class="field"><label>Address line 1</label><input id="pf_address1" value="${p.address1 || ''}" /></div>
          <div class="field"><label>Address line 2</label><input id="pf_address2" value="${p.address2 || ''}" /></div>
          <div class="field"><label>City</label><input id="pf_city" value="${p.city || ''}" /></div>
          <div class="field"><label>Postcode</label><input id="pf_postcode" value="${p.postcode || ''}" /></div>
          <div class="field"><label>Country</label><input id="pf_country" value="${p.country || ''}" /></div>
          <div class="row"><button class="btn" type="submit">Save</button><span class="muted">${p.updatedAt ? `Updated ${new Date(p.updatedAt).toLocaleString()}` : ''}</span></div>
        </form>
      </div>`);
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        fullName: document.getElementById('pf_fullName').value,
        email: document.getElementById('pf_email').value,
        phone: document.getElementById('pf_phone').value,
        address1: document.getElementById('pf_address1').value,
        address2: document.getElementById('pf_address2').value,
        city: document.getElementById('pf_city').value,
        postcode: document.getElementById('pf_postcode').value,
        country: document.getElementById('pf_country').value,
      };
      try { await fetchJSON(`${API_BASE}/profile`, { method:'POST', body: JSON.stringify(payload) }); showMessage('Profile saved'); }
      catch { showMessage('Failed to save profile', true); }
    });
  } catch { showMessage('Please log in to edit profile', true); }
}

// --- Auth UI (same as your previous app.js, with audit key fix) ---
function showLogin() {
  setContent(`
    <div class="card">
      <h2>Login</h2>
      <form id="loginForm" class="form">
        <div class="field"><label>Username</label><input id="username" type="text" required /></div>
        <div class="field"><label>Password</label><input id="pw" type="password" required /></div>
        <button type="submit" class="btn">Login</button>
      </form>
      <p class="muted">Demo credentials: <code>alice / secret</code></p>
      <p>Or <a href="#" id="registerLink">register</a></p>
    </div>
  `, () => {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      username = document.getElementById('username').value; const pw = document.getElementById('pw').value;
      try {
        const data = await fetchJSON(`${API_BASE}/login`, { method:'POST', body: JSON.stringify({ username, password: pw }), noAuth: true });
        // store a token flag so the dashboard picks it up (demo only)
        localStorage.setItem(TOKEN_KEY, data.access_token || 'session');
        localStorage.setItem(AUTH_TOKEN_KEY, data.access_token || 'session');
        await logAuditEvent('user_login_success');
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-block';
        updateCartCount(); loadProducts();
      } catch { showMessage('Login failed', true); username = null; localStorage.removeItem(TOKEN_KEY); }
    });
    document.getElementById('registerLink').addEventListener('click', showRegister);
  });
}

function showRegister() {
  setContent(`
    <div class="card">
      <h2>Register</h2>
      <form id="regForm" class="form">
        <div class="field"><label>Username</label><input id="regUser" required /></div>
        <div class="field"><label>Password</label><input id="regPw" type="password" required /></div>
        <button type="submit" class="btn">Create account</button>
      </form>
    </div>
  `, () => {
    document.getElementById('regForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = document.getElementById('regUser').value; const pw = document.getElementById('regPw').value;
      try { await fetchJSON(`${API_BASE}/register`, { method:'POST', body: JSON.stringify({ username: u, password: pw }), noAuth: true }); showMessage('Registered! Please log in.'); showLogin(); }
      catch { showMessage('Registration failed', true); }
    });
  });
}

async function checkSession() {
  if (!localStorage.getItem(TOKEN_KEY)) {
    username = null; document.getElementById('loginBtn').style.display = 'inline-block'; document.getElementById('logoutBtn').style.display = 'none'; updateCartCount(); return;
  }
  try {
    const data = await fetchJSON(`${API_BASE}/session`);
    if (data.loggedIn) { username = data.username; document.getElementById('loginBtn').style.display = 'none'; document.getElementById('logoutBtn').style.display = 'inline-block'; }
    else { localStorage.removeItem(TOKEN_KEY); username = null; document.getElementById('loginBtn').style.display = 'inline-block'; document.getElementById('logoutBtn').style.display = 'none'; }
  } catch { localStorage.removeItem(TOKEN_KEY); username = null; document.getElementById('loginBtn').style.display = 'inline-block'; document.getElementById('logoutBtn').style.display = 'none'; }
  updateCartCount();
}

async function logout() {
  try { await fetchJSON(`${API_BASE}/logout`, { method:'POST', noAuth: true }); } catch { showMessage('Logout failed', true); return; }
  await logAuditEvent('user_logout');
  username = null; document.getElementById('loginBtn').style.display = 'inline-block'; document.getElementById('logoutBtn').style.display = 'none'; updateCartCount(); loadProducts();
}

async function updateCartCount() {
  if (!username) { document.getElementById('cartCount').textContent = 0; return; }
  try { const items = await fetchJSON(`${API_BASE}/cart`); document.getElementById('cartCount').textContent = items.length; }
  catch { document.getElementById('cartCount').textContent = 0; }
}

function showMessage(text, isError = false) {
  const msg = document.getElementById('message');
  msg.classList.toggle('alert-danger', isError); msg.textContent = text; msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 1600);
}

function init() {
  document.getElementById('homeBtn').addEventListener('click', () => loadProducts());
  document.getElementById('menBtn').addEventListener('click', () => loadProducts('men'));
  document.getElementById('womenBtn').addEventListener('click', () => loadProducts('women'));
  document.getElementById('accessBtn').addEventListener('click', () => loadProducts('access'));
  document.getElementById('aboutBtn')?.addEventListener('click', showAbout);
  document.getElementById('cartBtn').addEventListener('click', viewCart);
  document.getElementById('loginBtn').addEventListener('click', showLogin);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('statsBtn').addEventListener('click', viewStats);
  document.getElementById('servicesBtn').addEventListener('click', showServices);
  document.getElementById('contactBtn').addEventListener('click', showContact);
  document.getElementById('profileBtn').addEventListener('click', showProfile);
  document.getElementById('shopMenBtn').addEventListener('click', () => loadProducts('men'));
  document.getElementById('shopWomenBtn').addEventListener('click', () => loadProducts('women'));

  loadProducts();
  checkSession();

  // Poll for token changes across tabs/apps
  let lastToken = localStorage.getItem(AUTH_TOKEN_KEY);
  setInterval(() => { const current = localStorage.getItem(AUTH_TOKEN_KEY); if (current !== lastToken) { lastToken = current; checkSession(); } }, 1000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

// stats view for API calls (unchanged)
async function viewStats() {
  try {
    const data = await fetchJSON(`${API_BASE}/api-calls`);
    const list = Object.entries(data).map(([user, count]) => `<li>${user}: ${count}</li>`).join('');
    setContent(`<div class="card"><h2>API Calls</h2><ul class="stack">${list}</ul></div>`);
  } catch { showMessage('Failed to load stats', true); }
}