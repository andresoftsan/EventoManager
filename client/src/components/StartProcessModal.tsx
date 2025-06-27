import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

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

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    
    const searchLower = searchTerm.toLowerCase();
    return clients.filter(client => 
      client.razaoSocial?.toLowerCase().includes(searchLower) ||
      client.nomeFantasia?.toLowerCase().includes(searchLower) ||
      client.cnpj?.includes(searchTerm)
    );
  }, [clients, searchTerm]);

  const onSubmit = (data: StartProcessData) => {
    if (!template || !selectedClientId) return;
    
    onStart(template.id, selectedClientId);
    form.reset();
    setSelectedClientId(null);
    setSearchTerm("");
  };

  const handleClose = () => {
    form.reset();
    setSelectedClientId(null);
    setSearchTerm("");
    onOpenChange(false);
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClientId(client.id);
    form.setValue("clientId", client.id.toString());
    setSearchTerm(client.razaoSocial);
  };

  const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;

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
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar cliente por nome ou CNPJ..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      {selectedClient && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{selectedClient.razaoSocial}</div>
                              {selectedClient.cnpj && (
                                <div className="text-xs text-muted-foreground">
                                  CNPJ: {selectedClient.cnpj}
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary">
                              <Check className="h-3 w-3 mr-1" />
                              Selecionado
                            </Badge>
                          </div>
                        </div>
                      )}
                      
                      {searchTerm && !selectedClient && (
                        <ScrollArea className="h-32 border rounded-lg">
                          <div className="p-2 space-y-1">
                            {filteredClients.length === 0 ? (
                              <div className="text-center text-muted-foreground py-4">
                                Nenhum cliente encontrado
                              </div>
                            ) : (
                              filteredClients.map((client) => (
                                <div
                                  key={client.id}
                                  className="p-2 rounded cursor-pointer hover:bg-muted transition-colors"
                                  onClick={() => handleClientSelect(client)}
                                >
                                  <div className="font-medium">{client.razaoSocial}</div>
                                  {client.nomeFantasia && client.nomeFantasia !== client.razaoSocial && (
                                    <div className="text-sm text-muted-foreground">{client.nomeFantasia}</div>
                                  )}
                                  {client.cnpj && (
                                    <div className="text-xs text-muted-foreground">
                                      CNPJ: {client.cnpj}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !selectedClientId}>
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