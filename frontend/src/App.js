import { useState, useEffect, useContext } from "react";
import jwtDecode from "jwt-decode";
import { AUTH_TOKEN_KEY, USERNAME_KEY, logAuditEvent } from "./api";
import LoginForm from "./LoginForm";
import Dashboard from "./pages/Dashboard";
import { AuthContext } from "./AuthContext";
import "./App.css";
import "./Dashboard.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem(AUTH_TOKEN_KEY));
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    const id = setInterval(() => {
      const stored = localStorage.getItem(AUTH_TOKEN_KEY);
      setToken((prev) => (prev !== stored ? stored : prev));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser({ username: decoded.sub });
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, [token, setUser]);

  const handleLogout = async () => {
    const username = localStorage.getItem(USERNAME_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    if (username) {
      await logAuditEvent({ event: "user_logout", username }).catch(() => {});
    }
    setToken(null);
  };

  if (!token) {
    return (
      <div className="app-container">
        <h1 className="dashboard-header">Please log in</h1>
        <div className="dashboard-container">
          <div className="dashboard-card">
            <LoginForm onLogin={(tok) => setToken(tok)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="header">
        <h2 className="dashboard-header">APIShield+ Dashboard</h2>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>
      <Dashboard />
    </div>
  );
}

export default App;
