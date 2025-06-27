import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { useLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { loginSchema, type LoginData } from "@shared/schema";

export default function Login() {
  const login = useLogin();
  const { toast } = useToast();
  const [rememberCredentials, setRememberCredentials] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Load saved credentials on component mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem("workday-credentials");
    if (savedCredentials) {
      try {
        const { username, password } = JSON.parse(savedCredentials);
        form.setValue("username", username);
        form.setValue("password", password);
        setRememberCredentials(true);
      } catch (error) {
        // Clear invalid saved data
        localStorage.removeItem("workday-credentials");
      }
    }
  }, [form]);

  const onSubmit = (data: LoginData) => {
    login.mutate(data, {
      onSuccess: () => {
        // Save credentials if remember is checked
        if (rememberCredentials) {
          localStorage.setItem("workday-credentials", JSON.stringify({
            username: data.username,
            password: data.password
          }));
        } else {
          // Remove saved credentials if remember is unchecked
          localStorage.removeItem("workday-credentials");
        }
      },
      onError: (error: any) => {
        toast({
          title: "Erro de autenticação",
          description: error.message || "Usuário ou senha incorretos",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Calendar className="text-white h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Workday</h1>
            <p className="text-gray-600">Faça login para acessar sua conta</p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite seu usuário" 
                        {...field}
                        disabled={login.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Digite sua senha" 
                        {...field}
                        disabled={login.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember"
                  checked={rememberCredentials}
                  onCheckedChange={(checked) => setRememberCredentials(checked as boolean)}
                />
                <label 
                  htmlFor="remember" 
                  className="text-sm text-gray-600 cursor-pointer"
                >
                  Lembrar credenciais
                </label>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={login.isPending}
              >
                {login.isPending ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
          

        </CardContent>
      </Card>
    </div>
  );
}
