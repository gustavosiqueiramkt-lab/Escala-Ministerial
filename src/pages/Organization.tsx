import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { InitialSetup } from "@/components/setup/InitialSetup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { RefreshCw, Plus, Clock, CalendarCheck, Users, Music } from "lucide-react";
import { CantivoMark } from "@/components/brand/CantivoMark";

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
  const [expandedFeature, setExpandedFeature] = useState<"escalas" | "disponibilidade" | "repertorio" | null>(null);

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
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CantivoMark size={32} color="currentColor" />
              </div>
            </div>
            <CardTitle className="text-2xl">Bem-vindo ao Cantivo!</CardTitle>
            <CardDescription>
              Aguardando a confirmação da sua entrada. Enquanto isso, conheça algumas funcionalidades!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              className="w-full"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Verificando...' : 'Verificar Convites'}
            </Button>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Veja o que você poderá fazer</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setExpandedFeature(expandedFeature === "escalas" ? null : "escalas")}
                  className="group cursor-pointer transition-all"
                >
                  <Card className={`border-0 flex flex-col items-center justify-center p-4 text-center transition-all ${
                    expandedFeature === "escalas" ? "bg-primary text-primary-foreground" : "bg-primary/5 group-hover:bg-primary/10"
                  }`}>
                    <CalendarCheck className="h-6 w-6 mb-2" />
                    <p className="font-semibold text-sm">Escalas Inteligentes</p>
                    <p className="text-xs mt-1 opacity-75">Clique para saber mais</p>
                  </Card>
                </button>

                <button
                  onClick={() => setExpandedFeature(expandedFeature === "disponibilidade" ? null : "disponibilidade")}
                  className="group cursor-pointer transition-all"
                >
                  <Card className={`border-0 flex flex-col items-center justify-center p-4 text-center transition-all ${
                    expandedFeature === "disponibilidade" ? "bg-primary text-primary-foreground" : "bg-primary/5 group-hover:bg-primary/10"
                  }`}>
                    <Users className="h-6 w-6 mb-2" />
                    <p className="font-semibold text-sm">Disponibilidade</p>
                    <p className="text-xs mt-1 opacity-75">Clique para saber mais</p>
                  </Card>
                </button>

                <button
                  onClick={() => setExpandedFeature(expandedFeature === "repertorio" ? null : "repertorio")}
                  className="group cursor-pointer transition-all"
                >
                  <Card className={`border-0 flex flex-col items-center justify-center p-4 text-center transition-all ${
                    expandedFeature === "repertorio" ? "bg-primary text-primary-foreground" : "bg-primary/5 group-hover:bg-primary/10"
                  }`}>
                    <Music className="h-6 w-6 mb-2" />
                    <p className="font-semibold text-sm">Repertório</p>
                    <p className="text-xs mt-1 opacity-75">Clique para saber mais</p>
                  </Card>
                </button>
              </div>

              {expandedFeature && (
                <Card className="border-0 bg-muted p-4 mt-4">
                  {expandedFeature === "escalas" && (
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">📅 Escalas Inteligentes</p>
                      <p className="text-sm text-muted-foreground">
                        Monte as escalas da sua equipe de forma rápida e compartilhe automaticamente com todos. Atualize em tempo real e todos recebem notificação das mudanças. Sem confusão, sem erros.
                      </p>
                    </div>
                  )}
                  {expandedFeature === "disponibilidade" && (
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">👥 Disponibilidade da Equipe</p>
                      <p className="text-sm text-muted-foreground">
                        Cada membro informa quando está disponível para servir, sem necessidade de mensagens no grupo. Você vê tudo em um só lugar e consegue montar a escala com base nas disponibilidades reais.
                      </p>
                    </div>
                  )}
                  {expandedFeature === "repertorio" && (
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">🎵 Repertório de Músicas</p>
                      <p className="text-sm text-muted-foreground">
                        Organize e gerencie todas as músicas da sua equipe em um só lugar. Crie setlists, compartilhe com toda a equipe e mantenha todos alinhados sobre o que será tocado.
                      </p>
                    </div>
                  )}
                </Card>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMode("create")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar minha própria igreja
              </Button>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setMode("select")}
              >
                Voltar
              </Button>
            </div>
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
                <CantivoMark size={32} color="currentColor" />
              </div>
            </div>
            <CardTitle className="text-2xl">Bem-vindo ao Cantivo!</CardTitle>
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