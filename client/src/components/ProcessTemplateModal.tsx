import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, GripVertical, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "number", "date", "checkbox", "textarea", "select"]),
  label: z.string().min(1, "Rótulo é obrigatório"),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(), // For select fields
});

const processStepSchema = z.object({
  name: z.string().min(1, "Nome da etapa é obrigatório"),
  description: z.string().optional(),
  responsibleUserId: z.number().min(1, "Responsável é obrigatório"),
  formFields: z.array(formFieldSchema).default([]),
});

const processTemplateSchema = z.object({
  name: z.string().min(1, "Nome do processo é obrigatório"),
  description: z.string().optional(),
  steps: z.array(processStepSchema).min(1, "Pelo menos uma etapa é obrigatória"),
});

type ProcessTemplateFormData = z.infer<typeof processTemplateSchema>;
type FormFieldData = z.infer<typeof formFieldSchema>;

interface ProcessTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ProcessTemplateFormData) => Promise<void>;
  initialData?: any;
}

export default function ProcessTemplateModal({
  open,
  onOpenChange,
  onSave,
  initialData,
}: ProcessTemplateModalProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<ProcessTemplateFormData>({
    resolver: zodResolver(processTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      steps: [
        {
          name: "",
          description: "",
          responsibleUserId: 0,
          formFields: [],
        },
      ],
    },
  });

  const { fields: steps, append: addStep, remove: removeStep } = useFieldArray({
    control: form.control,
    name: "steps",
  });

  // Load initial data when editing
  useEffect(() => {
    if (initialData && open) {
      const formattedData = {
        name: initialData.name || "",
        description: initialData.description || "",
        steps: initialData.steps && initialData.steps.length > 0 
          ? initialData.steps.map((step: any) => ({
              name: step.name || "",
              description: step.description || "",
              responsibleUserId: step.responsibleUserId || 0,
              formFields: step.formFields || [],
            }))
          : [{
              name: "",
              description: "",
              responsibleUserId: 0,
              formFields: [],
            }]
      };
      
      form.reset(formattedData);
      setActiveStepIndex(0);
    }
  }, [initialData, open, form]);

  // Recria o useFieldArray sempre que activeStepIndex muda para garantir isolamento
  const { fields: formFields, append: addFormField, remove: removeFormField } = useFieldArray({
    control: form.control,
    name: `steps.${activeStepIndex}.formFields`,
  });

  const onSubmit = async (data: ProcessTemplateFormData) => {
    try {
      // Add order to steps
      const dataWithOrder = {
        ...data,
        steps: data.steps.map((step, index) => ({
          ...step,
          order: index + 1,
        })),
      };
      
      await onSave(dataWithOrder);
      handleClose();
    } catch (error) {
      // Error handling is done in the mutation
      console.error("Error creating process template:", error);
    }
  };

  const handleClose = () => {
    // Reset completo do formulário
    form.reset({
      name: "",
      description: "",
      steps: [
        {
          name: "",
          description: "",
          responsibleUserId: 0,
          formFields: [],
        },
      ],
    });
    setActiveStepIndex(0);
    onOpenChange(false);
  };

  // Forçar re-render e garantir isolamento quando mudar de etapa
  const handleStepChange = (stepIndex: number) => {
    // Força o form a re-validar os campos da etapa atual antes de mudar
    form.trigger(`steps.${activeStepIndex}`);
    setActiveStepIndex(stepIndex);
  };

  // Garantir que a etapa tem valores padrão ao ser criada
  const ensureStepDefaults = (stepIndex: number) => {
    const currentStep = form.getValues(`steps.${stepIndex}`);
    if (!currentStep) {
      form.setValue(`steps.${stepIndex}`, {
        name: "",
        description: "",
        responsibleUserId: 0,
        formFields: [],
      });
    } else {
      // Garantir que todos os campos obrigatórios existem
      if (currentStep.name === undefined) form.setValue(`steps.${stepIndex}.name`, "");
      if (currentStep.description === undefined) form.setValue(`steps.${stepIndex}.description`, "");
      if (currentStep.responsibleUserId === undefined) form.setValue(`steps.${stepIndex}.responsibleUserId`, 0);
      if (!currentStep.formFields) form.setValue(`steps.${stepIndex}.formFields`, []);
    }
  };

  const addNewFormField = () => {
    const newField: FormFieldData = {
      id: `field_${activeStepIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "text",
      label: "",
      required: false,
    };
    
    // Garantir que estamos adicionando ao array correto da etapa ativa
    const currentFields = form.getValues(`steps.${activeStepIndex}.formFields`) || [];
    form.setValue(`steps.${activeStepIndex}.formFields`, [...currentFields, newField]);
  };

  const fieldTypeOptions = [
    { value: "text", label: "Texto" },
    { value: "number", label: "Número" },
    { value: "date", label: "Data" },
    { value: "checkbox", label: "Checkbox" },
    { value: "textarea", label: "Área de Texto" },
    { value: "select", label: "Seleção" },
  ];

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleClose();
      } else {
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Modelo de Processo" : "Novo Modelo de Processo"}
          </DialogTitle>
          <DialogDescription>
            {initialData 
              ? "Edite o modelo de processo e suas etapas sequenciais."
              : "Crie um modelo de processo com etapas sequenciais e formulários personalizados."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">Nome do Processo</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Ex: Aprovação de Despesas"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                {...form.register("description")}
                placeholder="Descreva o objetivo deste processo..."
              />
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Etapas do Processo</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newStepIndex = steps.length;
                  addStep({
                    name: "",
                    description: "",
                    responsibleUserId: 0,
                    formFields: [],
                  });
                  // Automatically switch to the new step
                  setTimeout(() => {
                    ensureStepDefaults(newStepIndex);
                    handleStepChange(newStepIndex);
                  }, 0);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Etapa
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Steps List */}
              <div className="space-y-2">
                <Label>Lista de Etapas</Label>
                {steps.map((step, index) => {
                  const stepFormFields = form.watch(`steps.${index}.formFields`) || [];
                  return (
                    <Card
                      key={step.id}
                      className={`cursor-pointer transition-colors ${
                        activeStepIndex === index ? "ring-2 ring-blue-500 bg-blue-50" : ""
                      }`}
                      onClick={() => {
                        ensureStepDefaults(index);
                        handleStepChange(index);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                            <Badge variant="secondary">{index + 1}</Badge>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {form.watch(`steps.${index}.name`) || `Etapa ${index + 1}`}
                              </span>
                              {stepFormFields.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {stepFormFields.length} campo{stepFormFields.length !== 1 ? 's' : ''} personalizado{stepFormFields.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          {steps.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeStep(index);
                                if (activeStepIndex >= index && activeStepIndex > 0) {
                                  handleStepChange(activeStepIndex - 1);
                                } else if (activeStepIndex >= steps.length - 1) {
                                  handleStepChange(Math.max(0, steps.length - 2));
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Step Details */}
              <div className="space-y-4">
                <Label>Configuração da Etapa {activeStepIndex + 1}</Label>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Detalhes da Etapa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor={`step-name-${activeStepIndex}`}>Nome da Etapa</Label>
                      <Input
                        key={`step-name-${activeStepIndex}`}
                        id={`step-name-${activeStepIndex}`}
                        value={form.watch(`steps.${activeStepIndex}.name`) || ""}
                        onChange={(e) => form.setValue(`steps.${activeStepIndex}.name`, e.target.value)}
                        placeholder="Ex: Revisão do Gerente"
                      />
                      {form.formState.errors.steps?.[activeStepIndex]?.name && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.steps[activeStepIndex]?.name?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`step-description-${activeStepIndex}`}>Descrição</Label>
                      <Textarea
                        key={`step-description-${activeStepIndex}`}
                        id={`step-description-${activeStepIndex}`}
                        value={form.watch(`steps.${activeStepIndex}.description`) || ""}
                        onChange={(e) => form.setValue(`steps.${activeStepIndex}.description`, e.target.value)}
                        placeholder="Descreva o que deve ser feito nesta etapa..."
                      />
                    </div>

                    <div>
                      <Label htmlFor={`step-responsible-${activeStepIndex}`}>Responsável</Label>
                      <Select
                        key={`step-responsible-${activeStepIndex}`}
                        value={form.watch(`steps.${activeStepIndex}.responsibleUserId`)?.toString() || ""}
                        onValueChange={(value) =>
                          form.setValue(`steps.${activeStepIndex}.responsibleUserId`, parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.steps?.[activeStepIndex]?.responsibleUserId && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.steps[activeStepIndex]?.responsibleUserId?.message}
                        </p>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Formulário Personalizado desta Etapa</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addNewFormField}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar Campo
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Cada etapa pode ter seu próprio formulário. Defina os campos que o responsável 
                        deve preencher ao executar esta etapa.
                      </p>

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {(form.watch(`steps.${activeStepIndex}.formFields`) || []).length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhum campo personalizado criado</p>
                            <p className="text-xs">Clique em "Adicionar Campo" para criar formulários personalizados</p>
                          </div>
                        ) : (
                          (form.watch(`steps.${activeStepIndex}.formFields`) || []).map((field, fieldIndex) => (
                            <Card key={`step-${activeStepIndex}-field-${fieldIndex}-${field.id}`} className="p-3">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Input
                                    key={`field-label-${activeStepIndex}-${fieldIndex}`}
                                    placeholder="Ex: Valor do Orçamento, Parecer Técnico..."
                                    value={field.label || ""}
                                    onChange={(e) => {
                                      const currentFields = form.getValues(`steps.${activeStepIndex}.formFields`) || [];
                                      const newFields = [...currentFields];
                                      newFields[fieldIndex] = { ...newFields[fieldIndex], label: e.target.value };
                                      form.setValue(`steps.${activeStepIndex}.formFields`, newFields);
                                    }}
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const currentFields = form.getValues(`steps.${activeStepIndex}.formFields`) || [];
                                      const newFields = currentFields.filter((_, index) => index !== fieldIndex);
                                      form.setValue(`steps.${activeStepIndex}.formFields`, newFields);
                                    }}
                                    className="ml-2 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="flex flex-wrap gap-2 items-center">
                                  <div className="flex items-center space-x-2">
                                    <Label className="text-xs">Tipo:</Label>
                                    <Select
                                      key={`field-type-${activeStepIndex}-${fieldIndex}`}
                                      value={field.type || "text"}
                                      onValueChange={(value) => {
                                        const currentFields = form.getValues(`steps.${activeStepIndex}.formFields`) || [];
                                        const newFields = [...currentFields];
                                        newFields[fieldIndex] = { ...newFields[fieldIndex], type: value as any };
                                        form.setValue(`steps.${activeStepIndex}.formFields`, newFields);
                                      }}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {fieldTypeOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <input
                                      key={`field-required-${activeStepIndex}-${fieldIndex}`}
                                      type="checkbox"
                                      id={`required-${activeStepIndex}-${fieldIndex}`}
                                      checked={field.required || false}
                                      onChange={(e) => {
                                        const currentFields = form.getValues(`steps.${activeStepIndex}.formFields`) || [];
                                        const newFields = [...currentFields];
                                        newFields[fieldIndex] = { ...newFields[fieldIndex], required: e.target.checked };
                                        form.setValue(`steps.${activeStepIndex}.formFields`, newFields);
                                      }}
                                    />
                                    <Label htmlFor={`required-${activeStepIndex}-${fieldIndex}`} className="text-xs">
                                      Campo obrigatório
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting 
                ? (initialData ? "Atualizando..." : "Criando...") 
                : (initialData ? "Atualizar Modelo" : "Criar Modelo")
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}