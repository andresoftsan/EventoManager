import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { Event } from "@shared/schema";

const eventFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  startDate: z.string().min(1, "Data inicial é obrigatória"),
  endDate: z.string().optional(),
  startTime: z.string().min(1, "Hora inicial é obrigatória"),
  endTime: z.string().min(1, "Hora final é obrigatória"),
  multipleDays: z.boolean().default(false),
  userId: z.number().optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event;
  onSave: (data: any) => Promise<void>;
}

interface UserWithoutPassword {
  id: number;
  username: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export default function EventModalNew({ 
  open, 
  onOpenChange, 
  event, 
  onSave 
}: EventModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { data: authData } = useAuth();

  // Fetch users list for admin users
  const { data: users = [] } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
    enabled: authData?.user?.isAdmin && open,
  });

  const isAdmin = authData?.user?.isAdmin;

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      startDate: event?.date || "",
      endDate: "",
      startTime: event?.startTime || "",
      endTime: event?.endTime || "",
      multipleDays: false,
      userId: event?.userId || undefined,
    },
  });

  const watchMultipleDays = form.watch("multipleDays");

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      if (data.multipleDays && data.endDate) {
        // Create events for multiple days
        const events = [];
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const eventData = {
            title: data.title,
            description: data.description,
            date: d.toISOString().split('T')[0],
            startTime: data.startTime,
            endTime: data.endTime,
            userId: data.userId
          };
          events.push(eventData);
        }

        // Save each event
        for (const eventData of events) {
          await onSave(eventData);
        }
      } else {
        // Single event
        const eventData = {
          title: data.title,
          description: data.description,
          date: data.startDate,
          startTime: data.startTime,
          endTime: data.endTime,
          userId: data.userId
        };
        await onSave(eventData);
      }

      form.reset();
      onOpenChange(false);
      toast({
        title: "Sucesso",
        description: data.multipleDays 
          ? "Eventos criados com sucesso!" 
          : event 
            ? "Evento atualizado com sucesso!" 
            : "Evento criado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar evento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {event ? "Editar Evento" : "Novo Evento"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Evento</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título do evento" {...field} />
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
                    <Textarea 
                      placeholder="Digite a descrição do evento"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Multiple Days Option */}
            {!event && (
              <FormField
                control={form.control}
                name="multipleDays"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Criar evento para múltiplos dias</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}
            
            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Inicial</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {watchMultipleDays && (
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Final</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Time Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Inicial</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Final</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* User Selection for Admin */}
            {isAdmin && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário do Evento</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o usuário" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} (@{user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="flex space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Salvando..." : "Salvar Evento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}