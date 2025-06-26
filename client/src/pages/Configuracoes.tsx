import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Trash2, Edit } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

const userFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  username: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  isAdmin: z.boolean(),
  companyIds: z.array(z.number()).min(1, "Pelo menos uma empresa deve ser selecionada"),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserWithoutPassword {
  id: number;
  username: string;
  name: string;
  email: string;
  isAdmin: boolean;
  companyIds?: number[];
  createdAt: string;
}

export default function Configuracoes() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithoutPassword | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: authData } = useAuth();

  const { data: users = [], isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      isAdmin: false,
      companyIds: [],
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      form.reset();
      setEditingUser(null);
      toast({
        title: "Sucesso",
        description: "Usuário cadastrado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar usuário",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserFormData> }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      form.reset();
      setEditingUser(null);
      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir usuário",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      if (editingUser) {
        await updateUserMutation.mutateAsync({ id: editingUser.id, data });
      } else {
        await createUserMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: UserWithoutPassword) => {
    setEditingUser(user);
    form.reset({
      name: user.name,
      email: user.email,
      username: user.username,
      password: "", // Always empty for security
      isAdmin: user.isAdmin,
      companyIds: user.companyIds || [],
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    form.reset({
      name: "",
      email: "",
      username: "",
      password: "",
      isAdmin: false,
      companyIds: [],
    });
  };

  const handleDeleteUser = (id: number, username: string) => {
    if (username === "admin") {
      toast({
        title: "Erro",
        description: "Não é possível excluir o usuário administrador master",
        variant: "destructive",
      });
      return;
    }

    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      deleteUserMutation.mutate(id);
    }
  };

  // Check if current user is admin
  const isAdmin = (authData as any)?.user?.isAdmin;

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-2">Configurações</h2>
        <p className="text-gray-600 text-sm lg:text-base">Gerencie usuários e permissões do sistema</p>
      </div>

      <div className={`grid gap-4 lg:gap-6 ${authData?.user?.isAdmin ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* User Registration Form - Only for Admins */}
        {authData?.user?.isAdmin && (
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <CardTitle className="text-lg font-semibold text-gray-800">
                {editingUser ? "Editar Usuário" : "Cadastro de Usuário"}
              </CardTitle>
            </CardHeader>
          <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Digite o nome completo" 
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="Digite o e-mail" 
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Usuário</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Digite o nome de usuário" 
                            {...field}
                            disabled={isSubmitting}
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
                            placeholder="Digite a senha" 
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {isAdmin && (
                    <FormField
                      control={form.control}
                      name="isAdmin"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Usuário Administrador</FormLabel>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {isAdmin && (
                    <FormField
                      control={form.control}
                      name="companyIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empresas Vinculadas</FormLabel>
                          <div className="space-y-2">
                            {Array.isArray(companies) && companies.length > 0 ? (
                              companies.map((company: any) => (
                                <div key={company.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={field.value?.includes(company.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        field.onChange([...(field.value || []), company.id]);
                                      } else {
                                        field.onChange(field.value?.filter((id: number) => id !== company.id) || []);
                                      }
                                    }}
                                    disabled={isSubmitting}
                                  />
                                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {company.nome}
                                  </label>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500">Nenhuma empresa cadastrada</p>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <div className="flex gap-2">
                    {editingUser && (
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      className={`${editingUser ? 'flex-1' : 'w-full'} bg-blue-600 hover:bg-blue-700`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting 
                        ? (editingUser ? "Atualizando..." : "Cadastrando...") 
                        : (editingUser ? "Atualizar Usuário" : "Cadastrar Usuário")
                      }
                    </Button>
                  </div>
                </form>
              </Form>
          </CardContent>
        </Card>
        )}

        {/* Users List */}
        <Card className="border border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Usuários Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-32 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-5 w-12" />
                      <Skeleton className="h-6 w-6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {users.map((user, index) => (
                  <div
                    key={user.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        user.isAdmin 
                          ? 'bg-blue-600' 
                          : index % 3 === 0 ? 'bg-gray-600' :
                            index % 3 === 1 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}>
                        <User className="text-white h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-800">{user.name}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                        {user.companyIds && user.companyIds.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.companyIds.map((companyId: number) => {
                              const company = Array.isArray(companies) ? companies.find((c: any) => c.id === companyId) : null;
                              return company ? (
                                <Badge key={companyId} variant="outline" className="text-xs">
                                  {company.nome}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.isAdmin ? "default" : "secondary"}>
                        {user.isAdmin ? "Admin" : "Usuário"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-700"
                        disabled={isSubmitting}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {isAdmin && user.username !== "admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="text-red-600 hover:text-red-700"
                          disabled={deleteUserMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
