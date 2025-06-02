import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import EventModal from "@/components/EventModal";
import type { Event } from "@shared/schema";

interface EventWithUser extends Event {
  userName: string;
}

interface UserWithoutPassword {
  id: number;
  username: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
}

export default function Agenda() {
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>();
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: authData } = useAuth();

  const { data: events = [], isLoading } = useQuery<EventWithUser[]>({
    queryKey: ["/api/events"],
  });

  // Fetch users list for admin filter
  const { data: users = [] } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
    enabled: authData?.user?.isAdmin,
  });

  const isAdmin = authData?.user?.isAdmin;

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

  // Filter events based on selected user
  const filteredEvents = selectedUserId === "all" 
    ? events 
    : events.filter(event => event.userId.toString() === selectedUserId);

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  // Generate calendar grid for month view
  const generateMonthCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateCopy = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dayEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate.toDateString() === currentDateCopy.toDateString();
      });
      
      days.push({
        date: new Date(currentDateCopy),
        isCurrentMonth: currentDateCopy.getMonth() === month,
        events: dayEvents,
      });
      
      currentDateCopy.setDate(currentDateCopy.getDate() + 1);
    }
    
    return { days, monthName: firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
  };

  // Generate week view
  const generateWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      
      const dayEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.date + 'T00:00:00');
        return eventDate.toDateString() === day.toDateString();
      });
      
      days.push({
        date: new Date(day),
        events: dayEvents,
      });
    }
    
    return { 
      days, 
      weekRange: `${startOfWeek.toLocaleDateString('pt-BR')} - ${new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}`
    };
  };

  // Generate day view
  const generateDayView = () => {
    const dayEvents = filteredEvents.filter(event => {
      const eventDate = new Date(event.date + 'T00:00:00');
      return eventDate.toDateString() === currentDate.toDateString();
    });
    
    return {
      date: currentDate,
      events: dayEvents.sort((a, b) => a.time.localeCompare(b.time)),
      dayName: currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    };
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Agenda</h2>
          <p className="text-gray-600">Gerencie seus eventos e compromissos</p>
        </div>
        <div className="flex gap-3">
          {/* User Filter for Admins */}
          {isAdmin && (
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Button 
            onClick={handleNewEvent}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "month" | "week" | "day")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="month">Mês</TabsTrigger>
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="day">Dia</TabsTrigger>
        </TabsList>

        {/* Month View */}
        <TabsContent value="month">
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800 capitalize">
                  {generateMonthCalendar().monthName}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Hoje
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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
                    {generateMonthCalendar().days.map((day, index) => (
                      <div
                        key={index}
                        className={`aspect-square p-2 rounded-lg cursor-pointer transition-colors ${
                          day.isCurrentMonth 
                            ? "hover:bg-gray-50" 
                            : "text-gray-400"
                        }`}
                        onClick={() => {
                          setCurrentDate(day.date);
                          setViewMode('day');
                        }}
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
        </TabsContent>

        {/* Week View */}
        <TabsContent value="week">
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800">
                  {generateWeekView().weekRange}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Esta Semana
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="grid grid-cols-7 gap-4">
                  {generateWeekView().days.map((day, index) => (
                    <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                         onClick={() => {
                           setCurrentDate(day.date);
                           setViewMode('day');
                         }}>
                      <div className="text-center mb-3">
                        <div className="text-xs text-gray-500">{weekDays[index]}</div>
                        <div className="text-lg font-semibold">{day.date.getDate()}</div>
                      </div>
                      <div className="space-y-1">
                        {day.events.slice(0, 3).map((event, eventIndex) => (
                          <div key={event.id} className="text-xs p-1 rounded bg-blue-100 text-blue-800 truncate">
                            {event.time} - {event.title}
                          </div>
                        ))}
                        {day.events.length > 3 && (
                          <div className="text-xs text-gray-500">+{day.events.length - 3} mais</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Day View */}
        <TabsContent value="day">
          <Card className="border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800 capitalize">
                  {generateDayView().dayName}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateDay('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    Hoje
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateDay('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : generateDayView().events.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum evento para este dia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generateDayView().events.map((event, index) => (
                    <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
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
                            <div className="flex items-center gap-4 mt-1">
                              <Badge variant="outline">{event.time}</Badge>
                              <span className="text-sm text-gray-500">por {event.userName}</span>
                            </div>
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EventModal
        open={eventModalOpen}
        onOpenChange={setEventModalOpen}
        event={editingEvent}
        onSave={handleSaveEvent}
      />
    </div>
  );
}
