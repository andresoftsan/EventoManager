import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Play, Users, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import ProcessTemplateModal from "@/components/ProcessTemplateModal";
import ProcessStepExecutionModal from "@/components/ProcessStepExecutionModal";
import type { ProcessTemplate, ProcessInstance, ProcessStepInstance } from "@shared/schema";

interface ProcessTemplateWithSteps extends ProcessTemplate {
  stepsCount: number;
  createdByName: string;
}

interface ProcessInstanceWithDetails extends ProcessInstance {
  templateName: string;
  startedByName: string;
  currentStepName?: string;
}

interface ProcessStepInstanceWithDetails extends ProcessStepInstance {
  processName: string;
  stepName: string;
  templateName: string;
}

export default function Processos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Fetch process templates
  const {
    data: processTemplates = [],
    isLoading: templatesLoading,
  } = useQuery<ProcessTemplateWithSteps[]>({
    queryKey: ["/api/process-templates"],
  });

  // Fetch process instances
  const {
    data: processInstances = [],
    isLoading: instancesLoading,
  } = useQuery<ProcessInstanceWithDetails[]>({
    queryKey: ["/api/process-instances"],
  });

  // Fetch my pending tasks
  const {
    data: myTasks = [],
    isLoading: tasksLoading,
  } = useQuery<ProcessStepInstanceWithDetails[]>({
    queryKey: ["/api/process-step-instances/my-tasks"],
  });

  // Delete process template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/process-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao excluir modelo de processo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-templates"] });
      toast({ title: "Modelo de processo excluído com sucesso!" });
    },
    onError: () => {
      toast({ 
        title: "Erro ao excluir modelo de processo", 
        variant: "destructive" 
      });
    },
  });

  // Create process template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating template with data:", data);
      
      // Create template first
      const templateResponse = await fetch("/api/process-templates", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
        }),
        credentials: "include"
      });
      
      if (!templateResponse.ok) {
        const errorData = await templateResponse.text();
        console.error("Template creation failed:", errorData);
        throw new Error(`Erro ao criar modelo de processo: ${templateResponse.status}`);
      }
      
      const template = await templateResponse.json();
      console.log("Template created:", template);
      
      // Create steps
      for (const step of data.steps) {
        const stepResponse = await fetch("/api/process-steps", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            templateId: template.id,
            name: step.name,
            description: step.description,
            order: step.order,
            responsibleUserId: step.responsibleUserId,
            formFields: step.formFields,
          }),
          credentials: "include"
        });
        
        if (!stepResponse.ok) {
          const errorData = await stepResponse.text();
          console.error("Step creation failed:", errorData);
          throw new Error(`Erro ao criar etapa do processo: ${stepResponse.status}`);
        }
      }
      
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-templates"] });
      toast({ title: "Modelo de processo criado com sucesso!" });
      setIsTemplateModalOpen(false);
    },
    onError: (error) => {
      console.error("Error creating template:", error);
      toast({ 
        title: "Erro ao criar modelo de processo", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Start process instance mutation
  const startProcessMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch("/api/process-instances", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ templateId }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao iniciar processo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/process-step-instances/my-tasks"] });
      toast({ title: "Processo iniciado com sucesso!" });
    },
    onError: () => {
      toast({ 
        title: "Erro ao iniciar processo", 
        variant: "destructive" 
      });
    },
  });

  const handleDeleteTemplate = (id: number, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o modelo "${name}"?`)) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleStartProcess = (templateId: number) => {
    startProcessMutation.mutate(templateId);
  };

  // Execute process step mutation
  const executeStepMutation = useMutation({
    mutationFn: async ({ stepInstanceId, formData, notes }: { stepInstanceId: number, formData: Record<string, any>, notes?: string }) => {
      const response = await fetch(`/api/process-step-instances/${stepInstanceId}/execute`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ formData, notes }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao executar etapa do processo");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-step-instances/my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/process-instances"] });
      toast({ title: "Etapa executada com sucesso!" });
      setIsExecutionModalOpen(false);
      setSelectedTask(null);
    },
    onError: (error) => {
      console.error("Error executing step:", error);
      toast({ 
        title: "Erro ao executar etapa", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleExecuteTask = (task: any) => {
    setSelectedTask(task);
    setIsExecutionModalOpen(true);
  };

  const canExecuteTask = (task: any) => {
    if (task.status === "completed") return false;
    
    // Check if this is the first step (order 1) or if previous steps are completed
    if (task.stepOrder === 1) return true;
    
    // Check if all previous steps in the same process are completed
    const sameProcessTasks = myTasks.filter(t => 
      t.processInstanceId === task.processInstanceId && 
      t.stepOrder < task.stepOrder
    );
    
    const allPreviousCompleted = sameProcessTasks.every(t => t.status === "completed");
    return allPreviousCompleted;
  };

  const getBlockedReason = (task: any) => {
    if (task.status === "completed") {
      return "Esta etapa já foi executada";
    }
    
    if (task.stepOrder > 1) {
      const sameProcessTasks = myTasks.filter(t => 
        t.processInstanceId === task.processInstanceId && 
        t.stepOrder < task.stepOrder
      );
      
      const incompletePrevious = sameProcessTasks.filter(t => t.status !== "completed");
      if (incompletePrevious.length > 0) {
        return `Você deve executar a etapa ${incompletePrevious[0].stepOrder} antes desta`;
      }
    }
    
    return "";
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: "Ativo", variant: "default" as const },
      completed: { label: "Concluído", variant: "secondary" as const },
      cancelled: { label: "Cancelado", variant: "destructive" as const },
      pending: { label: "Pendente", variant: "outline" as const },
      in_progress: { label: "Em Andamento", variant: "default" as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: "outline" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Processos</h1>
          <p className="text-muted-foreground">
            Gerencie modelos de processo e acompanhe execuções
          </p>
        </div>
        <Button onClick={() => setIsTemplateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Modelo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Modelos
          </TabsTrigger>
          <TabsTrigger value="instances">
            <Play className="h-4 w-4 mr-2" />
            Processos Ativos
          </TabsTrigger>
          <TabsTrigger value="my-tasks">
            <Users className="h-4 w-4 mr-2" />
            Minhas Tarefas ({myTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {templatesLoading ? (
            <div className="text-center py-8">Carregando modelos...</div>
          ) : processTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum modelo encontrado</h3>
                <p className="text-muted-foreground text-center">
                  Crie seu primeiro modelo de processo para começar
                </p>
                <Button className="mt-4" onClick={() => setIsTemplateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Modelo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {processTemplates.map((template) => (
                <Card key={template.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {user?.isAdmin && (
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id, template.name)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Etapas:</span>
                        <Badge variant="secondary">{template.stepsCount}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Criado por:</span>
                        <span className="font-medium">{template.createdByName}</span>
                      </div>
                      <Button 
                        className="w-full" 
                        onClick={() => handleStartProcess(template.id)}
                        disabled={startProcessMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar Processo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          {instancesLoading ? (
            <div className="text-center py-8">Carregando processos...</div>
          ) : processInstances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Play className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum processo ativo</h3>
                <p className="text-muted-foreground text-center">
                  Inicie um processo a partir de um modelo
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {processInstances.map((instance) => (
                <Card key={instance.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{instance.name}</CardTitle>
                        <CardDescription>
                          Modelo: {instance.templateName}
                        </CardDescription>
                      </div>
                      {getStatusBadge(instance.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Iniciado por:</span>
                        <p className="font-medium">{instance.startedByName}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Data de início:</span>
                        <p className="font-medium">
                          {new Date(instance.startedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {instance.currentStepName && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Etapa atual:</span>
                          <p className="font-medium">{instance.currentStepName}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-tasks" className="space-y-4">
          {tasksLoading ? (
            <div className="text-center py-8">Carregando tarefas...</div>
          ) : myTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma tarefa pendente</h3>
                <p className="text-muted-foreground text-center">
                  Você não possui tarefas de processo pendentes no momento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {myTasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{task.stepName}</CardTitle>
                        <CardDescription>
                          Processo: {task.processName} ({task.templateName})
                        </CardDescription>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full"
                      onClick={() => handleExecuteTask(task)}
                      disabled={task.status === "completed"}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {task.status === "completed" ? "Já Executada" : "Executar Tarefa"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProcessTemplateModal
        open={isTemplateModalOpen}
        onOpenChange={setIsTemplateModalOpen}
        onSave={createTemplateMutation.mutate}
      />

      <ProcessStepExecutionModal
        open={isExecutionModalOpen}
        onOpenChange={setIsExecutionModalOpen}
        stepInstance={selectedTask}
        onExecute={(stepInstanceId, formData, notes) => 
          executeStepMutation.mutateAsync({ stepInstanceId, formData, notes })
        }
        canExecute={selectedTask ? canExecuteTask(selectedTask) : false}
        blockedReason={selectedTask ? getBlockedReason(selectedTask) : ""}
      />
    </div>
  );
}