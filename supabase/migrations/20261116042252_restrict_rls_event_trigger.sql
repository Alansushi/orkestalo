-- This event-trigger function runs with elevated privileges during DDL only.
-- The default EXECUTE grant to PUBLIC is unnecessary and exposes it as an RPC.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- The production domain is configured in Vercel. Keep the pilot inactive until validated.
update public.measurement_sites
set allowed_origins = array['https://www.fersuasmi.com.mx'],
    privacy_notice_url = 'https://www.fersuasmi.com.mx/aviso-de-privacidad'
where slug = 'dra-fernanda-suaste';
