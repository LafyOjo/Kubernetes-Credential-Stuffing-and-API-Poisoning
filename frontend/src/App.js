import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import MainContent from "./components/MainContent";
import LoginForm from "./LoginForm";
import DashboardMain from "./DashboardMain";
import { ThemeProvider } from "./theme/ThemeProvider";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const handleLogin = (t) => {
    localStorage.setItem("token", t);
    setToken(t);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen bg-gray-50 dark:bg-[#1E1E2D]">
            <Header onLogout={handleLogout} />
            <main className="flex-1 overflow-y-auto p-4">
              <Routes>
                <Route path="/" element={<MainContent token={token} />} />
                <Route path="/metrics" element={<MainContent token={token} />} />
                <Route path="/legacy" element={<DashboardMain token={token} />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
