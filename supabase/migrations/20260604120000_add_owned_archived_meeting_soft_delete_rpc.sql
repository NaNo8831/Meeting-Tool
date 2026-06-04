-- PR 2A follow-up — owner-only archived meeting soft-delete helper.
-- The membership-aware meetings update policy intentionally hides rows after
-- deleted_at is set. This narrow RPC lets owners perform the dashboard
-- archived soft-delete without broadening editor update permissions or changing
-- shared access behavior.

create or replace function public.soft_delete_owned_archived_meeting(
  target_meeting_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.meetings
  set deleted_at = now()
  where id = target_meeting_id
    and owner_id = auth.uid()
    and archived_at is not null
    and deleted_at is null;

  if not found then
    raise exception 'Only archived owned meetings can be soft-deleted, or this meeting is no longer accessible.';
  end if;
end;
$$;

revoke all on function public.soft_delete_owned_archived_meeting(uuid) from public;
grant execute on function public.soft_delete_owned_archived_meeting(uuid) to authenticated;

comment on function public.soft_delete_owned_archived_meeting(uuid) is
  'Owner-only dashboard helper for soft-deleting archived meetings without broadening shared editor meetings update permissions.';
