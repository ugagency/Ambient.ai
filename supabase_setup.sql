-- 1. Habilitar a extensão para UUIDs se não estiver ativa
create extension if not exists "uuid-ossp";

-- 2. Tabela de Gerações
create table if not exists public.generations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  generated_image_url text not null,
  settings jsonb not null, -- { ambiente, estilo, orcamento, preferencias }
  chat_history jsonb default '[]'::jsonb
);

-- 3. Habilitar Row Level Security (RLS)
alter table public.generations enable row level security;

-- 4. Políticas de Acesso para Gerações
-- Permite que o usuário veja apenas suas próprias gerações
create policy "Usuários podem ver suas próprias gerações."
  on public.generations for select
  using ( auth.uid() = user_id );

-- Permite que o usuário insira suas próprias gerações
create policy "Usuários podem criar suas próprias gerações."
  on public.generations for insert
  with check ( auth.uid() = user_id );

-- 5. Storage: Permitir acesso ao bucket 'generations'
-- Nota: Você deve criar o bucket manualmente no painel antes, mas aqui estão as políticas se quiser rodar via SQL:
-- insert into storage.buckets (id, name, public) values ('generations', 'generations', true);

create policy "Imagens de gerações são públicas para leitura"
  on storage.objects for select
  using ( bucket_id = 'generations' );

create policy "Usuários podem fazer upload de suas próprias imagens"
  on storage.objects for insert
  with check ( bucket_id = 'generations' AND (storage.foldername(name))[1] = auth.uid()::text );
