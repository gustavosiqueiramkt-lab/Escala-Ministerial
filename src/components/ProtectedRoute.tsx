import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Use for the /organization screen (selection/creation) */
  allowOrgMissing?: boolean;
}

export function ProtectedRoute({ children, allowOrgMissing = false }: ProtectedRouteProps) {
  const location = useLocation();
  const { user, loading } = useAuth();
  const { isLoading: orgLoading, needsSetup, needsSelection, activeOrgId } = useOrganization();

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!allowOrgMissing && (needsSetup || needsSelection || !activeOrgId)) {
    return <Navigate to="/organization" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
