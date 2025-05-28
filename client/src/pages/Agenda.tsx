import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import EventModal from "@/components/EventModal";
import type { Event } from "@shared/schema";

interface EventWithUser extends Event {
  userName: string;
}

export default function Agenda() {
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery<EventWithUser[]>({
    queryKey: ["/api/events"],
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/events", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/events/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Sucesso",
        description: "Evento excluído com sucesso!",
      });
    },
  });

  const handleSaveEvent = async (data: any) => {
    if (editingEvent) {
      await updateEventMutation.mutateAsync({ id: editingEvent.id, data });
    } else {
      await createEventMutation.mutateAsync(data);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventModalOpen(true);
  };

  const handleDeleteEvent = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este evento?")) {
      deleteEventMutation.mutate(id);
    }
  };

  const handleNewEvent = () => {
    setEditingEvent(undefined);
    setEventModalOpen(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  // Generate calendar grid
  const generateCalendar = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate.toDateString() === currentDate.toDateString();
      });
      
      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        events: dayEvents,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return { days, monthName: firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
  };

  const { days, monthName } = generateCalendar();
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Agenda</h2>
          <p className="text-gray-600">Gerencie seus eventos e compromissos</p>
        </div>
        <Button 
          onClick={handleNewEvent}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {/* Calendar View */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-gray-800 capitalize">
            {monthName}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div>
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {weekDays.map((day) => (
                  <div key={day} className="text-center font-medium text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={`aspect-square p-2 rounded-lg cursor-pointer transition-colors ${
                      day.isCurrentMonth 
                        ? "hover:bg-gray-50" 
                        : "text-gray-400"
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {day.date.getDate()}
                    </div>
                    {day.events.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {day.events.slice(0, 2).map((_, eventIndex) => (
                          <div
                            key={eventIndex}
                            className={`w-2 h-2 rounded-full ${
                              eventIndex === 0 ? 'bg-blue-500' :
                              eventIndex === 1 ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                          />
                        ))}
                        {day.events.length > 2 && (
                          <div className="text-xs text-gray-500">+{day.events.length - 2}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events List */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Meus Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum evento encontrado. Clique em "Novo Evento" para criar o primeiro.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`rounded-lg p-3 ${
                      index % 3 === 0 ? 'bg-blue-50' :
                      index % 3 === 1 ? 'bg-green-50' : 'bg-yellow-50'
                    }`}>
                      <CalendarIcon className={`h-5 w-5 ${
                        index % 3 === 0 ? 'text-blue-600' :
                        index % 3 === 1 ? 'text-green-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-gray-600">{event.description}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        {formatDate(event.date)} às {event.time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEvent(event)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-red-600 hover:text-red-700"
                      disabled={deleteEventMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EventModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        event={editingEvent}
        onSave={handleSaveEvent}
      />
    </div>
  );
}
