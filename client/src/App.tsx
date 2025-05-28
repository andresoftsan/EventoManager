import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import TopNavigation from "@/components/TopNavigation";
import Sidebar from "@/components/Sidebar";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Agenda from "@/pages/Agenda";
import Configuracoes from "@/pages/Configuracoes";
import NotFound from "@/pages/not-found";

function AuthenticatedApp() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNavigation />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Switch>
            <Route path="/" component={() => <Dashboard />} />
            <Route path="/dashboard" component={() => <Dashboard />} />
            <Route path="/agenda" component={() => <Agenda />} />
            <Route path="/configuracoes" component={() => <Configuracoes />} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function AppContent() {
  const { data: authData, isLoading, error } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50" />;
  }

  if (error || !authData?.user) {
    return <Login />;
  }

  return (
    <ProtectedRoute>
      <AuthenticatedApp />
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
