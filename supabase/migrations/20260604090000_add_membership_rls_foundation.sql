-- PR 1B — Membership RLS Foundation
-- Expand runtime authorization from owner-only checks to accepted active
-- meeting_members rows while keeping access management owner-only.

create or replace function public.user_owns_meeting(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meetings m
    where m.id = target_meeting_id
      and m.owner_id = auth.uid()
  );
$$;

create or replace function public.user_is_active_meeting_member(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meeting_members mm
    where mm.meeting_id = target_meeting_id
      and mm.user_id = auth.uid()
      and mm.removed_at is null
      and mm.role in ('owner', 'editor', 'viewer')
  );
$$;

create or replace function public.user_can_access_meeting(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_owns_meeting(target_meeting_id)
    or public.user_is_active_meeting_member(target_meeting_id);
$$;

create or replace function public.user_can_edit_meeting(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_owns_meeting(target_meeting_id)
    or exists (
      select 1
      from public.meeting_members mm
      where mm.meeting_id = target_meeting_id
        and mm.user_id = auth.uid()
        and mm.removed_at is null
        and mm.role in ('owner', 'editor')
    );
$$;

create or replace function public.user_can_manage_meeting_access(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_owns_meeting(target_meeting_id);
$$;

create or replace function public.ensure_meeting_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.meeting_members (meeting_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (meeting_id, user_id) do update
  set role = 'owner',
      updated_at = now(),
      removed_at = null
  where public.meeting_members.role is distinct from 'owner'
     or public.meeting_members.removed_at is not null;

  return new;
end;
$$;

drop trigger if exists ensure_meeting_owner_member on public.meetings;
create trigger ensure_meeting_owner_member
  after insert on public.meetings
  for each row
  execute function public.ensure_meeting_owner_member();

create or replace function public.prevent_meeting_owner_id_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'meeting ownership transfer is not implemented';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_meeting_owner_id_update on public.meetings;
create trigger prevent_meeting_owner_id_update
  before update of owner_id on public.meetings
  for each row
  execute function public.prevent_meeting_owner_id_update();

-- meetings policies protect the full-workspace meeting_data save/load path.
-- Inserts remain owner-created. Reads allow active members. Updates allow active
-- owner/editor members so Manual Save can work for Team Beta editors; client UI
-- for container management remains deferred.
drop policy if exists "Workspace owners can insert" on public.meetings;
drop policy if exists "Workspace owners can select" on public.meetings;
drop policy if exists "Workspace owners can update" on public.meetings;
drop policy if exists "Meeting owners can insert" on public.meetings;
drop policy if exists "Meeting members can select active meetings" on public.meetings;
drop policy if exists "Meeting editors can update active meetings" on public.meetings;

create policy "Meeting owners can insert"
  on public.meetings
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Meeting members can select active meetings"
  on public.meetings
  for select
  to authenticated
  using (deleted_at is null and public.user_can_access_meeting(id));

create policy "Meeting editors can update active meetings"
  on public.meetings
  for update
  to authenticated
  using (deleted_at is null and public.user_can_edit_meeting(id))
  with check (public.user_can_edit_meeting(id));

-- Access-management rows remain owner/manage-only. Active editor/viewer
-- memberships do not authorize inviting, removing, or role changes.
drop policy if exists "Meeting owners full access" on public.meeting_members;
drop policy if exists "Meeting access managers full access" on public.meeting_members;
create policy "Meeting access managers full access"
  on public.meeting_members
  for all
  to authenticated
  using (public.user_can_manage_meeting_access(meeting_id))
  with check (public.user_can_manage_meeting_access(meeting_id));

drop policy if exists "Meeting owners full access" on public.meeting_invitations;
drop policy if exists "Meeting access managers full access" on public.meeting_invitations;
create policy "Meeting access managers full access"
  on public.meeting_invitations
  for all
  to authenticated
  using (public.user_can_manage_meeting_access(meeting_id))
  with check (public.user_can_manage_meeting_access(meeting_id));

-- Meeting content tables: viewers can read; owners/editors can insert, update,
-- and delete meeting-scoped content. Pending invitations and removed members are
-- excluded by the helper functions above.
drop policy if exists "Meeting owners full access" on public.meeting_settings;
drop policy if exists "Meeting members can select" on public.meeting_settings;
drop policy if exists "Meeting editors can insert" on public.meeting_settings;
drop policy if exists "Meeting editors can update" on public.meeting_settings;
drop policy if exists "Meeting editors can delete" on public.meeting_settings;
create policy "Meeting members can select" on public.meeting_settings for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.meeting_settings for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.meeting_settings for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.meeting_settings for delete to authenticated using (public.user_can_edit_meeting(meeting_id));

drop policy if exists "Meeting owners full access" on public.objectives;
drop policy if exists "Meeting members can select" on public.objectives;
drop policy if exists "Meeting editors can insert" on public.objectives;
drop policy if exists "Meeting editors can update" on public.objectives;
drop policy if exists "Meeting editors can delete" on public.objectives;
create policy "Meeting members can select" on public.objectives for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.objectives for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.objectives for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.objectives for delete to authenticated using (public.user_can_edit_meeting(meeting_id));

drop policy if exists "Meeting owners full access" on public.tasks;
drop policy if exists "Meeting members can select" on public.tasks;
drop policy if exists "Meeting editors can insert" on public.tasks;
drop policy if exists "Meeting editors can update" on public.tasks;
drop policy if exists "Meeting editors can delete" on public.tasks;
create policy "Meeting members can select" on public.tasks for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.tasks for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.tasks for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.tasks for delete to authenticated using (public.user_can_edit_meeting(meeting_id));

drop policy if exists "Meeting owners full access" on public.standard_operating_objectives;
drop policy if exists "Meeting members can select" on public.standard_operating_objectives;
drop policy if exists "Meeting editors can insert" on public.standard_operating_objectives;
drop policy if exists "Meeting editors can update" on public.standard_operating_objectives;
drop policy if exists "Meeting editors can delete" on public.standard_operating_objectives;
create policy "Meeting members can select" on public.standard_operating_objectives for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.standard_operating_objectives for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.standard_operating_objectives for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.standard_operating_objectives for delete to authenticated using (public.user_can_edit_meeting(meeting_id));

drop policy if exists "Meeting owners full access" on public.strategic_topics;
drop policy if exists "Meeting members can select" on public.strategic_topics;
drop policy if exists "Meeting editors can insert" on public.strategic_topics;
drop policy if exists "Meeting editors can update" on public.strategic_topics;
drop policy if exists "Meeting editors can delete" on public.strategic_topics;
create policy "Meeting members can select" on public.strategic_topics for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.strategic_topics for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.strategic_topics for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.strategic_topics for delete to authenticated using (public.user_can_edit_meeting(meeting_id));

drop policy if exists "Meeting owners full access" on public.tactical_sessions;
drop policy if exists "Meeting members can select" on public.tactical_sessions;
drop policy if exists "Meeting editors can insert" on public.tactical_sessions;
drop policy if exists "Meeting editors can update" on public.tactical_sessions;
drop policy if exists "Meeting editors can delete" on public.tactical_sessions;
create policy "Meeting members can select" on public.tactical_sessions for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.tactical_sessions for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.tactical_sessions for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.tactical_sessions for delete to authenticated using (public.user_can_edit_meeting(meeting_id));

drop policy if exists "Meeting owners full access" on public.tactical_items;
drop policy if exists "Meeting members can select" on public.tactical_items;
drop policy if exists "Meeting editors can insert" on public.tactical_items;
drop policy if exists "Meeting editors can update" on public.tactical_items;
drop policy if exists "Meeting editors can delete" on public.tactical_items;
create policy "Meeting members can select" on public.tactical_items for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.tactical_items for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.tactical_items for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.tactical_items for delete to authenticated using (public.user_can_edit_meeting(meeting_id));

drop policy if exists "Meeting owners full access" on public.strategic_sessions;
drop policy if exists "Meeting members can select" on public.strategic_sessions;
drop policy if exists "Meeting editors can insert" on public.strategic_sessions;
drop policy if exists "Meeting editors can update" on public.strategic_sessions;
drop policy if exists "Meeting editors can delete" on public.strategic_sessions;
create policy "Meeting members can select" on public.strategic_sessions for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.strategic_sessions for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.strategic_sessions for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.strategic_sessions for delete to authenticated using (public.user_can_edit_meeting(meeting_id));

drop policy if exists "Meeting owners full access" on public.strategic_session_notes;
drop policy if exists "Meeting members can select" on public.strategic_session_notes;
drop policy if exists "Meeting editors can insert" on public.strategic_session_notes;
drop policy if exists "Meeting editors can update" on public.strategic_session_notes;
drop policy if exists "Meeting editors can delete" on public.strategic_session_notes;
create policy "Meeting members can select" on public.strategic_session_notes for select to authenticated using (public.user_can_access_meeting(meeting_id));
create policy "Meeting editors can insert" on public.strategic_session_notes for insert to authenticated with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can update" on public.strategic_session_notes for update to authenticated using (public.user_can_edit_meeting(meeting_id)) with check (public.user_can_edit_meeting(meeting_id));
create policy "Meeting editors can delete" on public.strategic_session_notes for delete to authenticated using (public.user_can_edit_meeting(meeting_id));
