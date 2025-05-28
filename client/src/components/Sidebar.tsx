import { BarChart3, Calendar, Settings } from "lucide-react";
import { useLocation, Link } from "wouter";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    { path: "/dashboard", icon: BarChart3, label: "Dashboard" },
    { path: "/agenda", icon: Calendar, label: "Agenda" },
    { path: "/configuracoes", icon: Settings, label: "Configurações" },
  ];

  return (
    <aside className={`w-64 bg-white shadow-sm min-h-screen border-r border-gray-200 ${className}`}>
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <button
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
