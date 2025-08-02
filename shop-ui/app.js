const API_BASE = '';
let username = null;

function setContent(html) {
  $('#content').fadeOut(200, function () {
    $('#content').html(html).fadeIn(200);
  });
}

async function fetchJSON(url, options = {}) {
  const { noAuth, ...opts } = options;
  const fetchOpts = { headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', ...opts };
  if (!noAuth) {
    const pw = prompt('Please re-enter your password');
    if (pw === null) throw new Error('Password required');
    fetchOpts.headers['X-Reauth-Password'] = pw;
  }
  const res = await fetch(url, fetchOpts);
  if (res.status === 401) {
    try {
      await logout();
    } catch {}
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
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
  setContent(`<h2 class="mb-4">Products</h2><div class="row">${list}</div>`);
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
    const list = items.map(i => `<li class="list-group-item d-flex justify-content-between align-items-center">${i.name} <span>$${i.price}</span></li>`).join('');
    setContent(`<h2>Your Cart</h2><ul id="cartItems" class="list-group mb-3">${list}</ul><button class="btn btn-primary" onclick="purchase()">Purchase</button>`);
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
    <h2>Our Services</h2>
    <ul class="list-group mb-3">
      <li class="list-group-item">Gift wrapping</li>
      <li class="list-group-item">Premium support</li>
      <li class="list-group-item">Express shipping</li>
    </ul>
  `);
}

function showAbout() {
  setContent(`
    <h2>About Us</h2>
    <p class="lead">Demo Shop is a tiny storefront used to showcase API security features.</p>
    <p>All purchases are simulated and no real payments are processed.</p>
  `);
}

function showContact() {
  setContent(`
    <h2>Contact Us</h2>
    <p>Email: <a href="mailto:support@example.com">support@example.com</a></p>
    <p>Phone: 555-1234</p>
  `);
}

async function viewStats() {
  try {
    const data = await fetchJSON(`${API_BASE}/api-calls`);
    const list = Object.entries(data)
      .map(([user, count]) => `<li>${user}: ${count}</li>`)
      .join('');
    setContent(`<h2>API Calls</h2><ul class="stats-list">${list}</ul>`);
  } catch (e) {
    showMessage('Failed to load stats', true);
  }
}

function showLogin() {
  setContent(`
    <h2>Login</h2>
    <form id="loginForm">
      <input type="text" id="username" placeholder="Username" required><br>
      <input type="password" id="pw" placeholder="Password" required><br>
      <button type="submit">Login</button>
    </form>
    <p class="small text-muted">Demo credentials: <code>alice</code> / <code>secret</code></p>
    <p>Or <a href="#" id="registerLink">register</a></p>
  `);
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const inputUser = document.getElementById('username').value;
    const pw = document.getElementById('pw').value;
    try {
      await fetchJSON(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify({ username: inputUser, password: pw }),
        noAuth: true
      });
      username = inputUser;
      document.getElementById('loginBtn').style.display = 'none';
      document.getElementById('logoutBtn').style.display = 'inline-block';
      const status = document.getElementById('userStatus');
      status.textContent = `Logged in as ${username}`;
      status.style.display = 'inline-block';
      updateCartCount(true);
      loadProducts();
    } catch (e) {
      showMessage('Login failed', true);
      username = null;
    }
  });
  document.getElementById('registerLink').addEventListener('click', showRegister);
}

function showRegister() {
  setContent(`
    <h2>Register</h2>
    <form id="regForm">
      <input type="text" id="regUser" placeholder="Username" required><br>
      <input type="password" id="regPw" placeholder="Password" required><br>
      <button type="submit">Register</button>
    </form>
  `);
  document.getElementById('regForm').addEventListener('submit', async e => {
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
}

async function logout() {
  await fetchJSON(`${API_BASE}/logout`, { method: 'POST', noAuth: true });
  username = null;
  document.getElementById('loginBtn').style.display = 'inline-block';
  document.getElementById('logoutBtn').style.display = 'none';
  const status = document.getElementById('userStatus');
  status.textContent = '';
  status.style.display = 'none';
  updateCartCount(true);
  loadProducts();
}

async function updateCartCount(skipAuth = false) {
  if (!username) {
    document.getElementById('cartCount').textContent = 0;
    return;
  }
  try {
    const items = await fetchJSON(`${API_BASE}/cart`, skipAuth ? { noAuth: true } : {});
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
  updateCartCount();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
