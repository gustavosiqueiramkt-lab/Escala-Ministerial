import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Service } from '@/hooks/useServices';

// Parse date string YYYY-MM-DD without timezone conversion
function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Compare dates ignoring time (for date strings)
function isSameDateString(dateStr: string, date: Date): boolean {
  const parsed = parseDateString(dateStr);
  return parsed.getFullYear() === date.getFullYear() &&
         parsed.getMonth() === date.getMonth() &&
         parsed.getDate() === date.getDate();
}

interface CalendarViewProps {
  services: Service[];
  onDateClick?: (date: Date) => void;
  onServiceClick?: (service: Service) => void;
}

export function CalendarView({ services, onDateClick, onServiceClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the beginning with empty cells
  const startDay = monthStart.getDay();
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const getServicesForDay = (date: Date) => {
    return services.filter((service) => isSameDateString(service.date, date));
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="card-elevated p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl font-semibold capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddedDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dayServices = getServicesForDay(day);
          const today = new Date();
          const isToday = day.getFullYear() === today.getFullYear() &&
                          day.getMonth() === today.getMonth() &&
                          day.getDate() === today.getDate();

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateClick?.(day)}
              className={cn(
                'aspect-square p-1 rounded-lg border border-transparent cursor-pointer transition-all duration-200 hover:border-primary/20 hover:bg-secondary/50',
                isToday && 'bg-primary/5 border-primary/30'
              )}
            >
              <div
                className={cn(
                  'text-sm font-medium mb-1',
                  isToday ? 'text-primary' : 'text-foreground'
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayServices.slice(0, 2).map((service) => (
                  <div
                    key={service.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onServiceClick?.(service);
                    }}
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors',
                      service.status === 'published'
                        ? 'bg-success/20 text-success hover:bg-success/30'
                        : 'bg-warning/20 text-warning hover:bg-warning/30'
                    )}
                    title={`${service.title} - ${service.time}`}
                  >
                    {service.title.length > 10 ? service.title.slice(0, 10) + '…' : service.title} · {service.time}
                  </div>
                ))}
                {dayServices.length > 2 && (
                  <div className="text-xs text-muted-foreground px-1">
                    +{dayServices.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
