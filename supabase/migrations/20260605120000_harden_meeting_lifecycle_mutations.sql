-- PR 3D Implementation — Shared Access Lifecycle Mutation Hardening.
-- Keep editor Manual Save on meetings.meeting_data while making meeting
-- container/lifecycle columns owner-only at the database/API boundary.

create or replace function public.prevent_non_owner_meeting_container_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Defense in depth for broad REST/table update paths. Editors may update the
  -- full-workspace backup payload while structured autosave is incomplete, but
  -- only the authoritative owner may change dashboard/lifecycle container fields.
  if auth.uid() is distinct from old.owner_id
     and (
       new.id is distinct from old.id
       or new.created_at is distinct from old.created_at
       or new.owner_id is distinct from old.owner_id
       or new.name is distinct from old.name
       or new.metadata_json is distinct from old.metadata_json
       or new.archived_at is distinct from old.archived_at
       or new.deleted_at is distinct from old.deleted_at
     ) then
    raise exception 'Only the meeting owner can update meeting lifecycle or container fields.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_non_owner_meeting_container_update on public.meetings;
create trigger prevent_non_owner_meeting_container_update
  before update on public.meetings
  for each row
  execute function public.prevent_non_owner_meeting_container_update();

-- Column privileges narrow direct REST updates to the Manual Save/full-backup
-- field. Owner-only lifecycle changes go through narrow RPCs below.
revoke insert, update on public.meetings from public;
revoke insert, update on public.meetings from anon;
revoke insert, update on public.meetings from authenticated;
grant update (meeting_data) on public.meetings to authenticated;

create or replace function public.duplicate_owned_meeting(
  source_meeting_id uuid,
  duplicate_name text default null
)
returns public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  source_meeting public.meetings;
  duplicated_meeting public.meetings;
  trimmed_name text := trim(coalesce(duplicate_name, ''));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into source_meeting
  from public.meetings
  where id = source_meeting_id
    and owner_id = auth.uid()
    and deleted_at is null;

  if source_meeting.id is null then
    raise exception 'Only owned meetings can be duplicated, or this meeting is no longer accessible.';
  end if;

  if trimmed_name = '' then
    trimmed_name := case
      when trim(source_meeting.name) like '%Copy' then trim(source_meeting.name) || ' 2'
      else trim(source_meeting.name) || ' Copy'
    end;
  end if;

  insert into public.meetings (
    owner_id,
    name,
    metadata_json,
    meeting_data
  ) values (
    auth.uid(),
    trimmed_name,
    source_meeting.metadata_json,
    source_meeting.meeting_data
  )
  returning * into duplicated_meeting;

  return duplicated_meeting;
end;
$$;

create or replace function public.archive_owned_meeting(
  target_meeting_id uuid
)
returns public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  archived_meeting public.meetings;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.meetings
  set archived_at = now()
  where id = target_meeting_id
    and owner_id = auth.uid()
    and archived_at is null
    and deleted_at is null
  returning * into archived_meeting;

  if archived_meeting.id is null then
    raise exception 'Only active owned meetings can be archived, or this meeting is no longer accessible.';
  end if;

  return archived_meeting;
end;
$$;

create or replace function public.restore_owned_archived_meeting(
  target_meeting_id uuid
)
returns public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  restored_meeting public.meetings;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.meetings
  set archived_at = null
  where id = target_meeting_id
    and owner_id = auth.uid()
    and archived_at is not null
    and deleted_at is null
  returning * into restored_meeting;

  if restored_meeting.id is null then
    raise exception 'Only archived owned meetings can be restored, or this meeting is no longer accessible.';
  end if;

  return restored_meeting;
end;
$$;

create or replace function public.rename_owned_meeting(
  target_meeting_id uuid,
  meeting_name text
)
returns public.meetings
language plpgsql
security definer
set search_path = public
as $$
declare
  renamed_meeting public.meetings;
  trimmed_name text := trim(coalesce(meeting_name, ''));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if trimmed_name = '' then
    raise exception 'Name the meeting before saving it.';
  end if;

  update public.meetings
  set name = trimmed_name
  where id = target_meeting_id
    and owner_id = auth.uid()
    and deleted_at is null
  returning * into renamed_meeting;

  if renamed_meeting.id is null then
    raise exception 'Only owned meetings can be renamed, or this meeting is no longer accessible.';
  end if;

  return renamed_meeting;
end;
$$;

revoke all on function public.prevent_non_owner_meeting_container_update() from public;
revoke all on function public.duplicate_owned_meeting(uuid, text) from public;
revoke all on function public.archive_owned_meeting(uuid) from public;
revoke all on function public.restore_owned_archived_meeting(uuid) from public;
revoke all on function public.rename_owned_meeting(uuid, text) from public;

grant execute on function public.duplicate_owned_meeting(uuid, text) to authenticated;
grant execute on function public.archive_owned_meeting(uuid) to authenticated;
grant execute on function public.restore_owned_archived_meeting(uuid) to authenticated;
grant execute on function public.rename_owned_meeting(uuid, text) to authenticated;

comment on function public.prevent_non_owner_meeting_container_update() is
  'Defense-in-depth trigger: active editors can update meetings.meeting_data for Manual Save, but only owners can mutate meeting container/lifecycle columns.';
comment on function public.duplicate_owned_meeting(uuid, text) is
  'Owner-only container helper for duplicating meetings without allowing editors to duplicate shared meetings through broad inserts.';
comment on function public.archive_owned_meeting(uuid) is
  'Owner-only lifecycle helper for archiving an active meeting without exposing archived_at to editor REST updates.';
comment on function public.restore_owned_archived_meeting(uuid) is
  'Owner-only lifecycle helper for restoring an archived meeting without exposing archived_at to editor REST updates.';
comment on function public.rename_owned_meeting(uuid, text) is
  'Owner-only container helper for changing meetings.name without exposing meeting title updates to editors.';
comment on column public.meetings.meeting_data is
  'Full Meeting Tool meeting backup JSON. Owners and active editors may update this field through Manual Save while structured autosave remains incomplete.';
comment on column public.meetings.archived_at is
  'Owner-only dashboard lifecycle timestamp. Mutate through owner-only lifecycle RPCs, not broad editor update paths.';
comment on column public.meetings.deleted_at is
  'Owner-only dashboard lifecycle timestamp for soft deletion of archived meetings.';
comment on column public.meetings.name is
  'Owner-only meeting container title used by dashboard lifecycle controls.';
