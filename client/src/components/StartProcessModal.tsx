import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Client } from "@shared/schema";

const startProcessSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente"),
});

type StartProcessData = z.infer<typeof startProcessSchema>;

interface StartProcessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: number;
    name: string;
    description: string;
    stepsCount: number;
  } | null;
  onStart: (templateId: number, clientId: number) => void;
  isLoading?: boolean;
}

export default function StartProcessModal({
  open,
  onOpenChange,
  template,
  onStart,
  isLoading = false,
}: StartProcessModalProps) {
  const form = useForm<StartProcessData>({
    resolver: zodResolver(startProcessSchema),
    defaultValues: {
      clientId: "",
    },
  });

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const onSubmit = (data: StartProcessData) => {
    if (!template) return;
    
    const clientId = parseInt(data.clientId);
    onStart(template.id, clientId);
    form.reset();
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Processo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{template.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {template.stepsCount} etapa{template.stepsCount !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente para este processo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            <div>
                              <div className="font-medium">{client.name}</div>
                              {client.cnpj && (
                                <div className="text-xs text-muted-foreground">
                                  CNPJ: {client.cnpj}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Iniciando..." : "Iniciar Processo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}