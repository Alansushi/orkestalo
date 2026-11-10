alter table public.inquiries
  add column marketing_consent boolean not null default false,
  add column marketing_consented_at timestamptz,
  add column marketing_consent_version text,
  add constraint inquiries_marketing_consent_consistent check (
    (marketing_consent and marketing_consented_at is not null and marketing_consent_version is not null and (email <> '' or phone <> ''))
    or (not marketing_consent and marketing_consented_at is null and marketing_consent_version is null)
  );

alter table public.orders
  add column marketing_consent boolean not null default false,
  add column marketing_consented_at timestamptz,
  add column marketing_consent_version text,
  add constraint orders_marketing_consent_consistent check (
    (marketing_consent and marketing_consented_at is not null and marketing_consent_version is not null)
    or (not marketing_consent and marketing_consented_at is null and marketing_consent_version is null)
  );
