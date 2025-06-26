import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Play, Users, FileText, Settings, Search, Eye, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import ProcessTemplateModal from "@/components/ProcessTemplateModal";
import ProcessStepExecutionModal from "@/components/ProcessStepExecutionModal";
import StartProcessModal from "@/components/StartProcessModal";
import ProcessReportModal from "@/components/ProcessReportModal";
import type { ProcessTemplate, ProcessInstance, ProcessStepInstance, User } from "@shared/schema";

interface ProcessTemplateWithSteps extends ProcessTemplate {
  stepsCount: number;
  createdByName: string;
}

interface ProcessInstanceWithDetails extends ProcessInstance {
  templateName: string;
  startedByName: string;
  clientName: string;
  currentStepName?: string;
}

interface ProcessStepInstanceWithDetails extends ProcessStepInstance {
  processName: string;
  processNumber: string;
  stepName: string;
  templateName: string;
  clientName: string;
  stepOrder: number;
}

export default function Processos() {
  const { data: authData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [isStartProcessModalOpen, setIsStartProcessModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [searchNumber, setSearchNumber] = useState("");
  const [searchResult, setSearchResult] = useState<ProcessInstanceWithDetails | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [instancesSearchTerm, setInstancesSearchTerm] = useState("");
  const [tasksSearchTerm, setTasksSearchTerm] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState("all");
  const [selectedProcessForSteps, setSelectedProcessForSteps] = useState<ProcessInstanceWithDetails | null>(null);
  const [isStepsModalOpen, setIsStepsModalOpen] = useState(false);
  const [selectedProcessForReport, setSelectedProcessForReport] = useState<ProcessInstanceWithDetails | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Fetch accessible process templates for current user
  const {
    data: processTemplates = [],
    isLoading: templatesLoading,
  } = useQuery<ProcessTemplateWithSteps[]>({
    queryKey: ["/api/process-templates/accessible"],
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

  // Fetch users for filter
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
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
      
      // Add user access permissions
      if (data.authorizedUsers && data.authorizedUsers.length > 0) {
        for (const userId of data.authorizedUsers) {
          const accessResponse = await fetch(`/api/process-templates/${template.id}/users`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({ userId }),
            credentials: "include"
          });
          
          if (!accessResponse.ok) {
            console.error("Access permission creation failed for user:", userId);
            // Continue with other users even if one fails
          }
        }
      }
      
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-templates/accessible"] });
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

  // Update process template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ data, templateId }: { data: any, templateId: number }) => {
      console.log("Updating template with data:", data, "ID:", templateId);
      
      const response = await fetch(`/api/process-templates/${templateId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          steps: data.steps,
        }),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("Template update failed:", errorData);
        throw new Error(`Erro ao atualizar modelo de processo: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-templates"] });
      toast({ title: "Modelo de processo atualizado com sucesso!" });
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      console.error("Error updating template:", error);
      toast({ 
        title: "Erro ao atualizar modelo", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete process template mutation (admin only)
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(`/api/process-templates/${templateId}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ao excluir modelo de processo: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-templates"] });
      toast({ title: "Modelo de processo excluído com sucesso!" });
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast({ 
        title: "Erro ao excluir modelo", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Start process instance mutation
  const startProcessMutation = useMutation({
    mutationFn: async ({ templateId, clientId }: { templateId: number, clientId: number }) => {
      const response = await fetch("/api/process-instances", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ templateId, clientId }),
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
      setIsStartProcessModalOpen(false);
      setSelectedTemplate(null);
    },
    onError: () => {
      toast({ 
        title: "Erro ao iniciar processo", 
        variant: "destructive" 
      });
    },
  });

  // Delete process instance mutation (admin only)
  const deleteProcessMutation = useMutation({
    mutationFn: async (processId: number) => {
      const response = await fetch(`/api/process-instances/${processId}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ao excluir processo: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-instances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/process-step-instances/my-tasks"] });
      toast({ title: "Processo excluído com sucesso!" });
    },
    onError: (error) => {
      console.error("Error deleting process:", error);
      toast({ 
        title: "Erro ao excluir processo", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleDeleteTemplate = (id: number, name: string) => {
    if (!authData?.user?.isAdmin) {
      toast({ 
        title: "Acesso negado", 
        description: "Apenas administradores podem excluir modelos de processo.",
        variant: "destructive" 
      });
      return;
    }

    const confirmMessage = `Tem certeza que deseja excluir o modelo "${name}"?\n\nEsta ação não pode ser desfeita e todos os dados relacionados serão perdidos.`;
    
    if (confirm(confirmMessage)) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleStartProcess = (template: any) => {
    setSelectedTemplate(template);
    setIsStartProcessModalOpen(true);
  };

  const handleConfirmStartProcess = (templateId: number, clientId: number) => {
    startProcessMutation.mutate({ templateId, clientId });
  };

  const handleDeleteProcess = (id: number, processNumber: string, name: string) => {
    if (!authData?.user?.isAdmin) {
      toast({ 
        title: "Acesso negado", 
        description: "Apenas administradores podem excluir processos.",
        variant: "destructive" 
      });
      return;
    }

    const confirmMessage = `Tem certeza que deseja excluir o processo "${processNumber} - ${name}"?\n\nEsta ação não pode ser desfeita e todos os dados do processo serão perdidos.`;
    
    if (confirm(confirmMessage)) {
      deleteProcessMutation.mutate(id);
    }
  };

  // Search process by number
  const searchProcessMutation = useMutation({
    mutationFn: async (processNumber: string) => {
      const response = await fetch(`/api/process-instances/number/${processNumber}`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Processo não encontrado");
        }
        throw new Error("Erro ao buscar processo");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSearchResult(data);
    },
    onError: (error) => {
      toast({ 
        title: "Erro na busca", 
        description: error.message,
        variant: "destructive" 
      });
      setSearchResult(null);
    },
  });

  const handleSearch = () => {
    if (searchNumber.trim()) {
      searchProcessMutation.mutate(searchNumber.trim());
    }
  };

  // Filter functions
  const filteredInstances = processInstances.filter(instance => {
    const searchLower = instancesSearchTerm.toLowerCase();
    const searchMatch = (
      instance.processNumber?.toLowerCase().includes(searchLower) ||
      instance.name.toLowerCase().includes(searchLower) ||
      instance.clientName.toLowerCase().includes(searchLower) ||
      instance.currentStepName?.toLowerCase().includes(searchLower) ||
      instance.templateName.toLowerCase().includes(searchLower)
    );

    // Filter by user if selected
    const userMatch = selectedUserFilter === "all" || instance.startedBy.toString() === selectedUserFilter;

    return searchMatch && userMatch;
  });

  const filteredTasks = myTasks.filter(task => {
    const searchLower = tasksSearchTerm.toLowerCase();
    return (
      task.processNumber?.toLowerCase().includes(searchLower) ||
      task.processName.toLowerCase().includes(searchLower) ||
      task.stepName.toLowerCase().includes(searchLower) ||
      task.clientName.toLowerCase().includes(searchLower) ||
      task.templateName.toLowerCase().includes(searchLower)
    );
  });

  // Fetch process steps for selected process
  const { data: processSteps = [], isLoading: stepsLoading } = useQuery({
    queryKey: [`/api/process-instances/${selectedProcessForSteps?.id}/steps`],
    enabled: !!selectedProcessForSteps?.id,
  });

  // Type the processSteps properly
  const typedProcessSteps = processSteps as Array<{
    id: number;
    status: string;
    stepName: string;
    stepOrder: number;
    stepDescription?: string;
    assignedUserName: string;
    completedAt?: string;
    startedAt?: string;
    notes?: string;
  }>;

  const handleViewSteps = (processInstance: ProcessInstanceWithDetails) => {
    setSelectedProcessForSteps(processInstance);
    setIsStepsModalOpen(true);
  };

  const handleViewReport = (processInstance: ProcessInstanceWithDetails) => {
    setSelectedProcessForReport(processInstance);
    setIsReportModalOpen(true);
  };

  // Query para buscar relatório completo do processo
  const { data: processReportData, isLoading: isLoadingReport } = useQuery({
    queryKey: ['/api/process-instances', selectedProcessForReport?.id, 'report'],
    enabled: !!selectedProcessForReport && isReportModalOpen,
    queryFn: () => fetch(`/api/process-instances/${selectedProcessForReport?.id}/report`).then(res => res.json())
  });

  const handleEditTemplate = async (template: any) => {
    try {
      // Fetch template with steps for editing
      const response = await fetch(`/api/process-templates/${template.id}/edit`, {
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Erro ao carregar dados do modelo");
      }
      
      const templateData = await response.json();
      setEditingTemplate(templateData);
      setIsTemplateModalOpen(true);
    } catch (error) {
      console.error("Error loading template for editing:", error);
      toast({ 
        title: "Erro ao carregar modelo", 
        description: "Não foi possível carregar os dados do modelo para edição",
        variant: "destructive" 
      });
    }
  };

  const handleSaveTemplate = (data: any) => {
    console.log("handleSaveTemplate called with:", { data, editingTemplate });
    if (editingTemplate && editingTemplate.id) {
      console.log("Calling updateTemplateMutation with template ID:", editingTemplate.id);
      updateTemplateMutation.mutate({ data, templateId: editingTemplate.id });
    } else {
      console.log("Calling createTemplateMutation");
      createTemplateMutation.mutate(data);
    }
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
      // Invalidate all process steps queries to update any open modals
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key && key.includes('/api/process-instances/') && key.includes('/steps');
        }
      });
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
    if (task.status === "waiting") return false; // Cannot execute waiting tasks
    
    // Only pending and in_progress tasks can be executed
    return task.status === "pending" || task.status === "in_progress";
  };

  const getBlockedReason = (task: any) => {
    if (task.status === "completed") {
      return "Esta etapa já foi executada";
    }
    
    if (task.status === "waiting") {
      return "Aguardando conclusão da etapa anterior";
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
      waiting: { label: "Aguardando", variant: "secondary" as const },
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
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {authData?.user?.isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id, template.name)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
                        onClick={() => handleStartProcess(template)}
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
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Buscar por número, cliente, etapa ou nome..."
              value={instancesSearchTerm}
              onChange={(e) => setInstancesSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {allUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {instancesLoading ? (
            <div className="text-center py-8">Carregando processos...</div>
          ) : filteredInstances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Play className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {instancesSearchTerm ? "Nenhum processo encontrado" : "Nenhum processo ativo"}
                </h3>
                <p className="text-muted-foreground text-center">
                  {instancesSearchTerm 
                    ? "Tente ajustar os termos de busca" 
                    : "Inicie um processo a partir de um modelo"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredInstances.map((instance) => (
                <Card key={instance.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{instance.name}</CardTitle>
                        <CardDescription>
                          {instance.processNumber && instance.processNumber !== "undefined" ? `${instance.processNumber} • ` : ""}Modelo: {instance.templateName}
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
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleViewSteps(instance)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Etapas do Processo
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleViewReport(instance)}
                        className="text-blue-600 hover:text-blue-700 hover:border-blue-300"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      {authData?.user?.isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteProcess(instance.id, instance.processNumber || '', instance.name)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-tasks" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Buscar por número do processo, cliente, etapa..."
              value={tasksSearchTerm}
              onChange={(e) => setTasksSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          {tasksLoading ? (
            <div className="text-center py-8">Carregando tarefas...</div>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {tasksSearchTerm ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa pendente"}
                </h3>
                <p className="text-muted-foreground text-center">
                  {tasksSearchTerm 
                    ? "Tente ajustar os termos de busca" 
                    : "Você não possui tarefas atribuídas no momento"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{task.stepName}</CardTitle>
                        <CardDescription>
                          {task.processNumber && task.processNumber !== "N/A" ? task.processNumber + " • " : ""}{task.processName}
                        </CardDescription>
                      </div>
                      {getStatusBadge(task.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{task.clientName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Modelo:</span>
                        <span className="font-medium">{task.templateName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Etapa:</span>
                        <Badge variant="outline">Etapa {task.stepOrder}</Badge>
                      </div>
                      {getBlockedReason(task) && (
                        <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                          {getBlockedReason(task)}
                        </div>
                      )}
                    </div>
                    <Button 
                      className="w-full"
                      onClick={() => handleExecuteTask(task)}
                      disabled={!canExecuteTask(task)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {task.status === "completed" ? "Já Executada" : 
                       task.status === "waiting" ? "Aguardando" : "Executar Tarefa"}
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
        onOpenChange={(open) => {
          setIsTemplateModalOpen(open);
          if (!open) {
            setEditingTemplate(null);
          }
        }}
        initialData={editingTemplate}
        onSave={handleSaveTemplate}
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

      <StartProcessModal
        open={isStartProcessModalOpen}
        onOpenChange={setIsStartProcessModalOpen}
        template={selectedTemplate}
        onStart={handleConfirmStartProcess}
        isLoading={startProcessMutation.isPending}
      />

      {/* Process Steps Modal */}
      <Dialog open={isStepsModalOpen} onOpenChange={setIsStepsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Etapas do Processo</DialogTitle>
            <DialogDescription>
              {selectedProcessForSteps && (
                <>
                  <div className="font-medium text-foreground">
                    {selectedProcessForSteps.processNumber} • {selectedProcessForSteps.name}
                  </div>
                  <div className="text-sm">
                    Cliente: {selectedProcessForSteps.clientName} • Modelo: {selectedProcessForSteps.templateName}
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {stepsLoading ? (
            <div className="text-center py-8">Carregando etapas...</div>
          ) : (
            <div className="space-y-3">
              {typedProcessSteps.map((step, index: number) => (
                <Card key={step.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {step.status === "completed" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : step.status === "in_progress" ? (
                          <Clock className="h-5 w-5 text-blue-600" />
                        ) : step.status === "waiting" ? (
                          <AlertCircle className="h-5 w-5 text-orange-600" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            {step.stepOrder}. {step.stepName}
                          </h4>
                          <Badge 
                            variant={
                              step.status === "completed" ? "default" :
                              step.status === "in_progress" ? "secondary" :
                              step.status === "waiting" ? "destructive" : "outline"
                            }
                          >
                            {step.status === "completed" ? "Concluída" :
                             step.status === "in_progress" ? "Em Progresso" :
                             step.status === "waiting" ? "Aguardando" : "Pendente"}
                          </Badge>
                        </div>
                        
                        {step.stepDescription && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {step.stepDescription}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Responsável: {step.assignedUserName}</span>
                          {step.completedAt && (
                            <span>
                              Concluída em: {new Date(step.completedAt).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {step.startedAt && !step.completedAt && (
                            <span>
                              Iniciada em: {new Date(step.startedAt).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                        
                        {step.notes && (
                          <div className="mt-2 p-2 bg-muted rounded text-sm">
                            <strong>Observações:</strong> {step.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {typedProcessSteps.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma etapa encontrada para este processo
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Relatório do Processo */}
      <ProcessReportModal
        open={isReportModalOpen}
        onOpenChange={setIsReportModalOpen}
        reportData={processReportData as any}
        isLoading={isLoadingReport}
      />
    </div>
  );
}