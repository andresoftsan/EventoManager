import { useQuery } from "@tanstack/react-query";
import { Calendar, CalendarCheck, Users, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalEvents: number;
  todayEvents: number;
  nextWeekEvents: number;
  activeUsers: number;
}

interface EventWithUser {
  id: number;
  title: string;
  description?: string;
  date: string;
  time: string;
  userId: number;
  userName: string;
  createdAt: string;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery<EventWithUser[]>({
    queryKey: ["/api/events"],
  });

  const recentEvents = events?.slice(0, 5) || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const statCards = [
    {
      title: "Total de Eventos",
      value: stats?.totalEvents || 0,
      icon: CalendarCheck,
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Eventos Hoje",
      value: stats?.todayEvents || 0,
      icon: Calendar,
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Usuários Ativos",
      value: stats?.activeUsers || 0,
      icon: Users,
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600",
    },
    {
      title: "Próxima Semana",
      value: stats?.nextWeekEvents || 0,
      icon: Clock,
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h2>
        <p className="text-gray-600">Visão geral dos eventos registrados no sistema</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <Card key={index} className="border border-gray-200">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-600">{stat.title}</p>
                    {statsLoading ? (
                      <Skeleton className="h-6 lg:h-8 w-8 lg:w-12 mt-1" />
                    ) : (
                      <p className="text-lg lg:text-3xl font-bold text-gray-800">{stat.value}</p>
                    )}
                  </div>
                  <div className={`${stat.bgColor} rounded-lg p-2 lg:p-3`}>
                    <Icon className={`${stat.iconColor} h-4 w-4 lg:h-6 lg:w-6`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Events */}
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Eventos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {eventsLoading ? (
            <div className="p-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 py-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentEvents.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Nenhum evento encontrado
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`rounded-lg p-2 ${
                      index % 3 === 0 ? 'bg-blue-50' :
                      index % 3 === 1 ? 'bg-green-50' : 'bg-yellow-50'
                    }`}>
                      <Calendar className={`h-5 w-5 ${
                        index % 3 === 0 ? 'text-blue-600' :
                        index % 3 === 1 ? 'text-green-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-800">{event.title}</h4>
                      <p className="text-sm text-gray-600">Criado por {event.userName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">
                      {formatDate(event.date)}
                    </p>
                    <p className="text-sm text-gray-600">{event.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
