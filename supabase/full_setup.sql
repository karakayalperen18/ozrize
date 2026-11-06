-- ========================================================
-- OZRIZE B2B FULL DATABASE SETUP SCRIPT
-- ========================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. SCHEMA & TABLES
create sequence if not exists quote_seq start 2060;

create table if not exists public.customer_profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  company_name text        not null,
  code         text        unique,
  tax_number   text,
  city         text,
  contact_name text,
  phone        text,
  risk_level   text        not null default 'LOW' check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  role         text        not null default 'CUSTOMER' check (role in ('CUSTOMER', 'ADMIN')),
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

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

create table if not exists public.customer_credit (
  customer_id    uuid          primary key references auth.users(id) on delete cascade,
  credit_limit   numeric(14,2) not null default 0     check (credit_limit >= 0),
  outstanding    numeric(14,2) not null default 0     check (outstanding >= 0),
  overdue        numeric(14,2) not null default 0     check (overdue >= 0),
  risk_score     text          not null default 'B',
  updated_at     timestamptz   not null default now()
);

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

create table if not exists public.products (
  id           text          primary key,
  sku          text          not null unique,
  name         text          not null,
  description  text          default '',
  category     text          not null check (category in ('FLOUR','FAT','CHOCOLATE','ADDITIVE','SWEETENER')),
  unit         text          not null,
  base_price   numeric(12,2) not null check (base_price > 0),
  cost_price   numeric(12,2) not null check (cost_price > 0),
  moq          int           not null default 1 check (moq > 0),
  stock_qty    int           not null default 0 check (stock_qty >= 0),
  price_tiers  jsonb         not null default '[]',
  is_active    boolean       not null default true,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

create or replace view public.products_public as
  select id, sku, name, description, category, unit,
         base_price, moq, stock_qty, price_tiers, is_active
  from public.products
  where is_active = true;

create table if not exists public.quotes (
  id               text          primary key default 'q-' || nextval('quote_seq')::text,
  code             text          not null unique,
  customer_id      uuid          not null references auth.users(id),
  customer_name    text          not null,
  contact_name     text,
  risk_level       text          not null default 'LOW',
  status           text          not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED','COUNTERED')),
  payment_term     text          not null check (payment_term in ('CASH','TERM_30','CREDIT_CARD')),
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

create table if not exists public.ledger (
  id          text          primary key default 'le-' || gen_random_uuid(),
  customer_id uuid          not null references auth.users(id),
  reference   text          not null,
  description text          default '',
  date        timestamptz   not null,
  amount      numeric(14,2) not null,
  type        text          not null check (type in ('INVOICE','COLLECTION','ADJUSTMENT')),
  status      text          not null check (status in ('PAID','PENDING','OVERDUE')),
  quote_id    text          references quotes(id),
  created_at  timestamptz   not null default now()
);

create table if not exists public.push_tokens (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  token       text        not null unique,
  platform    text        not null check (platform in ('ios','android','web')),
  created_at  timestamptz not null default now(),
  unique(user_id, token)
);

-- 3. SEED PRODUCTS
insert into public.products
  (id, sku, name, description, category, unit, base_price, cost_price, moq, stock_qty, price_tiers)
values
  ('p-un-992','SKU-992','Baklava & Böreklik Un 25 KG','Özel ipek tip 550 • çuval ambalaj',
   'FLOUR','Çuval',450,385,10,1840,
   '[{"minQuantity":10,"unitPrice":450},{"minQuantity":50,"unitPrice":438},{"minQuantity":100,"unitPrice":425}]'),
  ('p-yag-418','SKU-418','Pastacılık Kruvasan Margarini 10 KG','Yüksek elastikiyet, laminasyon blok yağ',
   'FAT','Koli',1250,1050,5,620,
   '[{"minQuantity":5,"unitPrice":1250},{"minQuantity":25,"unitPrice":1215},{"minQuantity":50,"unitPrice":1180}]'),
  ('p-kakao-771','SKU-771','Alkalize Kakao Tozu %20-22 • 20 KG','Koyu renk, yoğun aroma • pastacılık kakao',
   'CHOCOLATE','Torba',2800,2380,2,240,
   '[{"minQuantity":2,"unitPrice":2800},{"minQuantity":10,"unitPrice":2720},{"minQuantity":25,"unitPrice":2650}]'),
  ('p-un-120','SKU-120','Ekmeklik Tam Buğday Unu 50 KG','Taş değirmen • yüksek lif oranı',
   'FLOUR','Çuval',690,600,5,960,
   '[{"minQuantity":5,"unitPrice":690},{"minQuantity":30,"unitPrice":672},{"minQuantity":60,"unitPrice":655}]'),
  ('p-yag-233','SKU-233','Sütlü Tereyağı 5 KG','Geleneksel yayık tereyağı • soğuk zincir',
   'FAT','Koli',2400,2100,4,310,
   '[{"minQuantity":4,"unitPrice":2400},{"minQuantity":20,"unitPrice":2330},{"minQuantity":40,"unitPrice":2265}]'),
  ('p-maya-305','SKU-305','Instant Kuru Maya 500 G','Yüksek aktiviteli • 20li koli',
   'ADDITIVE','Koli',380,330,12,1450,
   '[{"minQuantity":12,"unitPrice":380},{"minQuantity":48,"unitPrice":365},{"minQuantity":96,"unitPrice":352}]'),
  ('p-seker-512','SKU-512','Pudra Şekeri 25 KG','0 numara öğütülmüş • topaklanma önleyici',
   'SWEETENER','Çuval',980,860,6,740,
   '[{"minQuantity":6,"unitPrice":980},{"minQuantity":24,"unitPrice":952},{"minQuantity":48,"unitPrice":930}]'),
  ('p-cikolata-604','SKU-604','Sütlü Kuvertür Çikolata 1 KG','%34 kakao • damla ve blok seçenekli',
   'CHOCOLATE','Koli',1450,1200,10,520,
   '[{"minQuantity":10,"unitPrice":1450},{"minQuantity":40,"unitPrice":1405},{"minQuantity":80,"unitPrice":1368}]'),
  ('p-krema-707','SKU-707','Pasta Kreması Şanti 1 KG','Uzun ömürlü • bitkisel yağ bazlı',
   'ADDITIVE','Koli',720,615,6,880,
   '[{"minQuantity":6,"unitPrice":720},{"minQuantity":24,"unitPrice":699},{"minQuantity":60,"unitPrice":678}]'),
  ('p-glutensiz-815','SKU-815','Glutensiz Pirinç Unu 10 KG','Sertifikalı glutensiz hat • torba',
   'FLOUR','Torba',560,495,8,260,
   '[{"minQuantity":8,"unitPrice":560},{"minQuantity":32,"unitPrice":542},{"minQuantity":64,"unitPrice":525}]')
on conflict (id) do update set
  sku = excluded.sku,
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  unit = excluded.unit,
  base_price = excluded.base_price,
  cost_price = excluded.cost_price,
  moq = excluded.moq,
  stock_qty = excluded.stock_qty,
  price_tiers = excluded.price_tiers;

-- 4. RPC FUNCTIONS
create or replace function public.create_quote(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid           uuid    := auth.uid();
  v_profile       customer_profiles%rowtype;
  v_credit        customer_credit%rowtype;
  v_items         jsonb   := payload->'items';
  v_payment_term  text    := payload->>'paymentTerm';
  v_note          text    := coalesce(payload->>'note', '');
  v_idem_key      text    := payload->>'idempotencyKey';

  v_item          jsonb;
  v_product       products%rowtype;
  v_qty           int;
  v_target_price  numeric;
  v_list_price    numeric;
  v_tier_item     jsonb;

  v_built_items   jsonb   := '[]';
  v_total_list    numeric := 0;
  v_total_req     numeric := 0;
  v_total_cost    numeric := 0;
  v_margin_pct    numeric;
  v_auto_approve  boolean;
  v_seq           int;
  v_quote_id      text;
  v_quote_code    text;
  v_now           timestamptz := now();
  v_result        jsonb;
begin
  if v_uid is null then raise exception 'Yetkisiz erişim.'; end if;

  select * into v_profile from customer_profiles where id = v_uid;
  if not found then raise exception 'Müşteri profili bulunamadı.'; end if;

  if v_idem_key is not null then
    select row_to_json(q)::jsonb into v_result
    from quotes q
    where idempotency_key = v_idem_key and customer_id = v_uid;
    if found then
      return jsonb_build_object('quote', v_result, 'autoApproved', (v_result->>'auto_approved')::boolean);
    end if;
  end if;

  if v_items is null or jsonb_array_length(v_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  for v_item in select * from jsonb_array_elements(v_items) loop
    select * into v_product from products where id = v_item->>'productId' and is_active = true;
    if not found then raise exception 'Ürün bulunamadı: %', v_item->>'productId'; end if;

    v_qty := (v_item->>'quantity')::int;
    if v_qty < v_product.moq then
      raise exception 'MOQ_VIOLATION: % için minimum % adet.', v_product.name, v_product.moq;
    end if;
    if v_qty > v_product.stock_qty then
      raise exception 'STOCK_EXCEEDED: % için stok yetersiz.', v_product.name;
    end if;

    v_list_price := v_product.base_price;
    for v_tier_item in select * from jsonb_array_elements(v_product.price_tiers) loop
      if v_qty >= (v_tier_item->>'minQuantity')::int then
        v_list_price := (v_tier_item->>'unitPrice')::numeric;
      end if;
    end loop;

    v_target_price := coalesce(nullif((v_item->>'targetUnitPrice')::numeric, 0), v_list_price);
    v_total_list  := v_total_list + v_list_price   * v_qty;
    v_total_req   := v_total_req  + v_target_price * v_qty;
    v_total_cost  := v_total_cost + v_product.cost_price * v_qty;

    v_built_items := v_built_items || jsonb_build_object(
      'id',             v_product.id || '-' || v_qty,
      'productId',      v_product.id,
      'sku',            v_product.sku,
      'name',           v_product.name,
      'unit',           v_product.unit,
      'quantity',       v_qty,
      'listUnitPrice',  v_list_price,
      'targetUnitPrice', v_target_price,
      'listTotal',      round(v_list_price * v_qty, 2),
      'requestedTotal', round(v_target_price * v_qty, 2),
      'marginPct',      round(((v_target_price - v_product.cost_price) / nullif(v_target_price,0)) * 100, 2)
    );
  end loop;

  v_margin_pct := round(((v_total_req - v_total_cost) / nullif(v_total_req, 0)) * 100, 2);

  select * into v_credit from customer_credit where customer_id = v_uid;
  if found then
    if (v_credit.outstanding + v_credit.overdue + v_total_req) > v_credit.credit_limit then
      raise exception 'CREDIT_LIMIT: Kullanılabilir limit %.2f ₺, talep %.2f ₺.',
        greatest(v_credit.credit_limit - v_credit.outstanding - v_credit.overdue, 0),
        v_total_req;
    end if;
  end if;

  v_auto_approve := v_margin_pct >= 10 and v_profile.risk_level != 'HIGH';
  v_seq        := nextval('quote_seq');
  v_quote_id   := 'q-' || v_seq;
  v_quote_code := 'TK-' || v_seq;

  insert into quotes (
    id, code, customer_id, customer_name, contact_name, risk_level,
    status, payment_term, note, items,
    total_list, total_requested, margin_pct,
    auto_approved, decided_at, decision_note,
    idempotency_key, created_at
  ) values (
    v_quote_id, v_quote_code, v_uid, v_profile.company_name, v_profile.contact_name,
    v_profile.risk_level,
    case when v_auto_approve then 'APPROVED' else 'PENDING' end,
    v_payment_term, v_note, v_built_items,
    round(v_total_list, 2), round(v_total_req, 2), v_margin_pct,
    v_auto_approve,
    case when v_auto_approve then v_now else null end,
    case when v_auto_approve then 'Marj eşiği üzerinde — otomatik onaylandı.' else null end,
    v_idem_key, v_now
  );

  if v_auto_approve then
    update customer_credit
    set outstanding = outstanding + round(v_total_req, 2),
        updated_at  = now()
    where customer_id = v_uid;
  end if;

  select row_to_json(q)::jsonb into v_result from quotes q where id = v_quote_id;
  return jsonb_build_object('quote', v_result, 'autoApproved', v_auto_approve);
end;
$$;

create or replace function public.approve_quote(p_quote_id text, p_discount_pct numeric default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_role      text;
  v_quote     quotes%rowtype;
  v_item      jsonb;
  v_new_items jsonb := '[]';
  v_factor    numeric;
  v_total_req numeric := 0;
  v_total_cost numeric := 0;
  v_margin_pct numeric;
  v_decision_note text;
begin
  select role into v_role from customer_profiles where id = v_uid;
  if v_role != 'ADMIN' then raise exception 'Yetkisiz: Sadece yöneticiler teklif onaylayabilir.'; end if;

  select * into v_quote from quotes where id = p_quote_id;
  if not found then raise exception 'Teklif bulunamadı: %', p_quote_id; end if;
  if v_quote.status != 'PENDING' then raise exception 'Yalnızca bekleyen teklifler onaylanabilir.'; end if;

  v_factor := 1 - (coalesce(p_discount_pct, 0) / 100);

  for v_item in select * from jsonb_array_elements(v_quote.items) loop
    declare
      v_new_price numeric := round((v_item->>'targetUnitPrice')::numeric * v_factor, 2);
      v_qty       int     := (v_item->>'quantity')::int;
      v_cost      numeric;
    begin
      select cost_price into v_cost from products where id = v_item->>'productId';
      v_total_req  := v_total_req  + v_new_price * v_qty;
      v_total_cost := v_total_cost + v_cost * v_qty;
      v_new_items := v_new_items || jsonb_set(
        jsonb_set(v_item, '{targetUnitPrice}', to_jsonb(v_new_price)),
        '{requestedTotal}', to_jsonb(round(v_new_price * v_qty, 2))
      );
    end;
  end loop;

  v_margin_pct := round(((v_total_req - v_total_cost) / nullif(v_total_req, 0)) * 100, 2);
  v_decision_note := case
    when p_discount_pct > 0 then 'Onaylandı • %' || p_discount_pct || ' ek iskonto uygulandı.'
    else 'Onaylandı.'
  end;

  update quotes set
    status        = 'APPROVED',
    items         = v_new_items,
    total_requested = round(v_total_req, 2),
    margin_pct    = v_margin_pct,
    decided_at    = now(),
    decision_note = v_decision_note,
    decided_by    = v_uid,
    updated_at    = now()
  where id = p_quote_id;

  update customer_credit set
    outstanding = outstanding + round(v_total_req, 2),
    updated_at  = now()
  where customer_id = v_quote.customer_id;

  return (select row_to_json(q)::jsonb from quotes q where id = p_quote_id);
end;
$$;

create or replace function public.reject_quote(p_quote_id text, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_role text; begin
  select role into v_role from customer_profiles where id = auth.uid();
  if v_role != 'ADMIN' then raise exception 'Yetkisiz.'; end if;

  update quotes set
    status        = 'REJECTED',
    decided_at    = now(),
    decision_note = coalesce(nullif(trim(p_note),''), 'Talep reddedildi.'),
    decided_by    = auth.uid(),
    updated_at    = now()
  where id = p_quote_id and status = 'PENDING';

  if not found then raise exception 'Bekleyen teklif bulunamadı: %', p_quote_id; end if;
  return (select row_to_json(q)::jsonb from quotes q where id = p_quote_id);
end; $$;

create or replace function public.counter_quote(p_quote_id text, p_input jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role       text;
  v_quote      quotes%rowtype;
  v_first_item jsonb;
  v_new_price  numeric := (p_input->>'unitPrice')::numeric;
  v_new_items  jsonb   := '[]';
  v_item       jsonb;
  v_total_req  numeric := 0;
  v_total_cost numeric := 0;
  v_co         jsonb;
begin
  select role into v_role from customer_profiles where id = auth.uid();
  if v_role != 'ADMIN' then raise exception 'Yetkisiz.'; end if;

  select * into v_quote from quotes where id = p_quote_id;
  if not found then raise exception 'Teklif bulunamadı.'; end if;

  v_first_item := v_quote.items->0;

  for v_item in select * from jsonb_array_elements(v_quote.items) loop
    declare
      v_price  numeric := case when v_item->>'id' = v_first_item->>'id' then v_new_price
                               else (v_item->>'targetUnitPrice')::numeric end;
      v_qty    int     := (v_item->>'quantity')::int;
      v_cost   numeric;
    begin
      select cost_price into v_cost from products where id = v_item->>'productId';
      v_total_req  := v_total_req  + v_price * v_qty;
      v_total_cost := v_total_cost + v_cost  * v_qty;
      v_new_items  := v_new_items || jsonb_set(v_item, '{targetUnitPrice}', to_jsonb(v_price));
    end;
  end loop;

  v_co := jsonb_build_object(
    'id',               p_quote_id || '-co-' || extract(epoch from now())::bigint,
    'quoteId',          p_quote_id,
    'itemId',           v_first_item->>'id',
    'proposedUnitPrice', v_new_price,
    'paymentTerm',      p_input->>'paymentTerm',
    'note',             trim(p_input->>'note'),
    'createdAt',        now(),
    'createdBy',        'ADMIN'
  );

  update quotes set
    status          = 'COUNTERED',
    items           = v_new_items,
    total_requested = round(v_total_req, 2),
    margin_pct      = round(((v_total_req - v_total_cost) / nullif(v_total_req,0)) * 100, 2),
    payment_term    = p_input->>'paymentTerm',
    counter_offer   = v_co,
    decided_at      = now(),
    decision_note   = 'Karşı teklif gönderildi.',
    decided_by      = auth.uid(),
    updated_at      = now()
  where id = p_quote_id;

  return (select row_to_json(q)::jsonb from quotes q where id = p_quote_id);
end; $$;

create or replace function public.get_credit()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_credit customer_credit_view%rowtype;
begin
  select * into v_credit from customer_credit_view where customer_id = v_uid;
  if not found then raise exception 'Kredi kaydı bulunamadı.'; end if;

  return jsonb_build_object(
    'credit', row_to_json(v_credit),
    'check', jsonb_build_object(
      'requestedTotal',    0,
      'currentExposure',   v_credit.outstanding + v_credit.overdue,
      'projectedExposure', v_credit.outstanding + v_credit.overdue,
      'limit',             v_credit.credit_limit,
      'available',         v_credit.available,
      'exceeds',           false,
      'overflow',          0
    )
  );
end; $$;

-- 5. STOCK TRIGGER
create or replace function deduct_stock_on_approval()
returns trigger language plpgsql as $$
declare v_item jsonb; begin
  if NEW.status = 'APPROVED' and OLD.status != 'APPROVED' then
    for v_item in select * from jsonb_array_elements(NEW.items) loop
      update products
      set stock_qty   = stock_qty - (v_item->>'quantity')::int,
          updated_at  = now()
      where id = v_item->>'productId'
        and stock_qty >= (v_item->>'quantity')::int;

      if not found then
        raise exception 'STOCK_EXCEEDED: % için yetersiz stok.', v_item->>'productId';
      end if;
    end loop;
  end if;
  return NEW;
end;
$$;

drop trigger if exists deduct_stock on quotes;
create trigger deduct_stock after update on quotes
  for each row execute function deduct_stock_on_approval();

-- 6. RLS POLICIES
alter table customer_profiles  enable row level security;
alter table customer_credit    enable row level security;
alter table products           enable row level security;
alter table quotes             enable row level security;
alter table ledger             enable row level security;
alter table push_tokens        enable row level security;

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

create policy "profiles_own"   on customer_profiles for select using (id = auth.uid());
create policy "profiles_admin" on customer_profiles for select
  using ((select role from customer_profiles where id = auth.uid()) = 'ADMIN');
create policy "profiles_self_update" on customer_profiles for update using (id = auth.uid());

create policy "credit_own"   on customer_credit for select using (customer_id = auth.uid());
create policy "credit_admin" on customer_credit for select
  using ((select role from customer_profiles where id = auth.uid()) = 'ADMIN');

create policy "products_customer_read" on products for select using (is_active = true);
create policy "products_admin_write" on products for all
  using ((select role from customer_profiles where id = auth.uid()) = 'ADMIN');

create policy "quotes_customer_read" on quotes for select using (customer_id = auth.uid());
create policy "quotes_admin_read" on quotes for select
  using ((select role from customer_profiles where id = auth.uid()) = 'ADMIN');
create policy "quotes_insert_deny" on quotes for insert with check (false);
create policy "quotes_update_deny" on quotes for update using (false);

create policy "ledger_customer" on ledger for select using (customer_id = auth.uid());
create policy "ledger_admin"    on ledger for select
  using ((select role from customer_profiles where id = auth.uid()) = 'ADMIN');

create policy "tokens_own" on push_tokens for all using (user_id = auth.uid());

-- 7. AUTH HOOK FUNCTION
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims    jsonb;
  user_role text;
begin
  select role into user_role
  from public.customer_profiles
  where id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{user_role}', to_jsonb(coalesce(user_role, 'CUSTOMER')));

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

