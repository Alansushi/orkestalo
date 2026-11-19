alter table public.clinics
  add column identity_confirmed_at timestamptz,
  add column privacy_accepted_at timestamptz,
  add column privacy_version text,
  add column cal_webhook_ready boolean not null default false,
  add column cal_paid_event_ready boolean not null default false,
  add column cal_paid_webhook_ready boolean not null default false;

-- Existing doctors keep their accounts, drafts, and data, but patient mail requires fresh approval.
update public.clinics set welcome_enabled = false, followup_enabled = false,
  invite_enabled = false, survey_enabled = false;

create table public.clinic_invitations (
  email text primary key check (email = lower(trim(email))),
  clinic_id uuid not null unique references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_at timestamptz not null default now(),
  last_sent_at timestamptz
);

insert into public.clinic_invitations(email, clinic_id, user_id)
select lower(trim(u.email)), m.clinic_id, u.id
from public.clinic_memberships m
join auth.users u on u.id = m.user_id
where u.email is not null
on conflict (email) do nothing;

create table public.clinic_cal_webhooks (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  event_type_id bigint not null,
  webhook_id bigint not null,
  verified_at timestamptz not null default now(),
  primary key (clinic_id, event_type_id)
);

alter table public.clinic_invitations enable row level security;
alter table public.clinic_cal_webhooks enable row level security;
revoke all on public.clinic_invitations, public.clinic_cal_webhooks from public, anon, authenticated;
grant all on public.clinic_invitations, public.clinic_cal_webhooks to service_role;
