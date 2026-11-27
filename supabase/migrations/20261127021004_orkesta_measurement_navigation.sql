-- Page order is assigned in the browser tab before dispatch, so network arrival order cannot reorder a journey.
alter table public.measurement_events
  add column page_order integer check (page_order is null or (page_order between 1 and 1000000 and name = 'page_view'));
create index measurement_events_navigation_idx on public.measurement_events
  (site_id, session_id, page_order) where name = 'page_view' and page_order is not null;

create view public.measurement_page_30d with (security_invoker = true) as
select site_id, path,
  count(*) as page_views,
  count(distinct session_id) as visits
from public.measurement_events
where name = 'page_view' and occurred_at >= now() - interval '30 days'
group by site_id, path;
revoke all on public.measurement_page_30d from public, anon, authenticated;
grant select on public.measurement_page_30d to service_role;

create view public.measurement_transition_30d with (security_invoker = true) as
with ordered as (
  select site_id, session_id, occurred_at, path as to_path, page_order,
    lag(path) over (partition by site_id, session_id order by page_order, event_id) as from_path,
    lag(page_order) over (partition by site_id, session_id order by page_order, event_id) as from_order
  from public.measurement_events
  where name = 'page_view' and page_order is not null
)
select site_id, from_path, to_path, count(*) as transitions
from ordered
where from_path is not null and page_order = from_order + 1
  and occurred_at >= now() - interval '30 days'
group by site_id, from_path, to_path;
revoke all on public.measurement_transition_30d from public, anon, authenticated;
grant select on public.measurement_transition_30d to service_role;

insert into public.measurement_sites (slug, name, allowed_origins, privacy_notice_url, retention_days, active)
values ('orkesta', 'Orkesta', array['https://www.orkestalo.com'], 'https://www.orkestalo.com/aviso-de-privacidad/', 90, true)
on conflict (slug) do update set name = excluded.name, allowed_origins = excluded.allowed_origins,
  privacy_notice_url = excluded.privacy_notice_url, retention_days = excluded.retention_days, active = true;
