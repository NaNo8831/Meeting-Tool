-- PR 1A — Shared Access Schema Alignment
-- Align meeting membership roles and add owner-scoped pending invitation storage.
-- This migration intentionally preserves meetings.owner_id as the runtime owner
-- authority and does not expand existing meeting-scoped RLS to members.

alter table public.meeting_members
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists invited_by uuid null references auth.users(id) on delete set null,
  add column if not exists removed_at timestamptz null;

-- The original generated constraint allowed ('owner', 'admin', 'member'). Drop it
-- before rewriting data to the durable shared-access role vocabulary.
alter table public.meeting_members
  drop constraint if exists meeting_members_role_check;

update public.meeting_members
set role = case role
  when 'owner' then 'owner'
  when 'admin' then 'editor'
  when 'member' then 'editor'
  else role
end,
updated_at = now()
where role in ('owner', 'admin', 'member');

alter table public.meeting_members
  add constraint meeting_members_role_check
  check (role in ('owner', 'editor', 'viewer'));

-- Preserve owner compatibility by ensuring each meeting owner also has an
-- identity-linked membership row. meetings.owner_id remains authoritative until
-- a later PR explicitly expands runtime access policies.
insert into public.meeting_members (meeting_id, user_id, role)
select m.id, m.owner_id, 'owner'
from public.meetings m
where m.owner_id is not null
on conflict (meeting_id, user_id) do update
set role = 'owner',
    updated_at = now(),
    removed_at = null
where public.meeting_members.role is distinct from 'owner'
   or public.meeting_members.removed_at is not null;

drop trigger if exists set_meeting_members_updated_at on public.meeting_members;
create trigger set_meeting_members_updated_at
  before update on public.meeting_members
  for each row
  execute function public.set_entity_updated_at();

create table if not exists public.meeting_invitations (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  email text not null check (char_length(trim(email)) > 0),
  normalized_email text not null check (normalized_email = lower(trim(email)) and char_length(normalized_email) > 0),
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid null references auth.users(id) on delete set null,
  accepted_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz null,
  revoked_at timestamptz null
);

create index if not exists meeting_invitations_meeting_id_idx
  on public.meeting_invitations (meeting_id);

create index if not exists meeting_invitations_normalized_email_idx
  on public.meeting_invitations (normalized_email);

create index if not exists meeting_invitations_status_idx
  on public.meeting_invitations (status);

create unique index if not exists meeting_invitations_pending_unique_idx
  on public.meeting_invitations (meeting_id, normalized_email)
  where status = 'pending';

create or replace function public.normalize_meeting_invitation_email()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.email = trim(new.email);
  new.normalized_email = lower(new.email);
  return new;
end;
$$;

drop trigger if exists normalize_meeting_invitation_email on public.meeting_invitations;
create trigger normalize_meeting_invitation_email
  before insert or update of email, normalized_email
  on public.meeting_invitations
  for each row
  execute function public.normalize_meeting_invitation_email();

drop trigger if exists set_meeting_invitations_updated_at on public.meeting_invitations;
create trigger set_meeting_invitations_updated_at
  before update on public.meeting_invitations
  for each row
  execute function public.set_entity_updated_at();

alter table public.meeting_invitations enable row level security;

-- Owner-only invitation access for PR 1A. This mirrors the current owner-only
-- runtime boundary and intentionally does not grant access through membership.
drop policy if exists "Meeting owners full access" on public.meeting_invitations;
create policy "Meeting owners full access"
  on public.meeting_invitations
  for all
  to authenticated
  using (public.user_owns_meeting(meeting_id))
  with check (public.user_owns_meeting(meeting_id));
