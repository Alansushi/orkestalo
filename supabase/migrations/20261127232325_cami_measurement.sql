-- CAMI remains inactive until its privacy notice has approved legal details.
insert into public.measurement_sites (slug, name, allowed_origins, retention_days, active)
values ('engranes-cami', 'Engranes CAMI', array['https://www.engranescami.com'], 90, false)
on conflict (slug) do update set name = excluded.name, allowed_origins = excluded.allowed_origins,
  retention_days = excluded.retention_days, active = false;

create table public.measurement_viewers (
  site_id uuid not null references public.measurement_sites(id) on delete cascade,
  email text primary key check (email = lower(email) and char_length(email) between 3 and 254),
  invited_at timestamptz not null default now(),
  unique (site_id, email)
);
alter table public.measurement_viewers enable row level security;
revoke all on public.measurement_viewers from public, anon, authenticated;
grant select, insert, delete on public.measurement_viewers to service_role;

alter table public.measurement_events drop constraint measurement_events_name_check;
alter table public.measurement_events add constraint measurement_events_name_check check
  (name in ('page_view','section_view','contact_click','agenda_click','form_start','form_submit','site_error',
            'product_interest','faq_open','form_error','quote_draft'));
alter table public.measurement_events drop constraint measurement_events_channel_check;
alter table public.measurement_events add constraint measurement_events_channel_check check
  (channel in ('whatsapp','phone','email','form','map'));

create or replace view public.measurement_event_daily with (security_invoker = true) as
select site_id, (occurred_at at time zone 'America/Mexico_City')::date as day,
  count(*) filter (where name = 'page_view') as page_views,
  count(distinct session_id) filter (where name = 'page_view') as visits,
  count(*) filter (where name = 'contact_click') as contact_clicks,
  count(*) filter (where name = 'form_submit') as form_submits,
  count(*) filter (where name = 'quote_draft') as quote_drafts,
  count(*) filter (where name = 'form_error') as form_errors
from public.measurement_events
group by site_id, (occurred_at at time zone 'America/Mexico_City')::date;

create or replace view public.measurement_source_daily with (security_invoker = true) as
select site_id, (occurred_at at time zone 'America/Mexico_City')::date as day,
  coalesce(utm_source, referrer_host, 'directo') as source,
  coalesce(utm_medium, '') as medium,
  coalesce(utm_campaign, '') as campaign,
  count(distinct session_id) filter (where name = 'page_view') as visits,
  count(*) filter (where name = 'contact_click') as contact_clicks,
  count(*) filter (where name = 'form_submit') as form_submits
from public.measurement_events
group by site_id, (occurred_at at time zone 'America/Mexico_City')::date,
  coalesce(utm_source, referrer_host, 'directo'), coalesce(utm_medium, ''), coalesce(utm_campaign, '');

create or replace view public.measurement_action_daily with (security_invoker = true) as
select site_id, (occurred_at at time zone 'America/Mexico_City')::date as day,
  path, name, coalesce(label, '') as label, count(*) as events
from public.measurement_events
group by site_id, (occurred_at at time zone 'America/Mexico_City')::date, path, name, coalesce(label, '');

create or replace view public.measurement_funnel with (security_invoker = true) as
with first_visit as (
  select distinct on (site_id, attribution_ref) site_id, attribution_ref, session_id,
    occurred_at, utm_source, utm_medium, utm_campaign, referrer_host
  from public.measurement_events
  where name = 'page_view' and attribution_ref is not null
  order by site_id, attribution_ref, occurred_at
)
select v.site_id, (v.occurred_at at time zone 'America/Mexico_City')::date as day,
  coalesce(v.utm_source, v.referrer_host, 'directo') as source,
  coalesce(v.utm_medium, '') as medium, coalesce(v.utm_campaign, '') as campaign,
  count(distinct v.session_id) as visits,
  count(distinct c.key) filter (where c.event = 'booking_created') as bookings,
  count(distinct c.key) filter (where c.event = 'payment_approved') as approved_payments,
  count(distinct c.key) filter (where c.event = 'appointment_confirmed') as confirmed_appointments
from first_visit v
left join public.measurement_conversions c on c.site_id = v.site_id and c.attribution_ref = v.attribution_ref
group by v.site_id, (v.occurred_at at time zone 'America/Mexico_City')::date,
  coalesce(v.utm_source, v.referrer_host, 'directo'), coalesce(v.utm_medium, ''), coalesce(v.utm_campaign, '');

create view public.measurement_channel_daily with (security_invoker = true) as
select site_id, (occurred_at at time zone 'America/Mexico_City')::date as day,
  channel, count(*) as clicks
from public.measurement_events
where name = 'contact_click' and channel is not null
group by site_id, (occurred_at at time zone 'America/Mexico_City')::date, channel;
revoke all on public.measurement_channel_daily from public, anon, authenticated;
grant select on public.measurement_channel_daily to service_role;
