-- =============================================================================
-- AutoGiro: banco relacional (Supabase / PostgreSQL)
-- Cobre: catálogo de veículos, clientes, simulações (com cronograma) e propostas.
-- As operações já contratadas continuam no financial-operations-service (fonte da
-- verdade de parcelas e pagamentos); aqui a proposta guarda só o vínculo
-- (propostas.numero_operacao = "OP-2026-0001").
-- Rode no SQL Editor do Supabase, uma única vez, em um projeto vazio.
-- =============================================================================

-- ---------- Tipos ----------
create type public.categoria_veiculo as enum ('hatch', 'sedan', 'suv', 'picape', 'moto');
create type public.combustivel       as enum ('flex', 'gasolina', 'diesel', 'eletrico');
create type public.cambio            as enum ('manual', 'automatico');
create type public.status_veiculo    as enum ('disponivel', 'reservado', 'vendido', 'oculto');
create type public.sistema_amortizacao as enum ('PRICE', 'SAC');
create type public.status_proposta   as enum ('RASCUNHO', 'ENVIADA', 'EM_ANALISE', 'APROVADA', 'REPROVADA', 'CONTRATADA', 'CANCELADA');

-- ---------- Funções utilitárias ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Veículos ----------
create table public.veiculos (
  id            uuid primary key default gen_random_uuid(),
  marca         text not null,
  modelo        text not null,
  versao        text,
  ano           smallint not null check (ano between 1980 and 2100),
  quilometragem integer  not null default 0 check (quilometragem >= 0),
  preco         numeric(12,2) not null check (preco > 0),
  categoria     public.categoria_veiculo not null,
  combustivel   public.combustivel not null default 'flex',
  cambio        public.cambio not null default 'manual',
  cidade        text not null,
  status        public.status_veiculo not null default 'disponivel',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index veiculos_status_categoria_idx on public.veiculos (status, categoria);
create index veiculos_preco_idx on public.veiculos (preco);
create trigger veiculos_updated_at before update on public.veiculos
  for each row execute function public.set_updated_at();

-- ---------- Clientes ----------
create table public.clientes (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  nome         text not null,
  email        text not null,
  telefone     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index clientes_email_key on public.clientes (lower(email));
create trigger clientes_updated_at before update on public.clientes
  for each row execute function public.set_updated_at();

-- ---------- Simulações (dados gerados pelo simulador) ----------
create table public.simulacoes (
  id               uuid primary key default gen_random_uuid(),
  veiculo_id       uuid not null references public.veiculos (id) on delete restrict,
  cliente_id       uuid references public.clientes (id) on delete set null,
  valor_veiculo    numeric(12,2) not null check (valor_veiculo > 0),
  entrada          numeric(12,2) not null check (entrada >= 0),
  prazo_meses      smallint not null check (prazo_meses between 1 and 120),
  taxa_mensal      numeric(7,4) not null check (taxa_mensal >= 0 and taxa_mensal <= 100), -- percentual: 1.8000 = 1,8% a.m.
  sistema          public.sistema_amortizacao not null,
  valor_financiado numeric(12,2) not null check (valor_financiado > 0),
  primeira_parcela numeric(12,2) not null,
  ultima_parcela   numeric(12,2) not null,
  total_pago       numeric(12,2) not null,  -- soma das parcelas, sem a entrada
  total_juros      numeric(12,2) not null,
  created_at       timestamptz not null default now(),
  constraint simulacoes_entrada_menor_que_valor check (entrada < valor_veiculo),
  constraint simulacoes_financiado_confere check (valor_financiado = valor_veiculo - entrada)
);
create index simulacoes_veiculo_idx on public.simulacoes (veiculo_id);
create index simulacoes_cliente_idx on public.simulacoes (cliente_id);

create table public.simulacao_parcelas (
  simulacao_id uuid not null references public.simulacoes (id) on delete cascade,
  numero       smallint not null check (numero >= 1),
  valor        numeric(12,2) not null,
  juros        numeric(12,2) not null,
  amortizacao  numeric(12,2) not null,
  saldo_devedor numeric(12,2) not null,
  primary key (simulacao_id, numero)
);

-- ---------- Propostas ----------
create table public.propostas (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes (id) on delete restrict,
  veiculo_id      uuid not null references public.veiculos (id) on delete restrict,
  simulacao_id    uuid references public.simulacoes (id) on delete set null,
  status          public.status_proposta not null default 'RASCUNHO',
  numero_operacao text unique,  -- vínculo com o financial-operations-service
  observacao      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index propostas_cliente_idx on public.propostas (cliente_id);
create index propostas_veiculo_idx on public.propostas (veiculo_id);
create index propostas_simulacao_idx on public.propostas (simulacao_id);
create trigger propostas_updated_at before update on public.propostas
  for each row execute function public.set_updated_at();

create table public.proposta_eventos (
  id          bigint generated always as identity primary key,
  proposta_id uuid not null references public.propostas (id) on delete cascade,
  status      public.status_proposta not null,
  observacao  text,
  created_at  timestamptz not null default now()
);
create index proposta_eventos_proposta_idx on public.proposta_eventos (proposta_id, created_at);

-- Histórico automático: toda criação e toda mudança de status vira um evento.
create or replace function public.registrar_evento_proposta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.proposta_eventos (proposta_id, status, observacao)
  values (new.id, new.status, new.observacao);
  return new;
end $$;
create trigger propostas_evento_insert after insert on public.propostas
  for each row execute function public.registrar_evento_proposta();
create trigger propostas_evento_status after update of status on public.propostas
  for each row when (old.status is distinct from new.status)
  execute function public.registrar_evento_proposta();

-- A função do histórico só deve rodar como gatilho; ninguém a chama pela API.
revoke execute on function public.registrar_evento_proposta() from public, anon, authenticated;

-- ---------- Segurança (RLS) ----------
alter table public.veiculos           enable row level security;
alter table public.clientes           enable row level security;
alter table public.simulacoes         enable row level security;
alter table public.simulacao_parcelas enable row level security;
alter table public.propostas          enable row level security;
alter table public.proposta_eventos   enable row level security;

-- Privilégios mínimos (o RLS decide as linhas; os grants decidem as operações).
revoke all on public.veiculos, public.clientes, public.simulacoes, public.simulacao_parcelas,
              public.propostas, public.proposta_eventos from anon, authenticated;
grant select on public.veiculos to anon, authenticated;
grant select, insert, update on public.clientes to authenticated;
grant select, insert on public.simulacoes, public.simulacao_parcelas to authenticated;
grant select on public.proposta_eventos to authenticated;
-- A proposta não deixa o cliente definir numero_operacao nem aprovar a si mesmo.
grant select on public.propostas to authenticated;
grant insert (cliente_id, veiculo_id, simulacao_id, status, observacao) on public.propostas to authenticated;
grant update (status, observacao) on public.propostas to authenticated;

-- Veículos: catálogo público (somente os visíveis).
create policy veiculos_leitura_publica on public.veiculos
  for select to anon, authenticated using (status in ('disponivel', 'reservado'));

-- Clientes: cada usuário vê e altera apenas o próprio cadastro.
create policy clientes_proprio_select on public.clientes
  for select to authenticated using ((select auth.uid()) = auth_user_id);
create policy clientes_proprio_insert on public.clientes
  for insert to authenticated with check ((select auth.uid()) = auth_user_id);
create policy clientes_proprio_update on public.clientes
  for update to authenticated using ((select auth.uid()) = auth_user_id)
  with check ((select auth.uid()) = auth_user_id);

-- Simulações e cronograma: do próprio cliente.
create policy simulacoes_proprias_select on public.simulacoes
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = (select auth.uid())));
create policy simulacoes_proprias_insert on public.simulacoes
  for insert to authenticated
  with check (cliente_id in (select id from public.clientes where auth_user_id = (select auth.uid())));
create policy simulacao_parcelas_select on public.simulacao_parcelas
  for select to authenticated
  using (simulacao_id in (select s.id from public.simulacoes s join public.clientes c on c.id = s.cliente_id
                          where c.auth_user_id = (select auth.uid())));
create policy simulacao_parcelas_insert on public.simulacao_parcelas
  for insert to authenticated
  with check (simulacao_id in (select s.id from public.simulacoes s join public.clientes c on c.id = s.cliente_id
                               where c.auth_user_id = (select auth.uid())));

-- Propostas: o cliente cria, envia ou cancela o próprio rascunho. Análise e aprovação
-- são feitas pelo back-end (chave de serviço), nunca pelo navegador.
create policy propostas_proprias_select on public.propostas
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = (select auth.uid())));
create policy propostas_proprias_insert on public.propostas
  for insert to authenticated
  with check (status = 'RASCUNHO'
              and cliente_id in (select id from public.clientes where auth_user_id = (select auth.uid())));
create policy propostas_proprias_update on public.propostas
  for update to authenticated
  using (status = 'RASCUNHO'
         and cliente_id in (select id from public.clientes where auth_user_id = (select auth.uid())))
  with check (status in ('RASCUNHO', 'ENVIADA', 'CANCELADA')
              and cliente_id in (select id from public.clientes where auth_user_id = (select auth.uid())));
create policy proposta_eventos_select on public.proposta_eventos
  for select to authenticated
  using (proposta_id in (select p.id from public.propostas p join public.clientes c on c.id = p.cliente_id
                         where c.auth_user_id = (select auth.uid())));

-- ---------- Dados iniciais (os mesmos 10 veículos do mock do front) ----------
insert into public.veiculos (marca, modelo, versao, ano, quilometragem, preco, categoria, combustivel, cambio, cidade, status) values
  ('Fiat',       'Argo',     '1.0 Drive',          2021, 42000,  58900.00, 'hatch',  'flex',     'manual',     'São Paulo',      'disponivel'),
  ('Chevrolet',  'Onix',     '1.0 Turbo LT',       2022, 28000,  72500.00, 'hatch',  'flex',     'automatico', 'Campinas',       'disponivel'),
  ('Toyota',     'Corolla',  '2.0 XEi',            2020, 61000, 109900.00, 'sedan',  'flex',     'automatico', 'São Paulo',      'disponivel'),
  ('Volkswagen', 'Virtus',   '1.6 MSI',            2021, 39000,  81400.00, 'sedan',  'flex',     'manual',     'Santos',         'reservado'),
  ('Jeep',       'Renegade', '1.3 T270 Longitude', 2022, 24000, 119800.00, 'suv',    'flex',     'automatico', 'São Paulo',      'disponivel'),
  ('Hyundai',    'Creta',    '1.0 Turbo Comfort',  2023, 15000, 127500.00, 'suv',    'flex',     'automatico', 'Osasco',         'disponivel'),
  ('Toyota',     'Hilux',    '2.8 SRX Diesel',     2019, 88000, 224000.00, 'picape', 'diesel',   'automatico', 'Ribeirão Preto', 'disponivel'),
  ('Fiat',       'Strada',   '1.3 Freedom CD',     2022, 31000,  96900.00, 'picape', 'flex',     'manual',     'Campinas',       'disponivel'),
  ('Honda',      'CG 160',   'Titan',              2023,  9000,  15900.00, 'moto',   'flex',     'manual',     'São Paulo',      'disponivel'),
  ('Yamaha',     'Fazer 250','ABS',                2022, 12000,  21800.00, 'moto',   'gasolina', 'manual',     'Guarulhos',      'disponivel');
