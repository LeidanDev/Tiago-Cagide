-- =====================================================================
-- Tiago Cagide: banco de dados, armazenamento de fotos e segurança
-- Pode rodar de novo sem problema (o script se ajusta ao que já existe).
-- =====================================================================

-- 1) TABELAS
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('evolucoes','atletas')),
  path text not null unique,
  caption text,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  email text primary key
);

alter table public.photos enable row level security;
alter table public.admins enable row level security;

-- 2) FUNÇÃO QUE VERIFICA SE QUEM ESTÁ LOGADO É ADMIN
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 3) LISTA DE ADMINS (TROQUE PELOS E-MAILS REAIS)
insert into public.admins (email) values
  ('tiago@exemplo.com'),
  ('segundo.admin@exemplo.com')
on conflict do nothing;

-- 4) PASTA DE IMAGENS (leitura pública, limite de 5 MB por arquivo)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galeria', 'galeria', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- 5) REGRAS DE SEGURANÇA
drop policy if exists "photos_leitura_publica"  on public.photos;
drop policy if exists "photos_admin_inserir"    on public.photos;
drop policy if exists "photos_admin_excluir"    on public.photos;
drop policy if exists "galeria_leitura_publica" on storage.objects;
drop policy if exists "galeria_admin_enviar"    on storage.objects;
drop policy if exists "galeria_admin_excluir"   on storage.objects;

-- Qualquer visitante pode VER as fotos
create policy "photos_leitura_publica" on public.photos
  for select using (true);

create policy "galeria_leitura_publica" on storage.objects
  for select using (bucket_id = 'galeria');

-- Somente admins logados podem ADICIONAR ou EXCLUIR
create policy "photos_admin_inserir" on public.photos
  for insert to authenticated with check (public.is_admin());

create policy "photos_admin_excluir" on public.photos
  for delete to authenticated using (public.is_admin());

create policy "galeria_admin_enviar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'galeria' and public.is_admin());

create policy "galeria_admin_excluir" on storage.objects
  for delete to authenticated
  using (bucket_id = 'galeria' and public.is_admin());