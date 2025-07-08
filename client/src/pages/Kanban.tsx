import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, User, Building2, Calendar, Filter, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Task, KanbanStage, User as UserType } from "@shared/schema";

interface TaskWithDetails extends Task {
  userName: string;
  clientName: string;
  stageName: string;
}

interface KanbanColumn {
  stage: KanbanStage;
  tasks: TaskWithDetails[];
}

export default function Kanban() {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [draggedTask, setDraggedTask] = useState<TaskWithDetails | null>(null);
  const { data: authData } = useAuth();
  const { toast } = useToast();

  const isAdmin = authData?.user?.isAdmin;

  // Queries
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: !!authData?.user,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["/api/kanban-stages"],
    enabled: !!authData?.user,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!authData?.user && isAdmin,
  });

  // Mutation para atualizar etapa da tarefa
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, stageId }: { taskId: number; stageId: number }) => {
      const response = await apiRequest("PUT", `/api/tasks/${taskId}`, { stageId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Sucesso",
        description: "Tarefa movida com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao mover tarefa",
        variant: "destructive",
      });
    },
  });

  // Mark task as completed
  const markAsCompletedMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest("PUT", `/api/tasks/${taskId}`, { completed: true });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Tarefa concluída",
        description: "A tarefa foi marcada como concluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao marcar tarefa como concluída",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsCompleted = (taskId: number) => {
    if (confirm("Tem certeza que deseja marcar esta tarefa como concluída?")) {
      markAsCompletedMutation.mutate(taskId);
    }
  };



  // Filtrar tarefas por usuário e excluir tarefas concluídas
  const filteredTasks = selectedUserId === "all" 
    ? tasks.filter((task: TaskWithDetails) => !task.completed)
    : tasks.filter((task: TaskWithDetails) => task.userId.toString() === selectedUserId && !task.completed);

  // Organizar tarefas por colunas do kanban
  const kanbanColumns: KanbanColumn[] = stages.map((stage: KanbanStage) => ({
    stage,
    tasks: filteredTasks.filter((task: TaskWithDetails) => task.stageId === stage.id),
  }));

  // Handlers para drag and drop
  const handleDragStart = useCallback((e: React.DragEvent, task: TaskWithDetails) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStageId: number) => {
      e.preventDefault();
      
      if (!draggedTask || draggedTask.stageId === targetStageId) {
        setDraggedTask(null);
        return;
      }

      updateTaskMutation.mutate({
        taskId: draggedTask.id,
        stageId: targetStageId,
      });

      setDraggedTask(null);
    },
    [draggedTask, updateTaskMutation]
  );

  const getStatusColor = (stageName: string) => {
    switch (stageName.toLowerCase()) {
      case "a fazer":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "em progresso":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "em revisão":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "concluído":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getColumnHeaderColor = (stageName: string) => {
    switch (stageName.toLowerCase()) {
      case "a fazer":
        return "bg-gray-50 border-gray-200";
      case "em progresso":
        return "bg-blue-50 border-blue-200";
      case "em revisão":
        return "bg-yellow-50 border-yellow-200";
      case "concluído":
        return "bg-green-50 border-green-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-2">Kanban</h2>
          <p className="text-gray-600 text-sm lg:text-base">Visualize e gerencie o fluxo de tarefas</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filtro por usuário para admins */}
          {isAdmin && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {users.map((user: UserType) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Quadro Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {kanbanColumns.map((column) => (
          <div key={column.stage.id} className="flex flex-col">
            {/* Header da coluna */}
            <div className={`p-4 rounded-t-lg border-2 ${getColumnHeaderColor(column.stage.name)}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm lg:text-base">
                  {column.stage.name}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {column.tasks.length}
                </Badge>
              </div>
            </div>

            {/* Área de drop das tarefas */}
            <div
              className={`flex-1 min-h-[400px] p-4 border-2 border-t-0 rounded-b-lg bg-gray-50/50 ${
                draggedTask && draggedTask.stageId !== column.stage.id
                  ? "border-dashed border-blue-400 bg-blue-50"
                  : "border-gray-200"
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.stage.id)}
            >
              <div className="space-y-3">
                {column.tasks.map((task) => (
                  <Card
                    key={task.id}
                    className={`cursor-move hover:shadow-md transition-all ${
                      draggedTask?.id === task.id ? "opacity-50 rotate-3" : ""
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900 text-sm leading-tight">
                          {task.title}
                        </h4>

                        {task.description && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{task.clientName}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <User className="h-3 w-3" />
                            <span className="truncate">{task.userName}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {(() => {
                                // Handle date string directly to avoid timezone issues
                                if (task.endDate.includes('-')) {
                                  const [year, month, day] = task.endDate.split('-');
                                  return `${day}/${month}`;
                                }
                                return format(new Date(task.endDate), "dd/MM");
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Indicador de prazo */}
                        <div className="flex items-center justify-between">
                          {(() => {
                            // Handle date comparison properly for YYYY-MM-DD format
                            if (task.endDate.includes('-')) {
                              const [year, month, day] = task.endDate.split('-').map(Number);
                              const taskDate = new Date(year, month - 1, day); // month is 0-indexed
                              const today = new Date();
                              const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                              
                              return taskDate < todayOnly && !task.completed;
                            }
                            
                            // Fallback for other date formats
                            const endDate = new Date(task.endDate);
                            const today = new Date();
                            const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
                            const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                            
                            return endDateOnly < todayOnly && !task.completed;
                          })() && (
                            <Badge variant="destructive" className="text-xs">
                              Atrasado
                            </Badge>
                          )}
                          
                          {/* Botão de marcar como concluída */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsCompleted(task.id);
                            }}
                            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Marcar como concluída"
                          >
                            <CheckSquare className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Área vazia quando não há tarefas */}
                {column.tasks.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                    {draggedTask && draggedTask.stageId !== column.stage.id
                      ? "Solte a tarefa aqui"
                      : "Nenhuma tarefa"}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estado de carregamento */}
      {tasksLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-24 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!tasksLoading && filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="h-12 w-12 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
            <Plus className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa encontrada</h3>
          <p className="text-gray-500 mb-4">
            {selectedUserId === "all" 
              ? "Não há tarefas cadastradas no sistema"
              : "Este usuário não possui tarefas"}
          </p>
        </div>
      )}

      {/* Instruções para usar drag and drop */}
      {!tasksLoading && filteredTasks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Plus className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 text-sm">Como usar o Kanban</h4>
              <p className="text-blue-700 text-xs mt-1">
                Arraste e solte as tarefas entre as colunas para alterar seu status automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}