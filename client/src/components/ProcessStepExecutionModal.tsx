import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface FormField {
  id: string;
  type: "text" | "number" | "date" | "checkbox" | "textarea" | "select";
  label: string;
  required: boolean;
  options?: string[];
}

interface ProcessStepExecutionData {
  id: number;
  processInstanceId: number;
  stepId: number;
  status: string;
  assignedUserId: number;
  formData: Record<string, any>;
  stepName: string;
  processName: string;
  templateName: string;
  stepOrder?: number;
  formFields?: FormField[];
}

interface ProcessStepExecutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepInstance: ProcessStepExecutionData | null;
  onExecute: (stepInstanceId: number, formData: Record<string, any>, notes?: string) => Promise<void>;
  canExecute: boolean;
  blockedReason?: string;
}

export default function ProcessStepExecutionModal({
  open,
  onOpenChange,
  stepInstance,
  onExecute,
  canExecute,
  blockedReason,
}: ProcessStepExecutionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create dynamic form schema based on step form fields
  const createFormSchema = () => {
    if (!stepInstance?.formFields) return z.object({ notes: z.string().optional() });

    const schemaFields: Record<string, z.ZodTypeAny> = {
      notes: z.string().optional(),
    };

    stepInstance.formFields.forEach((field) => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case "text":
        case "textarea":
          fieldSchema = z.string();
          break;
        case "number":
          fieldSchema = z.coerce.number();
          break;
        case "date":
          fieldSchema = z.string();
          break;
        case "checkbox":
          fieldSchema = z.boolean().default(false);
          break;
        case "select":
          fieldSchema = z.string();
          break;
        default:
          fieldSchema = z.string();
      }

      if (field.required && field.type !== "checkbox") {
        fieldSchema = fieldSchema.refine((val) => val !== "" && val !== undefined, {
          message: `${field.label} é obrigatório`,
        });
      }

      schemaFields[field.id] = fieldSchema;
    });

    return z.object(schemaFields);
  };

  const form = useForm({
    resolver: zodResolver(createFormSchema()),
    defaultValues: {
      notes: "",
      ...stepInstance?.formData,
    },
  });

  const onSubmit = async (data: any) => {
    if (!stepInstance || !canExecute) return;

    setIsSubmitting(true);
    try {
      const { notes, ...formData } = data;
      await onExecute(stepInstance.id, formData, notes);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error executing step:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFormField = (field: FormField) => {
    const fieldId = field.id;

    switch (field.type) {
      case "text":
        return (
          <div key={fieldId}>
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              {...form.register(fieldId)}
              placeholder={`Digite ${field.label.toLowerCase()}`}
              disabled={!canExecute}
            />
            {form.formState.errors[fieldId] && (
              <p className="text-sm text-red-600">
                {form.formState.errors[fieldId]?.message as string}
              </p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={fieldId}>
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={fieldId}
              {...form.register(fieldId)}
              placeholder={`Digite ${field.label.toLowerCase()}`}
              disabled={!canExecute}
            />
            {form.formState.errors[fieldId] && (
              <p className="text-sm text-red-600">
                {form.formState.errors[fieldId]?.message as string}
              </p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={fieldId}>
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="number"
              {...form.register(fieldId)}
              placeholder={`Digite ${field.label.toLowerCase()}`}
              disabled={!canExecute}
            />
            {form.formState.errors[fieldId] && (
              <p className="text-sm text-red-600">
                {form.formState.errors[fieldId]?.message as string}
              </p>
            )}
          </div>
        );

      case "date":
        return (
          <div key={fieldId}>
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={fieldId}
              type="date"
              {...form.register(fieldId)}
              disabled={!canExecute}
            />
            {form.formState.errors[fieldId] && (
              <p className="text-sm text-red-600">
                {form.formState.errors[fieldId]?.message as string}
              </p>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div key={fieldId} className="flex items-center space-x-2">
            <Checkbox
              id={fieldId}
              checked={form.watch(fieldId) || false}
              onCheckedChange={(checked) => form.setValue(fieldId, checked)}
              disabled={!canExecute}
            />
            <Label htmlFor={fieldId}>{field.label}</Label>
          </div>
        );

      case "select":
        return (
          <div key={fieldId}>
            <Label htmlFor={fieldId}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={form.watch(fieldId) || ""}
              onValueChange={(value) => form.setValue(fieldId, value)}
              disabled={!canExecute}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors[fieldId] && (
              <p className="text-sm text-red-600">
                {form.formState.errors[fieldId]?.message as string}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!stepInstance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Executar Etapa do Processo</DialogTitle>
          <DialogDescription>
            {stepInstance.processName} - {stepInstance.templateName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{stepInstance.stepName}</CardTitle>
                <Badge 
                  variant={
                    stepInstance.status === "completed" ? "default" :
                    stepInstance.status === "in_progress" ? "secondary" : "outline"
                  }
                >
                  {stepInstance.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                  {stepInstance.status === "in_progress" && <Clock className="h-3 w-3 mr-1" />}
                  {stepInstance.status === "pending" && <AlertCircle className="h-3 w-3 mr-1" />}
                  {stepInstance.status === "completed" ? "Concluída" :
                   stepInstance.status === "in_progress" ? "Em andamento" : "Pendente"}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {!canExecute && blockedReason && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-2 text-orange-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{blockedReason}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {stepInstance.formFields && stepInstance.formFields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Formulário da Etapa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stepInstance.formFields.map(renderFormField)}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  {...form.register("notes")}
                  placeholder="Adicione observações sobre a execução desta etapa (opcional)"
                  disabled={!canExecute}
                />
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={!canExecute || isSubmitting || stepInstance.status === "completed"}
              >
                {isSubmitting ? "Executando..." : 
                 stepInstance.status === "completed" ? "Já Executada" : "Executar Etapa"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}