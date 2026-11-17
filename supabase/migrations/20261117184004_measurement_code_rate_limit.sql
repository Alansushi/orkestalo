create table public.measurement_code_requests (
  owner_email text primary key,
  requested_at timestamptz not null
);
alter table public.measurement_code_requests enable row level security;
revoke all on public.measurement_code_requests from public, anon, authenticated;
grant select, insert, update on public.measurement_code_requests to service_role;

create function public.measurement_claim_code_request(p_owner_email text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare claimed boolean;
begin
  insert into public.measurement_code_requests (owner_email, requested_at)
  values (p_owner_email, now())
  on conflict on constraint measurement_code_requests_pkey do update set requested_at = excluded.requested_at
  where public.measurement_code_requests.requested_at <= now() - interval '60 seconds'
  returning true into claimed;
  return coalesce(claimed, false);
end;
$$;
revoke all on function public.measurement_claim_code_request(text) from public, anon, authenticated;
grant execute on function public.measurement_claim_code_request(text) to service_role;
