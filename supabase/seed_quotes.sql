-- ========================================================
-- SEED QUOTES & COUNTER QUOTE RPC UPDATE & CUSTOMER SETUP
-- ========================================================

-- 1. COUNTER QUOTE FONKSİYONUNU ITEM_ID DESTEKLEYECEK ŞEKİLDE GÜNCELLE
create or replace function public.counter_quote(p_quote_id text, p_input jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_role         text;
  v_quote        quotes%rowtype;
  v_target_id    text    := p_input->>'itemId';
  v_new_price    numeric := (p_input->>'unitPrice')::numeric;
  v_new_items    jsonb   := '[]';
  v_item         jsonb;
  v_total_req    numeric := 0;
  v_total_cost   numeric := 0;
  v_co           jsonb;
begin
  select role into v_role from customer_profiles where id = auth.uid();
  if v_role != 'ADMIN' then raise exception 'Yetkisiz: Sadece yöneticiler karşı teklif verebilir.'; end if;

  select * into v_quote from quotes where id = p_quote_id;
  if not found then raise exception 'Teklif bulunamadı: %', p_quote_id; end if;

  -- Eğer itemId belirtilmediyse ilk kalemi al
  if v_target_id is null or v_target_id = '' then
    v_target_id := v_quote.items->0->>'id';
  end if;

  for v_item in select * from jsonb_array_elements(v_quote.items) loop
    declare
      v_is_target boolean := (v_item->>'id' = v_target_id or v_item->>'productId' = v_target_id);
      v_price     numeric := case when v_is_target then v_new_price else (v_item->>'targetUnitPrice')::numeric end;
      v_qty       int     := (v_item->>'quantity')::int;
      v_cost      numeric;
    begin
      select cost_price into v_cost from products where id = v_item->>'productId';
      if v_cost is null then v_cost := coalesce((v_item->>'costUnitPrice')::numeric, v_price * 0.8); end if;

      v_total_req  := v_total_req  + v_price * v_qty;
      v_total_cost := v_total_cost + v_cost  * v_qty;
      v_new_items  := v_new_items || jsonb_set(
        jsonb_set(v_item, '{targetUnitPrice}', to_jsonb(v_price)),
        '{requestedTotal}', to_jsonb(round(v_price * v_qty, 2))
      );
    end;
  end loop;

  v_co := jsonb_build_object(
    'id',                p_quote_id || '-co-' || extract(epoch from now())::bigint,
    'quoteId',           p_quote_id,
    'itemId',            v_target_id,
    'proposedUnitPrice', v_new_price,
    'paymentTerm',       p_input->>'paymentTerm',
    'note',              trim(coalesce(p_input->>'note', '')),
    'createdAt',         now(),
    'createdBy',         'ADMIN'
  );

  update quotes set
    status          = 'COUNTERED',
    items           = v_new_items,
    total_requested = round(v_total_req, 2),
    margin_pct      = round(((v_total_req - v_total_cost) / nullif(v_total_req,0)) * 100, 2),
    payment_term    = coalesce(p_input->>'paymentTerm', payment_term),
    counter_offer   = v_co,
    decided_at      = now(),
    decision_note   = 'Karşı teklif gönderildi.',
    decided_by      = auth.uid(),
    updated_at      = now()
  where id = p_quote_id;

  return (select row_to_json(q)::jsonb from quotes q where id = p_quote_id);
end; $$;

-- 2. SEED TEKLİFLERİ VERİTABANINA EKLE (Admin onay/red/karşı teklif testleri için)
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'admin@ozrize.com';
  if v_user_id is null then select id into v_user_id from auth.users limit 1; end if;

  if v_user_id is not null then
    -- q-2051
    insert into public.quotes (
      id, code, customer_id, customer_name, contact_name, risk_level, status, payment_term,
      note, items, total_list, total_requested, margin_pct, auto_approved, created_at
    ) values (
      'q-2051', 'TK-2051', v_user_id, 'Anadolu Un Mamulleri A.Ş.', 'Ahmet Yılmaz', 'LOW',
      'PENDING', 'TERM_30', 'Haftalık düzenli sevkiyat istiyoruz.',
      '[
        {"id":"p-un-992-60","productId":"p-un-992","sku":"SKU-992","name":"Baklava & Böreklik Un 25 KG","unit":"Çuval","quantity":60,"listUnitPrice":438,"targetUnitPrice":410,"costUnitPrice":385,"listTotal":26280,"requestedTotal":24600,"marginPct":6.1},
        {"id":"p-yag-418-20","productId":"p-yag-418","sku":"SKU-418","name":"Pastacılık Kruvasan Margarini 10 KG","unit":"Koli","quantity":20,"listUnitPrice":1250,"targetUnitPrice":1200,"costUnitPrice":1050,"listTotal":25000,"requestedTotal":24000,"marginPct":12.5}
      ]'::jsonb,
      51280.00, 48600.00, 9.26, false, now() - interval '2 days'
    ) on conflict (id) do nothing;

    -- q-2052
    insert into public.quotes (
      id, code, customer_id, customer_name, contact_name, risk_level, status, payment_term,
      note, items, total_list, total_requested, margin_pct, auto_approved, created_at
    ) values (
      'q-2052', 'TK-2052', v_user_id, 'Boğaziçi Fırıncılık Ltd.', 'Mehmet Kaya', 'MEDIUM',
      'PENDING', 'CASH', 'Peşin ödeme için özel iskonto talep ediyoruz.',
      '[
        {"id":"p-kakao-771-5","productId":"p-kakao-771","sku":"SKU-771","name":"Alkalize Kakao Tozu %20-22 • 20 KG","unit":"Torba","quantity":5,"listUnitPrice":2800,"targetUnitPrice":2600,"costUnitPrice":2380,"listTotal":14000,"requestedTotal":13000,"marginPct":8.46}
      ]'::jsonb,
      14000.00, 13000.00, 8.46, false, now() - interval '1 day'
    ) on conflict (id) do nothing;

    -- q-2053
    insert into public.quotes (
      id, code, customer_id, customer_name, contact_name, risk_level, status, payment_term,
      note, items, total_list, total_requested, margin_pct, auto_approved, counter_offer, created_at
    ) values (
      'q-2053', 'TK-2053', v_user_id, 'Ege Pasta & Tatlıcılık', 'Ayşe Demir', 'LOW',
      'COUNTERED', 'TERM_30', 'Ramazan öncesi toplu sipariş.',
      '[
        {"id":"p-cikolata-604-30","productId":"p-cikolata-604","sku":"SKU-604","name":"Sütlü Kuvertür Çikolata 1 KG","unit":"Koli","quantity":30,"listUnitPrice":1450,"targetUnitPrice":1380,"costUnitPrice":1200,"listTotal":43500,"requestedTotal":41400,"marginPct":13.04}
      ]'::jsonb,
      43500.00, 41400.00, 13.04, false,
      '{"id":"q-2053-co-1","quoteId":"q-2053","itemId":"p-cikolata-604-30","proposedUnitPrice":1400,"paymentTerm":"TERM_30","note":"Maksimum verebileceğimiz fiyat 1.400 ₺ dir.","createdAt":"2026-11-06T10:00:00Z","createdBy":"ADMIN"}'::jsonb,
      now() - interval '3 hours'
    ) on conflict (id) do nothing;
  end if;
end $$;

-- 3. MÜŞTERİ KULLANICISI VARSA PROFİL VE LİMİT GÜNCELLE
do $$
declare
  v_cust_id uuid;
begin
  select id into v_cust_id from auth.users where email = 'musteri@ozrize.com';
  if v_cust_id is not null then
    insert into public.customer_profiles (id, company_name, code, contact_name, city, phone, tax_number, role, risk_level)
    values (v_cust_id, 'Anadolu Un Mamulleri A.Ş.', 'TR-4910', 'Ahmet Yılmaz', 'İstanbul', '0212 555 0192', '1234567890', 'CUSTOMER', 'LOW')
    on conflict (id) do update set
      role = 'CUSTOMER',
      company_name = 'Anadolu Un Mamulleri A.Ş.',
      contact_name = 'Ahmet Yılmaz',
      risk_level = 'LOW';

    insert into public.customer_credit (customer_id, credit_limit, outstanding, overdue, risk_score)
    values (v_cust_id, 250000.00, 58400.00, 0, 'A')
    on conflict (customer_id) do update set
      credit_limit = 250000.00;
  end if;
end $$;
