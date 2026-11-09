create table public.inquiries (
  folio text primary key check (folio ~ '^ORK26-[A-F0-9]{18}$'),
  name text not null check (char_length(name) between 1 and 120),
  email text not null default '',
  phone text not null default '',
  type text not null check (char_length(type) between 1 and 60),
  description text not null check (char_length(description) between 15 and 4000),
  budget text not null default '',
  date text not null default '',
  reference text not null default '',
  created_at timestamptz not null default now(),
  email_claimed_at timestamptz,
  email_sent_at timestamptz
);

create table public.orders (
  folio text primary key check (folio ~ '^ORK26-[A-F0-9]{18}$'),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  whatsapp text not null check (char_length(whatsapp) between 10 and 30),
  business text not null check (char_length(business) between 1 and 160),
  amount_mxn integer not null default 7000 check (amount_mxn = 7000),
  terms_version text not null check (terms_version = 'buen-fin-2026-v1'),
  accepted_terms_at timestamptz not null,
  status text not null default 'created' check (status in ('created', 'pending', 'approved', 'rejected', 'checkout_error')),
  mp_order_id text unique,
  mp_status_detail text,
  created_at timestamptz not null default now(),
  email_claimed_at timestamptz,
  email_sent_at timestamptz
);

create index orders_created_at_idx on public.orders (created_at desc);
create index inquiries_created_at_idx on public.inquiries (created_at desc);

alter table public.inquiries enable row level security;
alter table public.orders enable row level security;
revoke all on public.inquiries, public.orders from public, anon, authenticated;
grant all on public.inquiries, public.orders to service_role;
