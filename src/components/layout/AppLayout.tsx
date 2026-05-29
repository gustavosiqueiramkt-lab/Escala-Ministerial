import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SkillsOnboardingModal } from '@/components/onboarding/SkillsOnboardingModal';
import { useMyMemberSkills } from '@/hooks/useMemberSkills';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const { user } = useAuth();
  const { organization, needsSetup } = useOrganization();
  const { needsOnboarding, isLoading, refetch } = useMyMemberSkills();

  // Show onboarding modal when user needs to complete their skills
  useEffect(() => {
    // Only show onboarding if:
    // 1. User is authenticated
    // 2. Organization is set up (not in setup flow)
    // 3. Member skills need completion
    // 4. Not currently loading
    if (user && organization && !needsSetup && needsOnboarding && !isLoading) {
      setShowOnboarding(true);
    }
  }, [user, organization, needsSetup, needsOnboarding, isLoading]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    refetch();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-background to-indigo-50/30 dark:from-slate-950 dark:via-background dark:to-indigo-950/20">
      {/* Skills Onboarding Modal */}
      <SkillsOnboardingModal 
        open={showOnboarding} 
        onComplete={handleOnboardingComplete} 
      />

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar collapsed={false} onToggle={() => {}} />
            </SheetContent>
          </Sheet>
          <h1 className="font-serif text-lg font-semibold">{title}</h1>
        </div>
      </div>

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 pt-16 lg:pt-0',
          collapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        <div className="p-4 lg:p-8">
          {/* Desktop Title */}
          {title && (
            <div className="hidden lg:block mb-6">
              <h1 className="font-serif text-3xl font-semibold text-foreground">
                {title}
              </h1>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
