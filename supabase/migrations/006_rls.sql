-- supabase/migrations/006_rls.sql

-- RLS aktif et
alter table customer_profiles  enable row level security;
alter table customer_credit    enable row level security;
alter table products           enable row level security;
alter table quotes             enable row level security;
alter table ledger             enable row level security;
alter table push_tokens        enable row level security;

-- Mevcut politikaları temizle (varsa)
drop policy if exists "profiles_own" on customer_profiles;
drop policy if exists "profiles_admin" on customer_profiles;
drop policy if exists "profiles_self_update" on customer_profiles;
drop policy if exists "credit_own" on customer_credit;
drop policy if exists "credit_admin" on customer_credit;
drop policy if exists "products_customer_read" on products;
drop policy if exists "products_admin_write" on products;
drop policy if exists "quotes_customer_read" on quotes;
drop policy if exists "quotes_admin_read" on quotes;
drop policy if exists "quotes_insert_deny" on quotes;
drop policy if exists "quotes_update_deny" on quotes;
drop policy if exists "ledger_customer" on ledger;
drop policy if exists "ledger_admin" on ledger;
drop policy if exists "tokens_own" on push_tokens;

-- ─── customer_profiles ───────────────────────────────
create policy "profiles_own"   on customer_profiles for select using (id = auth.uid());
create policy "profiles_admin" on customer_profiles for select
  using ((select role from customer_profiles where id = auth.uid()) = 'ADMIN');
create policy "profiles_self_update" on customer_profiles for update using (id = auth.uid());

-- ─── customer_credit ─────────────────────────────────
create policy "credit_own"   on customer_credit for select using (customer_id = auth.uid());
create policy "credit_admin" on customer_credit for select
  using ((select role from customer_profiles where id = auth.uid()) = 'ADMIN');

-- ─── products ────────────────────────────────────────
create policy "products_customer_read" on products for select
  using (is_active = true);
create policy "products_admin_write" on products for all
  using ((select role from customer_profiles where id = auth.uid()) = 'ADMIN');

-- ─── quotes ──────────────────────────────────────────
create policy "quotes_customer_read" on quotes for select
  using (customer_id = auth.uid());
create policy "quotes_admin_read" on quotes for select
  using ((select role from customer_profiles where id = auth.uid()) = 'ADMIN');

create policy "quotes_insert_deny" on quotes for insert with check (false);
create policy "quotes_update_deny" on quotes for update using (false);

-- ─── ledger ──────────────────────────────────────────
create policy "ledger_customer" on ledger for select using (customer_id = auth.uid());
create policy "ledger_admin"    on ledger for select
  using ((select role from customer_profiles where id = auth.uid()) = 'ADMIN');

-- ─── push_tokens ─────────────────────────────────────
create policy "tokens_own" on push_tokens for all using (user_id = auth.uid());

