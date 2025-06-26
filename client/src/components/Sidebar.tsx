import { BarChart3, Calendar, Settings, Menu, X, CheckSquare, Users, Layers, Briefcase, Building2, FileText } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: authData } = useAuth();
  const isAdmin = (authData as any)?.user?.isAdmin;

  const baseMenuItems = [
    { path: "/dashboard", icon: BarChart3, label: "Dashboard" },
    { path: "/agenda", icon: Calendar, label: "Agenda" },
    { path: "/tarefas", icon: CheckSquare, label: "Tarefas" },
    { path: "/kanban", icon: Layers, label: "Kanban" },
    { path: "/sprints", icon: Briefcase, label: "Sprints" },
    { path: "/processos", icon: FileText, label: "Processos" },
    { path: "/clientes", icon: Users, label: "Clientes" },
  ];

  const adminMenuItems = [
    { path: "/empresas", icon: Building2, label: "Empresas" },
    { path: "/configuracoes", icon: Settings, label: "Configurações" },
  ];

  const menuItems = [
    ...baseMenuItems,
    ...(isAdmin ? adminMenuItems : []),
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center space-x-2"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span>Menu</span>
        </Button>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        fixed lg:relative top-0 left-0 
        w-64 lg:w-64 bg-white shadow-lg lg:shadow-sm h-full lg:min-h-screen 
        border-r border-gray-200 z-50 lg:z-auto
        transition-transform duration-300 ease-in-out
        ${className}
      `}>
        <nav className="p-4 pt-6 lg:pt-4">
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
                      onClick={closeMobileMenu}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm lg:text-base">{item.label}</span>
                    </button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
