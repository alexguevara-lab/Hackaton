-- SECURITY DEFINER functions are invoked only from triggers/RLS policies,
-- never directly through the public RPC surface.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.add_project_owner() from public, anon, authenticated;
revoke execute on function public.is_project_member(uuid) from public, anon;
revoke execute on function public.can_edit_project(uuid) from public, anon;

grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.can_edit_project(uuid) to authenticated;

create index if not exists comments_author_id_idx on public.comments(author_id);
