import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import LoginForm from "./LoginForm";
import DashboardMain from "./DashboardMain";
import MetricsPage from "./MetricsPage";
import "./App.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  if (!token) {
    return (
      <div className="app-container">
        <h1 className="dashboard-header">Please log in</h1>
        <LoginForm onLogin={setToken} />
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <nav className="nav-links">
          <Link to="/">Dashboard</Link> | <Link to="/metrics">Metrics</Link>
        </nav>
        <Routes>
          <Route path="/" element={<DashboardMain token={token} />} />
          <Route path="/metrics" element={<MetricsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
