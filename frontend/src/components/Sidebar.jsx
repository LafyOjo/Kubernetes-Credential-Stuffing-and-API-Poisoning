import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, BarChart2, Menu, List } from "lucide-react";

const menuItems = [
  { label: "Dashboard", to: "/", icon: Home },
  { label: "Metrics", to: "/metrics", icon: BarChart2 },
  { label: "Legacy", to: "/legacy", icon: List },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      className={`bg-white dark:bg-[#27293D] border-r h-screen transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between p-4">
        {!collapsed && <span className="font-bold">Arion</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Menu size={20} />
        </button>
      </div>
      <nav className="mt-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center p-2 mx-2 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  isActive ? "bg-gray-200 dark:bg-gray-700" : ""
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
