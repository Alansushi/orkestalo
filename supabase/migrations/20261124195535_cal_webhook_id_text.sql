-- Cal.com now returns UUID webhook IDs. Preserve any earlier numeric IDs.
alter table public.clinic_cal_webhooks
  alter column webhook_id type text using webhook_id::text;
