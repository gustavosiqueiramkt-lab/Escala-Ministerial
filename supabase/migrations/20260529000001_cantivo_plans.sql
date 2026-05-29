-- Tabela de planos disponíveis
create table public.plans (
  id text primary key,
  name text not null,
  max_members integer not null,
  max_cultos_per_month integer,
  price_monthly numeric(10, 2) not null default 0,
  price_yearly numeric(10, 2) not null default 0,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  created_at timestamptz not null default now()
);

-- Seed dos planos
insert into public.plans (id, name, max_members, max_cultos_per_month, price_monthly, price_yearly) values
  ('free',        'Gratuito',   8,   4,    0,     0),
  ('essencial',   'Essencial',  20,  null, 47,    470),
  ('ministerio',  'Ministério', 50,  null, 87,    870),
  ('igreja',      'Igreja',     -1,  null, 157,   1570);

-- -1 em max_members significa ilimitado

-- Tabela de assinaturas das organizações
create table public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id text not null references public.plans(id) default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

-- RLS
alter table public.plans enable row level security;
alter table public.organization_subscriptions enable row level security;

-- Planos são públicos (leitura)
create policy "plans_public_read"
  on public.plans for select
  using (true);

-- Assinaturas: apenas membros da org podem ler
create policy "org_subscriptions_member_read"
  on public.organization_subscriptions for select
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

-- Assinaturas: apenas o sistema (service role) pode escrever
create policy "org_subscriptions_service_write"
  on public.organization_subscriptions for all
  using (false)
  with check (false);

-- Trigger: criar assinatura gratuita quando org é criada
create or replace function public.create_free_subscription()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.organization_subscriptions (organization_id, plan_id)
  values (new.id, 'free')
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.create_free_subscription();

-- Aplicar assinatura free para orgs existentes sem assinatura
insert into public.organization_subscriptions (organization_id, plan_id)
select id, 'free'
from public.organizations
where id not in (select organization_id from public.organization_subscriptions)
on conflict do nothing;
