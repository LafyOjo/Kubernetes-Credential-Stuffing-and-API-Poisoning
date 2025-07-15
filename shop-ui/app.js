const API_BASE = 'http://localhost:3005';
let password = null;

function setContent(html) {
  document.getElementById('content').innerHTML = html;
}

async function fetchJSON(url, options = {}) {
  const opts = { headers: { 'Content-Type': 'application/json' }, ...options };
  if (password && opts.method && opts.method !== 'GET') {
    opts.headers['X-Reauth-Password'] = password;
  }
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function loadProducts() {
  const products = await fetchJSON(`${API_BASE}/products`);
  const list = products.map(p => `
    <div class="product">
      <h3>${p.name}</h3>
      <p>$${p.price}</p>
      <button onclick="addToCart(${p.id})">Add to cart</button>
    </div>`).join('');
  setContent(`<h2>Products</h2>${list}`);
}

async function addToCart(id) {
  try {
    await fetchJSON(`${API_BASE}/cart`, {
      method: 'POST',
      body: JSON.stringify({ productId: id })
    });
    alert('Added to cart');
    updateCartCount();
  } catch (e) {
    alert('You must be logged in');
  }
}

async function viewCart() {
  try {
    const items = await fetchJSON(`${API_BASE}/cart`);
    const list = items.map(i => `<li>${i.name} - $${i.price}</li>`).join('');
    setContent(`<h2>Your Cart</h2><ul id="cartItems">${list}</ul><button onclick="purchase()">Purchase</button>`);
  } catch (e) {
    alert('You must be logged in');
  }
}

async function purchase() {
  await fetchJSON(`${API_BASE}/purchase`, { method: 'POST' });
  alert('Purchase complete');
  updateCartCount();
  loadProducts();
}

function showLogin() {
  setContent(`
    <h2>Login</h2>
    <form id="loginForm">
      <input type="text" id="username" placeholder="Username" required><br>
      <input type="password" id="pw" placeholder="Password" required><br>
      <button type="submit">Login</button>
    </form>
    <p>Or <a href="#" id="registerLink">register</a></p>
  `);
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    password = document.getElementById('pw').value;
    try {
      await fetchJSON(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      document.getElementById('loginBtn').style.display = 'none';
      document.getElementById('logoutBtn').style.display = 'inline-block';
      updateCartCount();
      loadProducts();
    } catch (e) {
      alert('Login failed');
      password = null;
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
    const username = document.getElementById('regUser').value;
    const pw = document.getElementById('regPw').value;
    try {
      await fetchJSON(`${API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, password: pw })
      });
      alert('Registered! Please log in.');
      showLogin();
    } catch (e) {
      alert('Registration failed');
    }
  });
}

async function logout() {
  await fetchJSON(`${API_BASE}/logout`, { method: 'POST' });
  password = null;
  document.getElementById('loginBtn').style.display = 'inline-block';
  document.getElementById('logoutBtn').style.display = 'none';
  updateCartCount();
  loadProducts();
}

async function updateCartCount() {
  try {
    const items = await fetchJSON(`${API_BASE}/cart`);
    document.getElementById('cartCount').textContent = items.length;
  } catch {
    document.getElementById('cartCount').textContent = 0;
  }
}

document.getElementById('homeBtn').addEventListener('click', loadProducts);
document.getElementById('cartBtn').addEventListener('click', viewCart);
document.getElementById('loginBtn').addEventListener('click', showLogin);
document.getElementById('logoutBtn').addEventListener('click', logout);

loadProducts();
updateCartCount();
