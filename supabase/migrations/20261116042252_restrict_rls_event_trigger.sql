-- This event-trigger function runs with elevated privileges during DDL only.
-- The default EXECUTE grant to PUBLIC is unnecessary and exposes it as an RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
