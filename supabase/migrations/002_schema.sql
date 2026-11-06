-- supabase/migrations/002_schema.sql

-- ──────────────────────────────────────────
-- MÜŞTERİ PROFİLİ
-- auth.users tablosunu genişletir
-- ──────────────────────────────────────────
create table if not exists public.customer_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  company_name text        not null,
  code         text        unique,                    -- TR-4910 formatı
  tax_number   text,                                  -- Vergi no (şifreli tutulacak)
  city         text,
  contact_name text,
  phone        text,
  risk_level   text        not null default 'LOW'     -- LOW | MEDIUM | HIGH
                           check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  role         text        not null default 'CUSTOMER'
                           check (role in ('CUSTOMER', 'ADMIN')),
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Yeni auth kullanıcısı oluşturulduğunda otomatik profil oluştur
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.customer_profiles (id, company_name, contact_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'company_name', 'Yeni Şirket'),
    coalesce(new.raw_user_meta_data->>'contact_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────
-- KREDİ LİMİTİ
-- ──────────────────────────────────────────
create table if not exists public.customer_credit (
  customer_id    uuid          primary key references auth.users(id) on delete cascade,
  credit_limit   numeric(14,2) not null default 0     check (credit_limit >= 0),
  outstanding    numeric(14,2) not null default 0     check (outstanding >= 0),
  overdue        numeric(14,2) not null default 0     check (overdue >= 0),
  risk_score     text          not null default 'B',
  updated_at     timestamptz   not null default now()
);

-- Hesaplanan kolonlar için view
create or replace view public.customer_credit_view as
  select
    customer_id,
    credit_limit,
    outstanding,
    overdue,
    greatest(credit_limit - outstanding - overdue, 0) as available,
    round(((outstanding + overdue) / nullif(credit_limit, 0)) * 100, 2) as utilization_pct,
    risk_score,
    updated_at
  from public.customer_credit;

-- ──────────────────────────────────────────
-- ÜRÜNLER
-- ──────────────────────────────────────────
create table if not exists public.products (
  id           text          primary key,
  sku          text          not null unique,
  name         text          not null,
  description  text          default '',
  category     text          not null
                             check (category in ('FLOUR','FAT','CHOCOLATE','ADDITIVE','SWEETENER')),
  unit         text          not null,
  base_price   numeric(12,2) not null check (base_price > 0),
  cost_price   numeric(12,2) not null check (cost_price > 0),  -- ⚠️ Admin only
  moq          int           not null default 1 check (moq > 0),
  stock_qty    int           not null default 0 check (stock_qty >= 0),
  price_tiers  jsonb         not null default '[]',
  is_active    boolean       not null default true,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

-- Müşterilere maliyet bilgisi gizlenerek sunulan view
create or replace view public.products_public as
  select id, sku, name, description, category, unit,
         base_price, moq, stock_qty, price_tiers, is_active
  from public.products
  where is_active = true;

-- ──────────────────────────────────────────
-- TEKLİFLER
-- ──────────────────────────────────────────
create sequence if not exists quote_seq start 2060;

create table if not exists public.quotes (
  id               text          primary key default 'q-' || nextval('quote_seq')::text,
  code             text          not null unique,
  customer_id      uuid          not null references auth.users(id),
  customer_name    text          not null,
  contact_name     text,
  risk_level       text          not null default 'LOW',
  status           text          not null default 'PENDING'
                                 check (status in ('PENDING','APPROVED','REJECTED','COUNTERED')),
  payment_term     text          not null
                                 check (payment_term in ('CASH','TERM_30','CREDIT_CARD')),
  note             text          default '',
  items            jsonb         not null default '[]',
  total_list       numeric(14,2),
  total_requested  numeric(14,2),
  margin_pct       numeric(6,2),
  auto_approved    boolean       not null default false,
  counter_offer    jsonb,
  decided_at       timestamptz,
  decision_note    text,
  decided_by       uuid          references auth.users(id),
  idempotency_key  text          unique,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

-- Otomatik updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quotes_updated_at on public.quotes;
create trigger quotes_updated_at
  before update on public.quotes
  for each row execute function update_updated_at();

-- ──────────────────────────────────────────
-- CARİ HESAP HAREKETLERİ
-- ──────────────────────────────────────────
create table if not exists public.ledger (
  id          text          primary key default 'le-' || gen_random_uuid(),
  customer_id uuid          not null references auth.users(id),
  reference   text          not null,
  description text          default '',
  date        timestamptz   not null,
  amount      numeric(14,2) not null,  -- Pozitif=borç, Negatif=ödeme
  type        text          not null
                            check (type in ('INVOICE','COLLECTION','ADJUSTMENT')),
  status      text          not null
                            check (status in ('PAID','PENDING','OVERDUE')),
  quote_id    text          references quotes(id),
  created_at  timestamptz   not null default now()
);

-- ──────────────────────────────────────────
-- PUSH TOKEN (Bildirimler için)
-- ──────────────────────────────────────────
create table if not exists public.push_tokens (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  token       text        not null unique,
  platform    text        not null check (platform in ('ios','android','web')),
  created_at  timestamptz not null default now(),
  unique(user_id, token)
);

