-- AtomScope: esquema inicial, autenticación y controles de acceso.
-- Todas las tablas públicas usan RLS y sólo se exponen a usuarios autenticados.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'Onboarding Manager'
    check (role in ('Onboarding Manager', 'Bot Architect', 'Customer Success Lead')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  client_name text not null check (char_length(trim(client_name)) > 0),
  industry text not null default 'otro'
    check (industry in ('ecommerce', 'salud', 'financiero', 'inmobiliario', 'otro')),
  brand_logo_url text,
  brand_color text not null default '#0284c7'
    check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  description text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'kickoff', 'validated', 'delivered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor'
    check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.diagram_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version integer not null check (version > 0),
  label text not null,
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, version)
);

create unique index diagram_versions_one_current_per_project
  on public.diagram_versions (project_id)
  where is_current;

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text not null,
  storage_path text,
  extracted_text text not null default '',
  required_key text check (required_key in ('sow', 'baseline')),
  extract_note text,
  created_at timestamptz not null default now()
);

create table public.kickoff_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null check (category in (
    'Generales', 'Rutas e Intenciones', 'Captura de Datos',
    'Cierres', 'Integraciones', 'Asignación Humana'
  )),
  question text not null,
  answer text,
  status text not null default 'pending'
    check (status in ('pending', 'answered', 'n_a')),
  source text not null default 'manual' check (source in ('ai', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  diagram_id uuid not null references public.diagram_versions(id) on delete cascade,
  node_id text,
  author_id uuid not null references public.profiles(id) on delete restrict,
  author_name text not null,
  body text not null check (char_length(trim(body)) > 0),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  diagram_version integer not null check (diagram_version > 0),
  kind text not null check (kind in ('ficha_tecnica', 'auditoria', 'resumen_acuerdos')),
  content_md text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, diagram_version, kind)
);

create index projects_owner_id_idx on public.projects(owner_id);
create index project_members_user_id_idx on public.project_members(user_id);
create index diagram_versions_project_id_idx on public.diagram_versions(project_id);
create index documents_project_id_idx on public.documents(project_id);
create index kickoff_items_project_id_idx on public.kickoff_items(project_id);
create index comments_diagram_id_idx on public.comments(diagram_id);
create index artifacts_project_id_idx on public.artifacts(project_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'Onboarding Manager')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.add_project_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_project_created
  after insert on public.projects
  for each row execute procedure public.add_project_owner();

create function public.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = target_project_id
      and user_id = (select auth.uid())
  );
$$;

create function public.can_edit_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = target_project_id
      and user_id = (select auth.uid())
      and role in ('owner', 'editor')
  );
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();
create trigger diagram_versions_set_updated_at
  before update on public.diagram_versions
  for each row execute procedure public.set_updated_at();
create trigger kickoff_items_set_updated_at
  before update on public.kickoff_items
  for each row execute procedure public.set_updated_at();
create trigger comments_set_updated_at
  before update on public.comments
  for each row execute procedure public.set_updated_at();
create trigger artifacts_set_updated_at
  before update on public.artifacts
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.diagram_versions enable row level security;
alter table public.documents enable row level security;
alter table public.kickoff_items enable row level security;
alter table public.comments enable row level security;
alter table public.artifacts enable row level security;

create policy "Authenticated users can read profiles"
  on public.profiles for select to authenticated using (true);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Members can read projects"
  on public.projects for select to authenticated
  using (public.is_project_member(id));
create policy "Users create projects they own"
  on public.projects for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Owners can update projects"
  on public.projects for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Owners can delete projects"
  on public.projects for delete to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Members can read memberships"
  on public.project_members for select to authenticated
  using (public.is_project_member(project_id));
create policy "Owners can invite collaborators"
  on public.project_members for insert to authenticated
  with check (exists (
    select 1 from public.projects
    where id = project_id and owner_id = (select auth.uid())
  ));
create policy "Owners can change collaborator roles"
  on public.project_members for update to authenticated
  using (exists (
    select 1 from public.projects
    where id = project_id and owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.projects
    where id = project_id and owner_id = (select auth.uid())
  ));
create policy "Owners or members can remove memberships"
  on public.project_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.projects
      where id = project_id and owner_id = (select auth.uid())
    )
  );

create policy "Members can read diagram versions"
  on public.diagram_versions for select to authenticated
  using (public.is_project_member(project_id));
create policy "Editors can create diagram versions"
  on public.diagram_versions for insert to authenticated
  with check (public.can_edit_project(project_id));
create policy "Editors can update diagram versions"
  on public.diagram_versions for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
create policy "Editors can delete diagram versions"
  on public.diagram_versions for delete to authenticated
  using (public.can_edit_project(project_id));

create policy "Members can read documents"
  on public.documents for select to authenticated
  using (public.is_project_member(project_id));
create policy "Editors can create documents"
  on public.documents for insert to authenticated
  with check (public.can_edit_project(project_id));
create policy "Editors can update documents"
  on public.documents for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
create policy "Editors can delete documents"
  on public.documents for delete to authenticated
  using (public.can_edit_project(project_id));

create policy "Members can read kickoff items"
  on public.kickoff_items for select to authenticated
  using (public.is_project_member(project_id));
create policy "Editors can create kickoff items"
  on public.kickoff_items for insert to authenticated
  with check (public.can_edit_project(project_id));
create policy "Editors can update kickoff items"
  on public.kickoff_items for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
create policy "Editors can delete kickoff items"
  on public.kickoff_items for delete to authenticated
  using (public.can_edit_project(project_id));

create policy "Members can read comments"
  on public.comments for select to authenticated
  using (exists (
    select 1 from public.diagram_versions
    where id = diagram_id and public.is_project_member(project_id)
  ));
create policy "Editors can create comments"
  on public.comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.diagram_versions
      where id = diagram_id and public.can_edit_project(project_id)
    )
  );
create policy "Authors can update their comments"
  on public.comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));
create policy "Authors or project owners can delete comments"
  on public.comments for delete to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.diagram_versions dv
      join public.projects p on p.id = dv.project_id
      where dv.id = diagram_id and p.owner_id = (select auth.uid())
    )
  );

create policy "Members can read artifacts"
  on public.artifacts for select to authenticated
  using (public.is_project_member(project_id));
create policy "Editors can create artifacts"
  on public.artifacts for insert to authenticated
  with check (public.can_edit_project(project_id));
create policy "Editors can update artifacts"
  on public.artifacts for update to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
create policy "Editors can delete artifacts"
  on public.artifacts for delete to authenticated
  using (public.can_edit_project(project_id));

-- Las nuevas tablas no se exponen automáticamente en Data API: permisos explícitos.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.add_project_owner() from public;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-documents',
  'project-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy "Members can read project files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-documents'
    and public.is_project_member((storage.foldername(name))[1]::uuid)
  );
create policy "Editors can upload project files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-documents'
    and owner_id = (select auth.uid())
    and public.can_edit_project((storage.foldername(name))[1]::uuid)
  );
create policy "Editors can update project files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-documents'
    and public.can_edit_project((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'project-documents'
    and public.can_edit_project((storage.foldername(name))[1]::uuid)
  );
create policy "Editors can delete project files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-documents'
    and public.can_edit_project((storage.foldername(name))[1]::uuid)
  );
