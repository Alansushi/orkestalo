-- Shared measurement is separate from Orkestalo's inquiries and orders.
create table public.measurement_sites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 3 and 120),
  allowed_origins text[] not null default '{}' check (cardinality(allowed_origins) <= 20),
  privacy_notice_url text,
  retention_days integer not null default 365 check (retention_days between 30 and 1095),
  active boolean not null default false,
  check (not active or (cardinality(allowed_origins) > 0 and privacy_notice_url is not null)),
  created_at timestamptz not null default now()
);

create table public.measurement_events (
  site_id uuid not null references public.measurement_sites(id) on delete cascade,
  event_id uuid not null,
  session_id uuid not null,
  name text not null check (name in ('page_view','section_view','contact_click','form_start','form_submit','site_error')),
  path text not null check (char_length(path) between 1 and 240 and left(path, 1) = '/'),
  label text check (char_length(label) <= 80),
  channel text check (channel in ('whatsapp','phone','email','form')),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  referrer_host text check (char_length(referrer_host) <= 160),
  occurred_at timestamptz not null default now(),
  primary key (site_id, event_id)
);
create index measurement_events_site_time_idx on public.measurement_events (site_id, occurred_at desc);
create index measurement_events_site_name_time_idx on public.measurement_events (site_id, name, occurred_at desc);

create table public.measurement_contacts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.measurement_sites(id) on delete cascade,
  submission_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 30),
  channel text not null check (channel in ('form','phone','email','whatsapp')),
  consent_version text not null check (char_length(consent_version) between 1 and 80),
  consented_at timestamptz not null,
  stage text not null default 'new' check (stage in ('new','contacted','scheduled','closed')),
  created_at timestamptz not null default now(),
  unique (site_id, submission_id),
  check (email is not null or phone is not null)
);
create index measurement_contacts_site_time_idx on public.measurement_contacts (site_id, created_at desc);

create table public.measurement_connections (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.measurement_sites(id) on delete cascade,
  provider text not null check (provider in ('google_ads','meta_ads','search_console','pagespeed','crux','uptime')),
  account_ref text not null default '',
  last_synced_at timestamptz,
  last_error text,
  unique (site_id, provider, account_ref)
);
create table public.measurement_daily_metrics (
  site_id uuid not null references public.measurement_sites(id) on delete cascade,
  provider text not null check (provider in ('google_ads','meta_ads','search_console','pagespeed','crux','uptime')),
  day date not null,
  campaign_ref text not null default '',
  metric text not null check (metric in ('impressions','clicks','spend_mxn','conversions','organic_clicks','organic_impressions','lcp_ms','cls_milli','inp_ms','availability_percent')),
  value numeric(16,3) not null check (value >= 0),
  updated_at timestamptz not null default now(),
  primary key (site_id, provider, day, campaign_ref, metric)
);

alter table public.measurement_sites enable row level security;
alter table public.measurement_events enable row level security;
alter table public.measurement_contacts enable row level security;
alter table public.measurement_connections enable row level security;
alter table public.measurement_daily_metrics enable row level security;
revoke all on public.measurement_sites, public.measurement_events, public.measurement_contacts,
  public.measurement_connections, public.measurement_daily_metrics from public, anon, authenticated;
grant all on public.measurement_sites, public.measurement_events, public.measurement_contacts,
  public.measurement_connections, public.measurement_daily_metrics to service_role;

create view public.measurement_event_daily with (security_invoker = true) as
select site_id, occurred_at::date as day,
  count(*) filter (where name = 'page_view') as page_views,
  count(distinct session_id) filter (where name = 'page_view') as visits,
  count(*) filter (where name = 'contact_click') as contact_clicks,
  count(*) filter (where name = 'form_submit') as form_submits
from public.measurement_events
group by site_id, occurred_at::date;
revoke all on public.measurement_event_daily from public, anon, authenticated;
grant select on public.measurement_event_daily to service_role;

create view public.measurement_source_daily with (security_invoker = true) as
select site_id, occurred_at::date as day,
  coalesce(utm_source, referrer_host, 'directo') as source,
  coalesce(utm_medium, '') as medium,
  coalesce(utm_campaign, '') as campaign,
  count(distinct session_id) filter (where name = 'page_view') as visits,
  count(*) filter (where name = 'contact_click') as contact_clicks,
  count(*) filter (where name = 'form_submit') as form_submits
from public.measurement_events
group by site_id, occurred_at::date, coalesce(utm_source, referrer_host, 'directo'),
  coalesce(utm_medium, ''), coalesce(utm_campaign, '');
revoke all on public.measurement_source_daily from public, anon, authenticated;
grant select on public.measurement_source_daily to service_role;

-- Site registration is explicit. Activate only after checking the site's privacy notice.
insert into public.measurement_sites (slug, name, allowed_origins, privacy_notice_url, active) values
  ('dra-ana-mora', 'Dra. Ana Mora', array['https://www.draanamora.com.mx','https://draanamora.com.mx'], 'https://www.draanamora.com.mx/aviso-de-privacidad', false),
  ('dra-fernanda-suaste', 'Dra. Fernanda Suaste', '{}', null, false);
