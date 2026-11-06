-- ========================================================
-- FIX RLS INFINITE RECURSION & SECURE ADMIN CHECK
-- ========================================================

-- 1. SECURITY DEFINER IS_ADMIN FONKSİYONU (RLS recursion'ı engeller)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from customer_profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

grant execute on function public.is_admin to authenticated, anon;

-- 2. POLICIES TEMİZLE VE YENİDEN OLUŞTUR
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

-- customer_profiles: Kullanıcı kendi profilini okur; Admin hepsini okur
create policy "profiles_own" on customer_profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles_self_update" on customer_profiles
  for update using (id = auth.uid() or public.is_admin());

-- customer_credit: Kullanıcı kendi kredisini, Admin hepsini okur
create policy "credit_own" on customer_credit
  for select using (customer_id = auth.uid() or public.is_admin());

-- products: Herkes aktif ürünleri okur, Admin yönetir
create policy "products_customer_read" on products
  for select using (is_active = true or public.is_admin());

create policy "products_admin_write" on products
  for all using (public.is_admin());

-- quotes: Müşteri kendininkini, Admin hepsini okur
create policy "quotes_customer_read" on quotes
  for select using (customer_id = auth.uid() or public.is_admin());

create policy "quotes_insert_deny" on quotes for insert with check (false);
create policy "quotes_update_deny" on quotes for update using (false);

-- ledger: Müşteri kendininkini, Admin hepsini okur
create policy "ledger_customer" on ledger
  for select using (customer_id = auth.uid() or public.is_admin());

