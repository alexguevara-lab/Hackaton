-- Persist the new workflow state introduced by the onboarding question engine.
alter table public.diagram_versions
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'in_review', 'approved')),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text;

alter table public.kickoff_items
  alter column id drop default,
  alter column id type text using id::text;

create table public.project_analyses (
  project_id uuid primary key references public.projects(id) on delete cascade,
  scope_summary text,
  summary text,
  detected_tone text,
  detected_goal text,
  map_readiness jsonb,
  spec_readiness jsonb,
  generated_at timestamptz not null default now(),
  model text,
  document_names text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger project_analyses_set_updated_at
  before update on public.project_analyses
  for each row execute procedure public.set_updated_at();

alter table public.project_analyses enable row level security;

create policy "Members can read project analyses"
  on public.project_analyses for select to authenticated
  using (app_private.is_project_member(project_id));
create policy "Editors can create project analyses"
  on public.project_analyses for insert to authenticated
  with check (app_private.can_edit_project(project_id));
create policy "Editors can update project analyses"
  on public.project_analyses for update to authenticated
  using (app_private.can_edit_project(project_id))
  with check (app_private.can_edit_project(project_id));
create policy "Editors can delete project analyses"
  on public.project_analyses for delete to authenticated
  using (app_private.can_edit_project(project_id));

grant select, insert, update, delete on public.project_analyses to authenticated;
