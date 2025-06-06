import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const checklistItemSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
});

type ChecklistItemFormData = z.infer<typeof checklistItemSchema>;

interface ChecklistItem {
  id: number;
  taskId: number;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
}

interface ChecklistTabProps {
  taskId: number;
}

export default function ChecklistTab({ taskId }: ChecklistTabProps) {
  const [isAddingItem, setIsAddingItem] = useState(false);
  const { toast } = useToast();

  const form = useForm<ChecklistItemFormData>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      title: "",
    },
  });

  // Query para buscar itens do checklist
  const { data: checklistItems = [], isLoading } = useQuery({
    queryKey: ['/api/tasks', taskId, 'checklist'],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/checklist`);
      if (!response.ok) throw new Error('Erro ao carregar checklist');
      return response.json() as Promise<ChecklistItem[]>;
    },
  });

  // Mutation para criar item
  const createItemMutation = useMutation({
    mutationFn: async (data: ChecklistItemFormData) => {
      const response = await fetch(`/api/tasks/${taskId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          order: checklistItems.length,
        }),
      });
      if (!response.ok) throw new Error('Erro ao criar item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'checklist'] });
      form.reset();
      setIsAddingItem(false);
      toast({
        title: "Item adicionado",
        description: "Item do checklist criado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar item do checklist.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ChecklistItem> }) => {
      const response = await fetch(`/api/checklist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'checklist'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar item do checklist.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/checklist/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao deletar item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'checklist'] });
      toast({
        title: "Item removido",
        description: "Item do checklist removido com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover item do checklist.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChecklistItemFormData) => {
    createItemMutation.mutate(data);
  };

  const toggleItem = (item: ChecklistItem) => {
    updateItemMutation.mutate({
      id: item.id,
      data: { completed: !item.completed },
    });
  };

  const deleteItem = (id: number) => {
    deleteItemMutation.mutate(id);
  };

  const completedCount = checklistItems.filter(item => item.completed).length;
  const totalCount = checklistItems.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return <div className="p-4">Carregando checklist...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progresso do checklist</span>
            <span>{completedCount} de {totalCount} completos</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-2">
        {checklistItems.map((item) => (
          <div 
            key={item.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
          >
            <Checkbox
              checked={item.completed}
              onCheckedChange={() => toggleItem(item)}
              className="shrink-0"
            />
            <span 
              className={`flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}
            >
              {item.title}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteItem(item.id)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}

        {checklistItems.length === 0 && !isAddingItem && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum item no checklist ainda.
          </div>
        )}
      </div>

      {/* Add New Item */}
      {isAddingItem ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder="Digite o item do checklist..."
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              size="sm"
              disabled={createItemMutation.isPending}
            >
              <Check size={16} />
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => {
                setIsAddingItem(false);
                form.reset();
              }}
            >
              <X size={16} />
            </Button>
          </form>
        </Form>
      ) : (
        <Button 
          variant="outline" 
          onClick={() => setIsAddingItem(true)}
          className="w-full"
        >
          <Plus size={16} className="mr-2" />
          Adicionar item ao checklist
        </Button>
      )}
    </div>
  );
}