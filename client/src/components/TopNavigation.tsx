import { Calendar, User, LogOut } from "lucide-react";
import { useAuth, useLogout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function TopNavigation() {
  const { data: authData } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logout realizado",
          description: "Você foi desconectado com sucesso.",
        });
      },
    });
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 rounded-lg w-10 h-10 flex items-center justify-center">
            <Calendar className="text-white h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Sistema de Eventos</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="text-white h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {authData?.user?.name}
            </span>
            <Badge variant={authData?.user?.isAdmin ? "default" : "secondary"}>
              {authData?.user?.isAdmin ? "Admin" : "Usuário"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="text-gray-500 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
