import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <p className="font-semibold text-sm">Notificações</p>
          {unreadCount > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => markAllAsRead.mutate()}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y">
          {notifications.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">
              Nenhuma notificação
            </p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                'p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                !n.read && 'bg-primary/5'
              )}
              onClick={() => !n.read && markAsRead.mutate(n.id)}
            >
              <p className={cn('text-sm', !n.read && 'font-medium')}>{n.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(n.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
