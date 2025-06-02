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
    if (logout.isPending) return; // Prevent multiple clicks
    
    logout.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logout realizado",
          description: "Você foi desconectado com sucesso.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Erro no logout",
          description: error.message || "Erro ao fazer logout",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <div className="bg-blue-600 rounded-lg w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center">
            <Calendar className="text-white h-4 w-4 lg:h-6 lg:w-6" />
          </div>
          <h1 className="text-lg lg:text-xl font-semibold text-gray-800 hidden sm:block">
            Workday
          </h1>
          <h1 className="text-lg font-semibold text-gray-800 sm:hidden">
            Workday
          </h1>
        </div>
        
        <div className="flex items-center space-x-2 lg:space-x-4">
          <div className="hidden sm:flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="text-white h-4 w-4" />
            </div>
            <div className="hidden md:block">
              <span className="text-sm font-medium text-gray-700">
                {authData?.user?.name}
              </span>
            </div>
            <Badge variant={authData?.user?.isAdmin ? "default" : "secondary"} className="hidden lg:inline-flex">
              {authData?.user?.isAdmin ? "Admin" : "Usuário"}
            </Badge>
          </div>
          
          {/* Mobile user info */}
          <div className="sm:hidden flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="text-white h-3 w-3" />
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={logout.isPending}
            className="text-gray-500 hover:text-red-600 p-2"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
