import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Music, 
  Calendar, 
  ChevronLeft,
  ChevronRight,
  Church,
  CalendarCheck,
  UserCog,
  ChevronsUpDown,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useOrgRole } from '@/hooks/useOrgRole';
import { useOrganization } from '@/hooks/useOrganization';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { title: 'Cultos', icon: Calendar, path: '/services' },
  { title: 'Músicas', icon: Music, path: '/songs', leaderOnly: true },
];

const volunteerItems = [
  { title: 'Minha Agenda', icon: CalendarCheck, path: '/my-schedule' },
];

const adminItems = [
  { title: 'Gestão de Equipe', icon: UserCog, path: '/team' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { isLeader } = useOrgRole();
  const { organization, organizations, hasMultipleOrgs, setSelectedOrgId, selectedOrgId } = useOrganization();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen gradient-primary transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo / Org Selector */}
      <div className="p-4 border-b border-sidebar-border">
        {hasMultipleOrgs && !collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-accent/50 px-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent flex-shrink-0">
                    <Church className="h-5 w-5 text-sidebar-foreground" />
                  </div>
                  <span className="truncate font-serif font-semibold">
                    {organization?.name || 'Selecionar'}
                  </span>
                </div>
                <ChevronsUpDown className="h-4 w-4 flex-shrink-0 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setSelectedOrgId(org.id)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{org.name}</span>
                  {org.id === selectedOrgId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent">
              <Church className="h-5 w-5 text-sidebar-foreground" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in min-w-0">
                <h1 className="font-serif text-lg font-semibold text-sidebar-foreground truncate">
                  {organization?.name || 'Cantivo'}
                </h1>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems
          .filter(item => isLeader || !item.leaderOnly)
          .map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === '/services' && location.pathname.startsWith('/services'));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="animate-fade-in">{item.title}</span>
                )}
              </NavLink>
            );
          })}

        {/* Separator - Voluntário */}
        {!collapsed && (
          <div className="py-2">
            <Separator className="bg-sidebar-border" />
            <p className="text-xs text-sidebar-foreground/50 px-3 py-2 uppercase tracking-wider">
              Voluntário
            </p>
          </div>
        )}
        {collapsed && <Separator className="my-2 bg-sidebar-border" />}

        {volunteerItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <span className="animate-fade-in">{item.title}</span>
              )}
            </NavLink>
          );
        })}

        {/* Admin Section */}
        {isLeader && (
          <>
            {!collapsed && (
              <div className="py-2">
                <Separator className="bg-sidebar-border" />
                <p className="text-xs text-sidebar-foreground/50 px-3 py-2 uppercase tracking-wider">
                  Administração
                </p>
              </div>
            )}
            {collapsed && <Separator className="my-2 bg-sidebar-border" />}

            {adminItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="animate-fade-in">{item.title}</span>
                  )}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* Toggle Button */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
    </aside>
  );
}
