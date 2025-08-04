import { Search, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";

const Header = ({ onLogout }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="flex items-center justify-between px-4 py-2 border-b bg-white dark:bg-[#27293D]">
      <div className="flex items-center">
        <Search className="h-5 w-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search..."
          className="ml-2 bg-transparent outline-none text-sm"
        />
      </div>
      <div className="flex items-center space-x-4">
        <Bell className="h-5 w-5 text-gray-500" />
        <button
          onClick={toggleTheme}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={onLogout}
          className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-700"
        >
          Logout
        </button>
        <img
          src="https://i.pravatar.cc/32"
          alt="avatar"
          className="rounded-full h-8 w-8"
        />
      </div>
    </header>
  );
};

export default Header;
