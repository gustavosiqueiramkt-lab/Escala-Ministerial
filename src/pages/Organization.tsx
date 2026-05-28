import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { InitialSetup } from "@/components/setup/InitialSetup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { Church, RefreshCw, Plus, Clock } from "lucide-react";

export default function Organization() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const {
    organizations,
    memberships,
    isLoading,
    needsSetup,
    needsSelection,
    activeOrgId,
    setSelectedOrgId,
    checkPendingInvites,
  } = useOrganization();

  const [mode, setMode] = useState<"select" | "create" | "waiting">("select");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading && activeOrgId && !needsSelection && !needsSetup) {
      navigate(from || "/", { replace: true });
    }
  }, [activeOrgId, from, isLoading, needsSelection, needsSetup, navigate]);

  // Check for pending invites on mount
  useEffect(() => {
    if (!isLoading) {
      checkPendingInvites.mutate();
    }
  }, [isLoading]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await checkPendingInvites.mutateAsync();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  // Mode: Create new organization
  if (mode === "create") {
    return <InitialSetup onComplete={() => navigate(from || "/", { replace: true })} />;
  }

  // Mode: Waiting for invite
  if (mode === "waiting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Aguardando Convite</CardTitle>
            <CardDescription>
              Quando o administrador da sua igreja adicionar seu e-mail, 
              você será automaticamente vinculado à organização.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Verificando...' : 'Verificar Convites'}
            </Button>
            
            <p className="text-sm text-muted-foreground text-center">
              Clique no botão acima para verificar se você já foi convidado.
            </p>

            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setMode("create")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar minha própria igreja
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground" 
              onClick={() => setMode("select")}
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has no organizations - show options
  if (needsSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Church className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Bem-vindo ao CultCraft!</CardTitle>
            <CardDescription>
              Para começar, escolha uma das opções abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => setMode("create")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar nova organização
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setMode("waiting")}
            >
              <Clock className="h-4 w-4 mr-2" />
              Aguardar convite
            </Button>
            
            <p className="text-xs text-muted-foreground text-center pt-2">
              Se você foi convidado por um líder, escolha "Aguardar convite". 
              Se você é o líder, crie sua organização.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Multi-org + nothing selected
  if (needsSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Church className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Selecione a igreja</CardTitle>
            <CardDescription>
              Você participa de mais de uma organização. Selecione a igreja ativa para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {organizations.map((org) => (
              <Button
                key={org.id}
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setSelectedOrgId(org.id)}
              >
                {org.name}
              </Button>
            ))}

            <div className="pt-2">
              <Button type="button" className="w-full" onClick={() => setMode("create")}>
                Criar nova organização
              </Button>
              <p className="mt-2 text-xs text-muted-foreground text-center">
                Sua seleção será usada em todo o app.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback (should be redirected by effect)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Carregando organização...</CardTitle>
          <CardDescription>Estamos preparando seu contexto.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => navigate(from || "/", { replace: true })}>
            Continuar
          </Button>
          {memberships.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Nenhuma organização encontrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}