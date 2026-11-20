alter table public.clinic_memberships add column role text not null default 'doctor'
  check (role in ('doctor','admin'));

create table public.clinic_brand_resources (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (category in ('logo','tipografia','color','plantilla','fotografia','otro')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id),
  unique (clinic_id,id)
);
create index clinic_brand_resources_clinic_idx on public.clinic_brand_resources(clinic_id,created_at desc);

create table public.clinic_brand_versions (
  id uuid primary key,
  clinic_id uuid not null,
  resource_id uuid not null,
  version integer not null check (version > 0),
  name text not null check (char_length(name) between 1 and 120),
  category text not null check (category in ('logo','tipografia','color','plantilla','fotografia','otro')),
  filename text check (char_length(filename) between 1 and 120),
  mime text,
  storage_path text unique,
  reference_only boolean not null default false,
  uses jsonb not null default '[]'::jsonb,
  license text not null,
  restrictions text not null default '',
  status text not null default 'draft' check (status in ('draft','approved')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  foreign key (clinic_id,resource_id) references public.clinic_brand_resources(clinic_id,id) on delete cascade,
  unique (clinic_id,resource_id,version),
  check ((reference_only and filename is null and mime is null and storage_path is null)
    or (not reference_only and filename is not null and mime is not null and storage_path is not null)),
  check ((status = 'approved' and approved_at is not null and approved_by is not null)
    or (status = 'draft' and approved_at is null and approved_by is null))
);
create index clinic_brand_versions_clinic_idx on public.clinic_brand_versions(clinic_id,created_at desc);

create table public.clinic_presence_profiles (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  links jsonb not null default '[]'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  evidence text not null default '',
  next_action text not null default '',
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid not null references auth.users(id),
  reviewed_by_doctor_at timestamptz,
  reviewed_by_doctor uuid references auth.users(id)
);

create table public.clinic_service_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  kind text not null check (kind in ('sitio','marca','ayuda técnica','cotización')),
  title text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  requester_id uuid not null references auth.users(id),
  requester_email text not null,
  owner text,
  status text not null default 'recibida' check (status in ('recibida','en revisión','en proceso','completada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id,id)
);
create index clinic_service_requests_clinic_idx on public.clinic_service_requests(clinic_id,created_at desc);
create table public.clinic_request_history (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  request_id uuid not null,
  actor_id uuid not null references auth.users(id),
  actor_label text not null check (char_length(actor_label) between 1 and 254),
  status text not null check (status in ('recibida','en revisión','en proceso','completada')),
  notification_status text not null default 'queued' check (notification_status in ('queued','sending','sent','failed')),
  notification_claimed_at timestamptz,
  notification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (clinic_id,request_id) references public.clinic_service_requests(clinic_id,id) on delete cascade
);
create index clinic_request_history_clinic_idx on public.clinic_request_history(clinic_id,created_at desc);
create index clinic_request_history_retry_idx on public.clinic_request_history(created_at)
  where notification_status in ('queued','failed','sending');

create table public.clinic_presence_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  type text not null check (type in ('version_uploaded','version_approved','resource_archived','presence_updated','presence_reviewed','request_created','request_status')),
  resource_id uuid not null,
  actor_id uuid not null references auth.users(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index clinic_presence_events_clinic_idx on public.clinic_presence_events(clinic_id,created_at desc);

create table public.clinic_measurement_links (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  site_id uuid not null unique references public.measurement_sites(id),
  verified_at timestamptz not null,
  verified_by uuid not null references auth.users(id)
);

create table public.clinic_pilot_scorecards (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  start_at timestamptz,
  setup_minutes integer not null default 0 check (setup_minutes between 0 and 100000),
  support_minutes integer not null default 0 check (support_minutes between 0 and 100000),
  discontinued_tasks text not null default '',
  usage_notes text not null default '',
  proposal_scope text not null default '',
  proposed_price_mxn numeric(10,2) check (proposed_price_mxn >= 0),
  would_buy boolean,
  response_notes text not null default '',
  prior_commercial_relationship boolean,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('clinic-brand','clinic-brand',false,2097152,array['application/pdf','image/svg+xml','image/png','image/jpeg','image/webp','application/zip'])
on conflict (id) do update set public=false,file_size_limit=2097152,allowed_mime_types=excluded.allowed_mime_types;

alter table public.clinic_brand_resources enable row level security;
alter table public.clinic_brand_versions enable row level security;
alter table public.clinic_presence_profiles enable row level security;
alter table public.clinic_service_requests enable row level security;
alter table public.clinic_request_history enable row level security;
alter table public.clinic_presence_events enable row level security;
alter table public.clinic_measurement_links enable row level security;
alter table public.clinic_pilot_scorecards enable row level security;
revoke all on public.clinic_brand_resources,public.clinic_brand_versions,public.clinic_presence_profiles,
  public.clinic_service_requests,public.clinic_request_history,public.clinic_presence_events,public.clinic_measurement_links,public.clinic_pilot_scorecards
  from public,anon,authenticated;
grant all on public.clinic_brand_resources,public.clinic_brand_versions,public.clinic_presence_profiles,
  public.clinic_service_requests,public.clinic_request_history,public.clinic_presence_events,public.clinic_measurement_links,public.clinic_pilot_scorecards
  to service_role;
