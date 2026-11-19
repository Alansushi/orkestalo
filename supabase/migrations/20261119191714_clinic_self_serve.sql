alter table public.clinics
  add column identity_confirmed_at timestamptz,
  add column content_reviewed_at timestamptz,
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
  clinic_id uuid not null references public.clinics(id) on delete cascade,
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
create table public.clinic_cal_setup_locks (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  claimed_at timestamptz not null default now()
);

alter table public.clinic_invitations enable row level security;
alter table public.clinic_cal_webhooks enable row level security;
alter table public.clinic_cal_setup_locks enable row level security;
revoke all on public.clinic_invitations, public.clinic_cal_webhooks, public.clinic_cal_setup_locks from public, anon, authenticated;
grant all on public.clinic_invitations, public.clinic_cal_webhooks, public.clinic_cal_setup_locks to service_role;

create function public.clinic_provision(
  p_email text, p_user_id uuid, p_name text, p_doctor_name text,
  p_website_url text, p_sender_local_part text, p_cal_webhook_secret text
) returns table (clinic_id uuid, user_id uuid, invited_email text, created boolean)
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  existing public.clinic_invitations%rowtype;
  new_clinic_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_email, 0));
  select * into existing from public.clinic_invitations i where i.email = p_email;
  if found then
    return query select existing.clinic_id, existing.user_id, existing.email, false;
    return;
  end if;
  insert into public.clinics(name, doctor_name, reply_to, sender_local_part, website_url, cal_webhook_secret)
  values (p_name, p_doctor_name, p_email, p_sender_local_part, p_website_url, p_cal_webhook_secret)
  returning id into new_clinic_id;
  insert into public.clinic_memberships(clinic_id, user_id, active)
  values (new_clinic_id, p_user_id, true);
  insert into public.clinic_invitations(email, clinic_id, user_id)
  values (p_email, new_clinic_id, p_user_id);
  return query select new_clinic_id, p_user_id, p_email, true;
end $$;
revoke all on function public.clinic_provision(text,uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.clinic_provision(text,uuid,text,text,text,text,text) to service_role;
