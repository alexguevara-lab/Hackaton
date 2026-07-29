-- Keep RLS helper functions out of the API-exposed public schema.
create schema if not exists app_private;

create function app_private.is_project_member(target_project_id uuid)
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

create function app_private.can_edit_project(target_project_id uuid)
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

grant usage on schema app_private to authenticated;
grant execute on function app_private.is_project_member(uuid) to authenticated;
grant execute on function app_private.can_edit_project(uuid) to authenticated;

alter policy "Members can read projects" on public.projects
  using (app_private.is_project_member(id));
alter policy "Members can read memberships" on public.project_members
  using (app_private.is_project_member(project_id));

alter policy "Members can read diagram versions" on public.diagram_versions
  using (app_private.is_project_member(project_id));
alter policy "Editors can create diagram versions" on public.diagram_versions
  with check (app_private.can_edit_project(project_id));
alter policy "Editors can update diagram versions" on public.diagram_versions
  using (app_private.can_edit_project(project_id))
  with check (app_private.can_edit_project(project_id));
alter policy "Editors can delete diagram versions" on public.diagram_versions
  using (app_private.can_edit_project(project_id));

alter policy "Members can read documents" on public.documents
  using (app_private.is_project_member(project_id));
alter policy "Editors can create documents" on public.documents
  with check (app_private.can_edit_project(project_id));
alter policy "Editors can update documents" on public.documents
  using (app_private.can_edit_project(project_id))
  with check (app_private.can_edit_project(project_id));
alter policy "Editors can delete documents" on public.documents
  using (app_private.can_edit_project(project_id));

alter policy "Members can read kickoff items" on public.kickoff_items
  using (app_private.is_project_member(project_id));
alter policy "Editors can create kickoff items" on public.kickoff_items
  with check (app_private.can_edit_project(project_id));
alter policy "Editors can update kickoff items" on public.kickoff_items
  using (app_private.can_edit_project(project_id))
  with check (app_private.can_edit_project(project_id));
alter policy "Editors can delete kickoff items" on public.kickoff_items
  using (app_private.can_edit_project(project_id));

alter policy "Members can read comments" on public.comments
  using (exists (
    select 1 from public.diagram_versions
    where id = diagram_id and app_private.is_project_member(project_id)
  ));
alter policy "Editors can create comments" on public.comments
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.diagram_versions
      where id = diagram_id and app_private.can_edit_project(project_id)
    )
  );

alter policy "Members can read artifacts" on public.artifacts
  using (app_private.is_project_member(project_id));
alter policy "Editors can create artifacts" on public.artifacts
  with check (app_private.can_edit_project(project_id));
alter policy "Editors can update artifacts" on public.artifacts
  using (app_private.can_edit_project(project_id))
  with check (app_private.can_edit_project(project_id));
alter policy "Editors can delete artifacts" on public.artifacts
  using (app_private.can_edit_project(project_id));

alter policy "Members can read project files" on storage.objects
  using (
    bucket_id = 'project-documents'
    and app_private.is_project_member((storage.foldername(name))[1]::uuid)
  );
alter policy "Editors can upload project files" on storage.objects
  with check (
    bucket_id = 'project-documents'
    and owner_id = (select auth.uid()::text)
    and app_private.can_edit_project((storage.foldername(name))[1]::uuid)
  );
alter policy "Editors can update project files" on storage.objects
  using (
    bucket_id = 'project-documents'
    and app_private.can_edit_project((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'project-documents'
    and app_private.can_edit_project((storage.foldername(name))[1]::uuid)
  );
alter policy "Editors can delete project files" on storage.objects
  using (
    bucket_id = 'project-documents'
    and app_private.can_edit_project((storage.foldername(name))[1]::uuid)
  );

drop function public.is_project_member(uuid);
drop function public.can_edit_project(uuid);
