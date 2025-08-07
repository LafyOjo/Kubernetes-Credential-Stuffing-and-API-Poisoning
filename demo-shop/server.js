const express = require('express');
const app = express();
const port = 3005;

// In-memory "database" for simplicity
const users = {};

app.use(express.json());

// A simple CORS middleware to allow requests from the frontend.
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Reauth-Password');
    next();
});

/**
 * FIX: The authentication middleware was likely applied globally, causing it to run
 * on public endpoints like /login and /register, which would cause a crash.
 *
 * This corrected middleware now checks the request path and only applies the
 * password check to protected routes, allowing public routes to be accessed
 * without the X-Reauth-Password header.
 */
app.use((req, res, next) => {
  const publicRoutes = ['/login', '/register'];
  if (publicRoutes.includes(req.path)) {
    // This is a public route, so we skip the password check.
    return next();
  }

  // For all other protected routes, we check for the re-auth password.
  const password = req.headers['x-reauth-password'];
  if (!password) {
    return res.status(401).json({ error: 'Password required for this endpoint' });
  }

  // In a real app, you would add logic to validate the password against the logged-in user's session.
  next();
});

app.post('/register', (req, res) => {
  // Your registration logic here...
  res.status(201).send({ message: 'User registered successfully' });
});

app.post('/login', (req, res) => {
  // Your login logic here...
  res.send({ message: 'Login successful' });
});

// Example of a protected route
app.get('/cart', (req, res) => {
    res.json({ cart: ['item1', 'item2', 'item3'] });
});

app.listen(port, () => {
  console.log(`Demo Shop listening at http://localhost:${port}`);
});