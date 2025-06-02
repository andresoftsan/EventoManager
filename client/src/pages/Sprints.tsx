import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, User, Building2, ChevronLeft, ChevronRight, Filter, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfDay, endOfDay, addDays, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Task } from "@shared/schema";

interface TaskWithDetails extends Task {
  userName: string;
  clientName: string;
  stageName: string;
}

interface Sprint {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  tasks: TaskWithDetails[];
}

export default function Sprints() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [sprintType, setSprintType] = useState<"weekly" | "biweekly">("weekly");
  const { data: authData } = useAuth();

  const isAdmin = authData?.user?.isAdmin;

  // Queries
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks"],
    enabled: !!authData?.user,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!authData?.user && isAdmin,
  });

  // Filtrar tarefas por usuário
  const filteredTasks = selectedUserId === "all" 
    ? tasks 
    : tasks.filter((task: TaskWithDetails) => task.userId.toString() === selectedUserId);

  // Gerar sprints baseado no tipo selecionado
  const sprints: Sprint[] = useMemo(() => {
    const sprintDuration = sprintType === "weekly" ? 1 : 2;
    const sprintsToShow = 3; // Mostrar 3 sprints (anterior, atual, próximo)
    const generatedSprints: Sprint[] = [];

    for (let i = -1; i <= 1; i++) {
      const sprintStartDate = startOfWeek(addWeeks(currentDate, i * sprintDuration), { weekStartsOn: 1 });
      const sprintEndDate = endOfWeek(addWeeks(sprintStartDate, sprintDuration - 1), { weekStartsOn: 1 });

      const sprintTasks = filteredTasks.filter((task: TaskWithDetails) => {
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.endDate);
        
        // Verificar se a tarefa tem sobreposição com o sprint
        return (
          isWithinInterval(taskStart, { start: sprintStartDate, end: sprintEndDate }) ||
          isWithinInterval(taskEnd, { start: sprintStartDate, end: sprintEndDate }) ||
          (taskStart <= sprintStartDate && taskEnd >= sprintEndDate)
        );
      });

      const sprintName = sprintType === "weekly" 
        ? `Semana ${format(sprintStartDate, "dd/MM", { locale: ptBR })} - ${format(sprintEndDate, "dd/MM", { locale: ptBR })}`
        : `Sprint ${format(sprintStartDate, "dd/MM", { locale: ptBR })} - ${format(sprintEndDate, "dd/MM", { locale: ptBR })}`;

      generatedSprints.push({
        id: `sprint-${i}`,
        name: sprintName,
        startDate: sprintStartDate,
        endDate: sprintEndDate,
        tasks: sprintTasks,
      });
    }

    return generatedSprints;
  }, [currentDate, sprintType, filteredTasks]);

  const handlePreviousSprint = () => {
    const weeks = sprintType === "weekly" ? 1 : 2;
    setCurrentDate(subWeeks(currentDate, weeks));
  };

  const handleNextSprint = () => {
    const weeks = sprintType === "weekly" ? 1 : 2;
    setCurrentDate(addWeeks(currentDate, weeks));
  };

  const getStatusColor = (stageName: string) => {
    switch (stageName.toLowerCase()) {
      case "a fazer":
        return "bg-gray-100 text-gray-800";
      case "em progresso":
        return "bg-blue-100 text-blue-800";
      case "em revisão":
        return "bg-yellow-100 text-yellow-800";
      case "concluído":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSprintProgress = (sprint: Sprint) => {
    const totalTasks = sprint.tasks.length;
    const completedTasks = sprint.tasks.filter(task => task.stageName.toLowerCase() === "concluído").length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { completedTasks, totalTasks, percentage };
  };

  const currentSprint = sprints[1]; // Sprint atual (índice 1)

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-2">Sprints</h2>
          <p className="text-gray-600 text-sm lg:text-base">Visualize tarefas organizadas por períodos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Seletor de tipo de sprint */}
          <Select value={sprintType} onValueChange={(value: "weekly" | "biweekly") => setSprintType(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="biweekly">Quinzenal</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por usuário para admins */}
          {isAdmin && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Navegação de Sprints */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePreviousSprint}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <div className="text-center">
          <h3 className="font-semibold text-gray-800">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h3>
        </div>
        <Button variant="outline" onClick={handleNextSprint}>
          Próximo
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Resumo do Sprint Atual */}
      {currentSprint && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-900">{currentSprint.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-800">
                  {getSprintProgress(currentSprint).totalTasks}
                </div>
                <div className="text-sm text-blue-600">Total de Tarefas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {getSprintProgress(currentSprint).completedTasks}
                </div>
                <div className="text-sm text-blue-600">Concluídas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {getSprintProgress(currentSprint).percentage}%
                </div>
                <div className="text-sm text-blue-600">Progresso</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs para diferentes sprints */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="previous">Anterior</TabsTrigger>
          <TabsTrigger value="current">Atual</TabsTrigger>
          <TabsTrigger value="next">Próximo</TabsTrigger>
        </TabsList>

        {sprints.map((sprint, index) => {
          const tabValue = index === 0 ? "previous" : index === 1 ? "current" : "next";
          
          return (
            <TabsContent key={sprint.id} value={tabValue} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">{sprint.name}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{sprint.tasks.length} tarefas</span>
                  <span>{getSprintProgress(sprint).percentage}% concluído</span>
                </div>
              </div>

              {/* Lista de tarefas do sprint */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {sprint.tasks.length > 0 ? (
                  sprint.tasks.map((task) => (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-gray-900 text-sm leading-tight">
                              {task.title}
                            </h4>
                            <Badge className={`text-xs ${getStatusColor(task.stageName)}`}>
                              {task.stageName}
                            </Badge>
                          </div>

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
                                {format(new Date(task.startDate), "dd/MM")} - {format(new Date(task.endDate), "dd/MM")}
                              </span>
                            </div>
                          </div>

                          {/* Indicador de prazo */}
                          {new Date(task.endDate) < new Date() && task.stageName.toLowerCase() !== "concluído" && (
                            <Badge variant="destructive" className="text-xs">
                              Atrasado
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tarefa neste período</h3>
                    <p className="text-gray-500">
                      {selectedUserId === "all" 
                        ? "Não há tarefas agendadas para este sprint"
                        : "Este usuário não possui tarefas neste período"}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Estado de carregamento */}
      {tasksLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}