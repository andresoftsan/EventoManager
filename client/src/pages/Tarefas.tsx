import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, CheckSquare, Calendar, User as UserIcon, Building2, List, Search, ChevronDown, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import ChecklistTab from "@/components/ChecklistTab";
import TempChecklistTab from "@/components/TempChecklistTab";
import { 
  insertTaskSchema, 
  type Task, 
  type Client, 
  type KanbanStage,
  type User
} from "@shared/schema";

const taskFormSchema = insertTaskSchema.extend({
  clientId: z.number().min(1, "Cliente é obrigatório"),
  userId: z.number().min(1, "Usuário é obrigatório"),
  stageId: z.number().min(1, "Status é obrigatório"),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().min(1, "Data de fim é obrigatória"),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskWithDetails extends Task {
  userName: string;
  clientName: string;
  stageName: string;
}

interface TempChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export default function Tarefas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithDetails | null>(null);
  const [tempChecklistItems, setTempChecklistItems] = useState<TempChecklistItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("abertas"); // "abertas", "concluidas", "todas"
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const { toast } = useToast();
  const authQuery = useAuth();

  // Queries
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ['/api/tasks'],
  });

  // Only fetch clients when user starts searching
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients'],
    enabled: clientSearchTerm.length >= 2 || isClientSearchOpen,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ['/api/kanban-stages'],
  });

  // Form
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      clientId: 0,
      userId: 0,
      stageId: 0,
    },
  });

  // Fetch selected client for display purposes
  const selectedClientId = form.watch('clientId');
  const { data: selectedClient } = useQuery({
    queryKey: ['/api/clients', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return null;
      const response = await fetch(`/api/clients/${selectedClientId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!selectedClientId && selectedClientId > 0,
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao criar tarefa');
      const task = await response.json();
      
      // Salvar itens do checklist temporário se existirem
      if (tempChecklistItems.length > 0) {
        for (const item of tempChecklistItems) {
          await fetch(`/api/tasks/${task.id}/checklist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: item.title,
              completed: item.completed,
              order: tempChecklistItems.indexOf(item) + 1,
            }),
          });
        }
      }
      
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsModalOpen(false);
      setTempChecklistItems([]);
      form.reset();
      toast({
        title: "Tarefa criada",
        description: "A tarefa foi criada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao criar tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TaskFormData }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Erro ao atualizar tarefa');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsModalOpen(false);
      setEditingTask(null);
      form.reset();
      toast({
        title: "Tarefa atualizada",
        description: "A tarefa foi atualizada com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Erro ao deletar tarefa');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Tarefa removida",
        description: "A tarefa foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover tarefa. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: TaskFormData) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const handleEdit = (task: TaskWithDetails) => {
    setEditingTask(task);
    setTempChecklistItems([]); // Reset temp items when editing
    setClientSearchTerm("");
    setIsClientSearchOpen(false);
    
    // Format dates properly for input fields
    const formatDateForInput = (dateValue: string | Date) => {
      const date = new Date(dateValue);
      return date.toISOString().split('T')[0];
    };
    
    form.reset({
      title: task.title,
      description: task.description || "",
      startDate: formatDateForInput(task.startDate),
      endDate: formatDateForInput(task.endDate),
      clientId: task.clientId,
      userId: task.userId,
      stageId: task.stageId,
    });
    setIsModalOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setTempChecklistItems([]);
    setClientSearchTerm("");
    setIsClientSearchOpen(false);
    form.reset({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      clientId: 0,
      userId: 0,
      stageId: 0,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover esta tarefa?")) {
      deleteTaskMutation.mutate(id);
    }
  };

  // Mark task as completed
  const markAsCompletedMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });

      if (!response.ok) {
        throw new Error('Erro ao marcar tarefa como concluída');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Tarefa concluída",
        description: "A tarefa foi marcada como concluída com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMarkAsCompleted = (taskId: number) => {
    if (confirm("Tem certeza que deseja marcar esta tarefa como concluída?")) {
      markAsCompletedMutation.mutate(taskId);
    }
  };

  // Reopen task
  const reopenTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: false }),
      });

      if (!response.ok) {
        throw new Error('Erro ao reabrir tarefa');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Tarefa reaberta",
        description: "A tarefa foi reaberta com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReopenTask = (taskId: number) => {
    if (confirm("Tem certeza que deseja reabrir esta tarefa?")) {
      reopenTaskMutation.mutate(taskId);
    }
  };

  // Filter tasks by search term, date range, and status
  const filteredTasks = tasks.filter((task: TaskWithDetails) => {
    // Filter by title
    const matchesTitle = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by start date
    const matchesStartDate = !startDateFilter || task.startDate >= startDateFilter;
    
    // Filter by end date
    const matchesEndDate = !endDateFilter || task.endDate <= endDateFilter;
    
    // Filter by status
    let matchesStatus = true;
    
    if (statusFilter === "abertas") {
      matchesStatus = !task.completed;
    } else if (statusFilter === "concluidas") {
      matchesStatus = task.completed;
    }
    // If statusFilter === "todas", matchesStatus remains true
    
    return matchesTitle && matchesStartDate && matchesEndDate && matchesStatus;
  });

  // Helper function to format dates correctly (avoiding timezone issues)
  const formatTaskDate = (dateValue: string | Date) => {
    try {
      let dateString: string;
      
      if (typeof dateValue === 'string') {
        dateString = dateValue;
      } else {
        // Se for Date, converte para string local
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, '0');
        const day = String(dateValue.getDate()).padStart(2, '0');
        dateString = `${year}-${month}-${day}`;
      }
      
      // Processa datas no formato YYYY-MM-DD diretamente (sem conversão Date)
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      }
      
      // Para outros formatos, tenta conversão
      if (dateString.includes('T')) {
        const date = new Date(dateString);
        return format(date, "dd/MM/yyyy");
      }
      
      return dateString;
    } catch (error) {
      return typeof dateValue === 'string' ? dateValue : 'Data inválida';
    }
  };

  // Helper function for status colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pendente":
        return "bg-gray-100 text-gray-800";
      case "em andamento":
        return "bg-blue-100 text-blue-800";
      case "revisão":
        return "bg-yellow-100 text-yellow-800";
      case "concluído":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-2">Tarefas</h2>
          <p className="text-gray-600 text-sm lg:text-base">Gerencie as tarefas do sistema</p>
        </div>
        <Button onClick={handleNewTask} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Filtros */}
      <div className="space-y-4">
        {/* Campo de Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar tarefas por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtros de Data e Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abertas">Tarefas Abertas</SelectItem>
                <SelectItem value="concluidas">Tarefas Concluídas</SelectItem>
                <SelectItem value="todas">Todas as Tarefas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial (a partir de)
            </label>
            <Input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              placeholder="Filtrar por data inicial"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Final (até)
            </label>
            <Input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              placeholder="Filtrar por data final"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStartDateFilter("");
                setEndDateFilter("");
                setStatusFilter("abertas");
              }}
              className="w-full"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {tasksLoading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 lg:p-6">
                <div className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : Array.isArray(filteredTasks) && filteredTasks.length > 0 ? (
          filteredTasks.map((task: TaskWithDetails) => (
            <Card key={task.id} className={`hover:shadow-md transition-shadow ${task.completed ? 'bg-green-50 border-green-200' : ''}`}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-sm lg:text-base truncate ${task.completed ? 'text-green-900 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${getStatusColor(task.stageName)}`}>
                        {task.stageName}
                      </Badge>
                      {task.completed && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Concluída
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    {!task.completed ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsCompleted(task.id)}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                        title="Marcar como concluída"
                      >
                        <CheckSquare className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReopenTask(task.id)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        title="Reabrir tarefa"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(task)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(task.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {task.description && (
                  <p className="text-gray-600 text-xs lg:text-sm mb-3 line-clamp-2">
                    {task.description}
                  </p>
                )}
                <div className="space-y-2 text-xs lg:text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{task.clientName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4" />
                    <span className="truncate">{task.userName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatTaskDate(task.startDate)} - {formatTaskDate(task.endDate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {searchTerm || startDateFilter || endDateFilter || statusFilter !== "abertas" ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
                <p className="text-gray-500 mb-4">
                  Não encontramos tarefas com os filtros aplicados
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setStartDateFilter("");
                    setEndDateFilter("");
                  }}
                  className="mr-2"
                >
                  Limpar Filtros
                </Button>
                <Button onClick={handleNewTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Tarefa
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
                <p className="text-gray-500 mb-4">Comece criando sua primeira tarefa</p>
                <Button onClick={handleNewTask}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Tarefa
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Edit size={16} />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="checklist" className="flex items-center gap-2">
                <List size={16} />
                Checklist
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome da tarefa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} placeholder="Descreva a tarefa (opcional)" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Início *</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Fim *</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente *</FormLabel>
                        <Popover 
                          open={isClientSearchOpen} 
                          onOpenChange={(open) => {
                            setIsClientSearchOpen(open);
                            if (!open) {
                              setClientSearchTerm("");
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                                onClick={() => setIsClientSearchOpen(true)}
                              >
                                {selectedClient
                                  ? selectedClient.razaoSocial
                                  : "Selecione o cliente..."}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput 
                                placeholder="Digite pelo menos 2 caracteres para buscar..." 
                                value={clientSearchTerm}
                                onValueChange={(value) => {
                                  setClientSearchTerm(value);
                                  if (value.length >= 2) {
                                    setIsClientSearchOpen(true);
                                  }
                                }}
                              />
                              <CommandList>
                                {clientSearchTerm.length < 2 ? (
                                  <CommandEmpty>Digite pelo menos 2 caracteres para buscar clientes.</CommandEmpty>
                                ) : (
                                  <>
                                    <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                    <CommandGroup>
                                      {Array.isArray(clients) && clients
                                        .filter((client: any) => 
                                          client.razaoSocial.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                                          (client.nomeFantasia && client.nomeFantasia.toLowerCase().includes(clientSearchTerm.toLowerCase())) ||
                                          (client.cnpj && client.cnpj.includes(clientSearchTerm))
                                        )
                                        .map((client: any) => (
                                          <CommandItem
                                            key={client.id}
                                            value={`${client.razaoSocial} ${client.nomeFantasia || ''} ${client.cnpj || ''}`}
                                            onSelect={() => {
                                              field.onChange(client.id);
                                              setClientSearchTerm("");
                                              setIsClientSearchOpen(false);
                                            }}
                                          >
                                            <div className="flex flex-col">
                                              <span className="font-medium">{client.razaoSocial}</span>
                                              {client.nomeFantasia && client.nomeFantasia !== client.razaoSocial && (
                                                <span className="text-sm text-gray-500">{client.nomeFantasia}</span>
                                              )}
                                              {client.cnpj && (
                                                <span className="text-xs text-gray-400">{client.cnpj}</span>
                                              )}
                                            </div>
                                            <Check
                                              className={`ml-auto h-4 w-4 ${
                                                client.id === field.value ? "opacity-100" : "opacity-0"
                                              }`}
                                            />
                                          </CommandItem>
                                        ))}
                                    </CommandGroup>
                                  </>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsável *</FormLabel>
                        <Select
                          value={field.value ? field.value.toString() : ""}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o responsável" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(users) && users.map((user: any) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select
                          value={field.value ? field.value.toString() : ""}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(stages) && stages.map((stage: any) => (
                              <SelectItem key={stage.id} value={stage.id.toString()}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                    >
                      {editingTask ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="checklist" className="space-y-4">
              {editingTask ? (
                <ChecklistTab taskId={editingTask.id} />
              ) : (
                <TempChecklistTab 
                  items={tempChecklistItems}
                  onItemsChange={setTempChecklistItems}
                />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}