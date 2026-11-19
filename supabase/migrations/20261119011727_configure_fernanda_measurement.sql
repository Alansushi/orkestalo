update public.measurement_sites
set allowed_origins = array['https://www.fersuasmi.com.mx'],
    privacy_notice_url = 'https://www.fersuasmi.com.mx/aviso-de-privacidad'
where slug = 'dra-fernanda-suaste';
