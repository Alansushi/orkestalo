create table public.measurement_revocations (
  site_id uuid not null references public.measurement_sites(id) on delete cascade,
  attribution_ref uuid not null,
  revoked_at timestamptz not null default now(),
  primary key (site_id, attribution_ref)
);
alter table public.measurement_revocations enable row level security;
revoke all on public.measurement_revocations from public, anon, authenticated;
grant all on public.measurement_revocations to service_role;

create function public.measurement_reject_revoked() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.attribution_ref is not null and exists (
    select 1 from public.measurement_revocations
    where site_id = new.site_id and attribution_ref = new.attribution_ref
  ) then return null; end if;
  return new;
end;
$$;
revoke execute on function public.measurement_reject_revoked() from public, anon, authenticated;
create trigger measurement_events_reject_revoked before insert on public.measurement_events
  for each row execute function public.measurement_reject_revoked();
create trigger measurement_conversions_reject_revoked before insert on public.measurement_conversions
  for each row execute function public.measurement_reject_revoked();

create view public.measurement_action_daily with (security_invoker = true) as
select site_id, occurred_at::date as day, path, name, coalesce(label, '') as label,
  count(*) as events
from public.measurement_events
group by site_id, occurred_at::date, path, name, coalesce(label, '');
revoke all on public.measurement_action_daily from public, anon, authenticated;
grant select on public.measurement_action_daily to service_role;
