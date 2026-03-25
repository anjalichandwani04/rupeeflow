-- RupeeFlow minimal schema
-- Run this in Supabase SQL editor.

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  date date not null,
  merchant text not null,
  amount numeric(12,2) not null,
  type text not null default 'debit',
  category text not null default 'Other',
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_email_date_idx
  on public.transactions (user_email, date desc);

-- If the table was created without `category`, add it.
alter table public.transactions
  add column if not exists category text not null default 'Other';

alter table public.transactions
  add column if not exists type text not null default 'debit';

create unique index if not exists transactions_dedupe_unique_idx
  on public.transactions (user_email, date, merchant, amount);

-- Per-user settings (manual monthly budget)
create table if not exists public.user_settings (
  email text primary key,
  monthly_budget numeric(12,2) not null default 25000
);

create index if not exists user_settings_email_idx on public.user_settings (email);

