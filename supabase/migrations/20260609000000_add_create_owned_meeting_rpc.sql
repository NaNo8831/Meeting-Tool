-- Allows authenticated users to create a meeting via RPC without needing a
-- direct INSERT grant. The function runs as the definer (bypasses RLS) and
-- hard-codes owner_id = auth.uid() so the client cannot forge ownership.

create or replace function public.create_owned_meeting(meeting_name text)
returns public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  new_meeting public.meetings;
begin
  insert into public.meetings (owner_id, name, metadata_json, meeting_data)
  values (auth.uid(), meeting_name, null, null)
  returning * into new_meeting;

  return new_meeting;
end;
$$;

grant execute on function public.create_owned_meeting(text) to authenticated;
