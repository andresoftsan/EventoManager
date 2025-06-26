import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Printer, FileText, CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react";

interface ProcessReportData {
  processInfo: {
    id: number;
    processNumber: string;
    name: string;
    status: string;
    startedAt: string;
    templateName: string;
    clientName: string;
    startedByName: string;
  };
  steps: Array<{
    id: number;
    stepName: string;
    stepDescription: string;
    stepOrder: number;
    status: string;
    assignedUserName: string;
    formData: Record<string, any>;
    formFields: Array<{
      id: string;
      type: string;
      label: string;
      required: boolean;
      options?: string[];
    }>;
    startedAt: string | null;
    completedAt: string | null;
    notes: string | null;
  }>;
}

interface ProcessReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: ProcessReportData | null;
  isLoading: boolean;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Concluída</Badge>;
    case "in_progress":
      return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Em Progresso</Badge>;
    case "waiting":
      return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />Aguardando</Badge>;
    default:
      return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Pendente</Badge>;
  }
};

const getProcessStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-800">Concluído</Badge>;
    case "active":
      return <Badge className="bg-blue-100 text-blue-800">Ativo</Badge>;
    case "cancelled":
      return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>;
    default:
      return <Badge variant="secondary">Pendente</Badge>;
  }
};

const formatFieldValue = (field: any, value: any) => {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground italic">Não preenchido</span>;
  }

  switch (field.type) {
    case "checkbox":
      return value ? "Sim" : "Não";
    case "date":
      return new Date(value).toLocaleDateString('pt-BR');
    case "select":
      return value;
    default:
      return value.toString();
  }
};

export default function ProcessReportModal({ 
  open, 
  onOpenChange, 
  reportData, 
  isLoading 
}: ProcessReportModalProps) {
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carregando Relatório...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="h-12 w-12 text-muted-foreground mb-4 mx-auto animate-spin" />
              <p className="text-muted-foreground">Gerando relatório do processo...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatório Completo do Processo
          </DialogTitle>
          <DialogDescription>
            Visualização completa de todas as etapas e dados preenchidos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 print:space-y-4">
          {/* Cabeçalho do Processo */}
          <Card className="print:shadow-none print:border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {reportData.processInfo.processNumber}
                </CardTitle>
                {getProcessStatusBadge(reportData.processInfo.status)}
              </div>
              <CardDescription className="text-lg font-medium text-foreground">
                {reportData.processInfo.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm print:text-xs">
                <div>
                  <span className="text-muted-foreground">Modelo:</span>
                  <p className="font-medium">{reportData.processInfo.templateName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <p className="font-medium">{reportData.processInfo.clientName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Iniciado por:</span>
                  <p className="font-medium">{reportData.processInfo.startedByName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data de início:</span>
                  <p className="font-medium">
                    {new Date(reportData.processInfo.startedAt).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(reportData.processInfo.startedAt).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Etapas do Processo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Etapas do Processo</h3>
            
            {reportData.steps.map((step, index) => (
              <Card key={step.id} className="print:shadow-none print:border print:break-inside-avoid">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Etapa {step.stepOrder}: {step.stepName}
                    </CardTitle>
                    {getStatusBadge(step.status)}
                  </div>
                  {step.stepDescription && (
                    <CardDescription>{step.stepDescription}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Informações da Etapa */}
                  <div className="grid grid-cols-2 gap-4 text-sm print:text-xs">
                    <div>
                      <span className="text-muted-foreground">Responsável:</span>
                      <p className="font-medium">{step.assignedUserName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <p className="font-medium capitalize">{step.status.replace('_', ' ')}</p>
                    </div>
                    {step.startedAt && (
                      <div>
                        <span className="text-muted-foreground">Iniciada em:</span>
                        <p className="font-medium">
                          {new Date(step.startedAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(step.startedAt).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    )}
                    {step.completedAt && (
                      <div>
                        <span className="text-muted-foreground">Concluída em:</span>
                        <p className="font-medium">
                          {new Date(step.completedAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(step.completedAt).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dados do Formulário */}
                  {step.formFields.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3">Dados Preenchidos:</h4>
                        <div className="space-y-3">
                          {step.formFields.map((field) => (
                            <div key={field.id} className="flex flex-col space-y-1">
                              <span className="text-sm font-medium text-muted-foreground">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </span>
                              <div className="text-sm p-2 bg-muted rounded">
                                {formatFieldValue(field, step.formData[field.id])}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Notas */}
                  {step.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Observações:</h4>
                        <div className="text-sm p-3 bg-muted rounded">
                          {step.notes}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2 pt-4 print:hidden">
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Relatório
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}