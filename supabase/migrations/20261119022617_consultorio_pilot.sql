create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  doctor_name text not null check (char_length(doctor_name) between 2 and 120),
  reply_to text not null check (reply_to ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  sender_local_part text not null check (sender_local_part ~ '^[a-z0-9][a-z0-9._-]{1,62}$'),
  cal_event_type_id bigint,
  cal_paid_event_type_id bigint,
  cal_booking_url text,
  cal_webhook_secret text not null,
  survey_enabled boolean not null default false,
  welcome_enabled boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.clinic_memberships (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  primary key (clinic_id, user_id)
);
create index clinic_memberships_user_idx on public.clinic_memberships(user_id) where active;
create table public.clinic_cal_connections (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now()
);
create table public.clinic_oauth_states (
  state_hash text primary key,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  expires_at timestamptz not null
);
create table public.clinic_appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  cal_uid text,
  cal_booking_id bigint,
  cal_event_at timestamptz,
  patient_name text not null check (char_length(patient_name) between 1 and 120),
  patient_email text not null default '',
  patient_phone text not null default '',
  kind text not null default 'Consulta',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('unregistered', 'pending', 'confirmed', 'cancelled', 'attended', 'missed')),
  source text not null check (source in ('cal', 'whatsapp')),
  survey_allowed boolean not null default false,
  survey_allowed_at timestamptz,
  survey_consent_version text,
  survey_due boolean not null default false,
  attended_at timestamptz,
  created_at timestamptz not null default now(),
  unique (clinic_id, cal_uid),
  check (ends_at > starts_at),
  check ((survey_allowed and survey_allowed_at is not null and survey_consent_version is not null) or (not survey_allowed and survey_allowed_at is null and survey_consent_version is null))
);
create index clinic_appointments_upcoming_idx on public.clinic_appointments(clinic_id, starts_at) where status in ('unregistered','pending','confirmed');
create table public.clinic_cal_aliases (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  cal_uid text not null,
  appointment_id uuid not null references public.clinic_appointments(id) on delete cascade,
  primary key (clinic_id, cal_uid)
);
create table public.clinic_tasks (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid references public.clinic_appointments(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index clinic_tasks_open_idx on public.clinic_tasks(clinic_id, created_at) where done_at is null;
create table public.clinic_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid not null references public.clinic_appointments(id) on delete cascade,
  kind text not null check (kind in ('welcome', 'survey')),
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued','sending','sent','delivered','failed','bounced')),
  resend_id text,
  last_error text,
  sent_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(clinic_id, idempotency_key)
);
create index clinic_messages_resend_idx on public.clinic_messages(resend_id) where resend_id is not null;
create table public.clinic_surveys (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid not null unique references public.clinic_appointments(id) on delete cascade,
  token_hash text not null unique,
  rating smallint check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  responded_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.clinic_payment_invites (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_name text not null check (char_length(patient_name) between 1 and 120),
  patient_email text not null,
  requested_start timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed')),
  email_status text not null default 'queued' check (email_status in ('queued','sending','sent','delivered','failed','bounced')),
  claimed_at timestamptz,
  resend_id text,
  cal_uid text unique,
  created_at timestamptz not null default now()
);
create index clinic_payment_invites_pending_idx on public.clinic_payment_invites(clinic_id, patient_email, created_at desc) where status = 'pending';
create table public.clinic_email_events (
  svix_id text primary key,
  resend_id text not null,
  status text not null check (status in ('delivered','failed','bounced')),
  received_at timestamptz not null default now()
);
create index clinic_email_events_resend_idx on public.clinic_email_events(resend_id, received_at desc);
create index clinic_appointments_created_idx on public.clinic_appointments(clinic_id, created_at);

alter table public.clinics enable row level security;
alter table public.clinic_memberships enable row level security;
alter table public.clinic_cal_connections enable row level security;
alter table public.clinic_oauth_states enable row level security;
alter table public.clinic_appointments enable row level security;
alter table public.clinic_cal_aliases enable row level security;
alter table public.clinic_tasks enable row level security;
alter table public.clinic_messages enable row level security;
alter table public.clinic_surveys enable row level security;
alter table public.clinic_payment_invites enable row level security;
alter table public.clinic_email_events enable row level security;
revoke all on public.clinics, public.clinic_memberships, public.clinic_cal_connections, public.clinic_oauth_states,
  public.clinic_appointments, public.clinic_cal_aliases, public.clinic_tasks, public.clinic_messages, public.clinic_surveys, public.clinic_payment_invites, public.clinic_email_events
  from public, anon, authenticated;
grant all on public.clinics, public.clinic_memberships, public.clinic_cal_connections, public.clinic_oauth_states,
  public.clinic_appointments, public.clinic_cal_aliases, public.clinic_tasks, public.clinic_messages, public.clinic_surveys, public.clinic_payment_invites, public.clinic_email_events
  to service_role;
