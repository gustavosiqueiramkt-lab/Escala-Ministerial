import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useOrganizationMembers, useOrganization } from '@/hooks/useOrganization';
import { useOrgRole } from '@/hooks/useOrgRole';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import { canAddMember } from '@/lib/planLimits';
import { UpgradePrompt } from '@/components/upgrade/UpgradePrompt';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserPlus, Trash2, Shield, Crown, User, Mail, Clock, X } from 'lucide-react';

const roleLabels = {
  owner: { label: 'Proprietário', icon: Crown, color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  admin: { label: 'Administrador', icon: Shield, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  member: { label: 'Membro', icon: User, color: 'bg-muted text-muted-foreground border-border' },
};

export default function TeamManagement() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { isLeader, isOwner } = useOrgRole();
  const { members, isLoading, updateMemberRole, removeMember, inviteMember, pendingInvites, cancelInvite } = useOrganizationMembers();
  const { planId } = usePlan();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleInviteClick = () => {
    if (!canAddMember(planId, members?.length ?? 0)) {
      setShowUpgrade(true);
      return;
    }
    setIsInviteOpen(true);
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      await inviteMember.mutateAsync({ email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      setInviteRole('member');
      setIsInviteOpen(false);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = (memberId: string, newRole: 'owner' | 'admin' | 'member') => {
    updateMemberRole.mutate({ memberId, role: newRole });
  };

  const handleRemove = (memberId: string) => {
    removeMember.mutate(memberId);
  };

  if (!isLeader) {
    return (
      <AppLayout title="Gestão de Equipe">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Apenas administradores e proprietários podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Gestão de Equipe">
      <div className="space-y-6">
        {/* Header with invite button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-medium text-muted-foreground">
              {organization?.name || 'Organização'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {members.length} membro{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleInviteClick}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Membro</DialogTitle>
                <DialogDescription>
                  Digite o e-mail do usuário que deseja adicionar à organização.
                  Se o usuário ainda não tem conta, um convite pendente será criado.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'member')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Membro</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleInvite} disabled={!inviteEmail || isInviting}>
                  {isInviting ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Members list */}
        <Card>
          <CardHeader>
            <CardTitle>Membros da Equipe</CardTitle>
            <CardDescription>
              Gerencie os membros e suas permissões na organização.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-9 w-32" />
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum membro encontrado.
              </div>
            ) : (
              <div className="space-y-4">
                {members.map((member) => {
                  const roleInfo = roleLabels[member.role];
                  const RoleIcon = roleInfo.icon;
                  const isCurrentUser = member.user_id === user?.id;
                  const canModify = isOwner && !isCurrentUser && member.role !== 'owner';

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <Avatar>
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {member.profile?.name || 'Usuário'}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">
                              Você
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.profile?.email || 'E-mail não disponível'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {canModify ? (
                          <Select
                            value={member.role}
                            onValueChange={(v) => handleRoleChange(member.id, v as 'owner' | 'admin' | 'member')}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Membro</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                              {isOwner && <SelectItem value="owner">Proprietário</SelectItem>}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className={roleInfo.color}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                        )}

                        {canModify && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover Membro</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover {member.profile?.name} da organização?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemove(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Convites Pendentes
              </CardTitle>
              <CardDescription>
                Usuários que foram convidados mas ainda não criaram conta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvites.map((invite) => {
                  const roleInfo = roleLabels[invite.role as keyof typeof roleLabels] || roleLabels.member;
                  
                  return (
                    <div
                      key={invite.id}
                      className="flex items-center gap-4 p-3 rounded-lg border border-dashed bg-muted/30"
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-muted-foreground">
                          {invite.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Convidado em {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={roleInfo.color}>
                          {roleInfo.label}
                        </Badge>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                              <X className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar Convite</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja cancelar o convite para {invite.email}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelInvite.mutate(invite.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Cancelar Convite
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <UpgradePrompt
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          reason="members"
        />
      </div>
    </AppLayout>
  );
}
