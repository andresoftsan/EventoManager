import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data, isLoading, error } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Verificando autenticação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data?.user) {
    // Redirect to login will be handled by App.tsx
    return null;
  }

  return <>{children}</>;
}
