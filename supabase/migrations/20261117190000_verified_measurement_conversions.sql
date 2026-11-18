alter table public.measurement_events add column attribution_ref uuid;
alter table public.measurement_events drop constraint measurement_events_name_check;
alter table public.measurement_events add constraint measurement_events_name_check check (name in ('page_view','section_view','contact_click','agenda_click','form_start','form_submit','site_error'));
create index measurement_events_attribution_idx on public.measurement_events (site_id, attribution_ref, name) where attribution_ref is not null;

create table public.measurement_conversions (
  site_id uuid not null references public.measurement_sites(id) on delete cascade,
  attribution_ref uuid not null,
  event text not null check (event in ('booking_created','payment_approved','appointment_confirmed')),
  key text not null check (key ~ '^[a-f0-9]{64}$'),
  nonce text not null unique check (nonce ~ '^[a-f0-9]{32}$'),
  occurred_at timestamptz not null default now(),
  primary key (site_id, event, key)
);
create index measurement_conversions_site_time_idx on public.measurement_conversions (site_id, occurred_at desc);
alter table public.measurement_conversions enable row level security;
revoke all on public.measurement_conversions from public, anon, authenticated;
grant all on public.measurement_conversions to service_role;

create view public.measurement_funnel with (security_invoker = true) as
with first_visit as (
  select distinct on (site_id, attribution_ref) site_id, attribution_ref, session_id,
    occurred_at, utm_source, utm_medium, utm_campaign, referrer_host
  from public.measurement_events
  where name = 'page_view' and attribution_ref is not null
  order by site_id, attribution_ref, occurred_at
)
select v.site_id, v.occurred_at::date as day, coalesce(v.utm_source, v.referrer_host, 'directo') as source,
  coalesce(v.utm_medium, '') as medium, coalesce(v.utm_campaign, '') as campaign,
  count(distinct v.session_id) as visits,
  count(distinct c.key) filter (where c.event = 'booking_created') as bookings,
  count(distinct c.key) filter (where c.event = 'payment_approved') as approved_payments,
  count(distinct c.key) filter (where c.event = 'appointment_confirmed') as confirmed_appointments
from first_visit v
left join public.measurement_conversions c on c.site_id = v.site_id and c.attribution_ref = v.attribution_ref
group by v.site_id, v.occurred_at::date, coalesce(v.utm_source, v.referrer_host, 'directo'), coalesce(v.utm_medium, ''), coalesce(v.utm_campaign, '');
revoke all on public.measurement_funnel from public, anon, authenticated;
grant select on public.measurement_funnel to service_role;
