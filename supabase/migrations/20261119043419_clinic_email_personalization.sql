alter table public.clinics add column website_url text,
  add column sender_name text,
  add column location text,
  add column brand_color text not null default '#163f51' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column followup_enabled boolean not null default false,
  add column invite_enabled boolean not null default false;

create table public.clinic_patients (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  first_appointment_id uuid not null references public.clinic_appointments(id),
  created_at timestamptz not null default now(),
  primary key (clinic_id, email)
);

create table public.clinic_email_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  kind text not null check (kind in ('welcome','followup','invite','survey')),
  version integer not null check (version > 0),
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 5000),
  revision integer not null default 1 check (revision > 0),
  tested_revision integer,
  tested_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (clinic_id, kind, version)
);
create unique index clinic_email_one_draft on public.clinic_email_templates(clinic_id, kind) where approved_at is null;

create table public.clinic_site_analyses (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  proposal jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.clinic_messages drop constraint clinic_messages_kind_check;
alter table public.clinic_messages add constraint clinic_messages_kind_check check (kind in ('welcome','followup','survey'));
alter table public.clinic_messages add column email_snapshot jsonb;
alter table public.clinic_payment_invites add column email_snapshot jsonb;

alter table public.clinic_patients enable row level security;
alter table public.clinic_email_templates enable row level security;
alter table public.clinic_site_analyses enable row level security;
revoke all on public.clinic_patients, public.clinic_email_templates, public.clinic_site_analyses from public, anon, authenticated;
grant all on public.clinic_patients, public.clinic_email_templates, public.clinic_site_analyses to service_role;
