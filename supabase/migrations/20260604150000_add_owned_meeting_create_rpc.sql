-- PR 3B follow-up — restore owned meeting creation through a narrow RPC.
-- The dashboard should not rely on client-supplied owner_id for an
-- access-authority row. This helper creates only meetings owned by auth.uid()
-- and lets the existing owner-membership trigger preserve membership setup.

create or replace function public.create_owned_meeting(
  meeting_name text
)
returns public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  created_meeting public.meetings;
  trimmed_name text := trim(coalesce(meeting_name, ''));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if trimmed_name = '' then
    raise exception 'Name the meeting before creating it.';
  end if;

  insert into public.meetings (
    owner_id,
    name,
    metadata_json,
    meeting_data
  ) values (
    auth.uid(),
    trimmed_name,
    null,
    null
  )
  returning * into created_meeting;

  return created_meeting;
end;
$$;

revoke all on function public.create_owned_meeting(text) from public;
grant execute on function public.create_owned_meeting(text) to authenticated;

comment on function public.create_owned_meeting(text) is
  'Authenticated-user helper for creating a meeting owned by auth.uid(); does not allow creating or managing meetings on behalf of another user.';
