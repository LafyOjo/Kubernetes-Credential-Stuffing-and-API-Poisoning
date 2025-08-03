import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import MainContent from "./components/MainContent";
import { ThemeProvider } from "./theme/ThemeProvider";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen bg-gray-50 dark:bg-[#1E1E2D]">
            <Header />
            <main className="flex-1 overflow-y-auto p-4">
              <Routes>
                <Route path="/" element={<MainContent />} />
                <Route path="/metrics" element={<MainContent />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
