-- supabase/migrations/003_rpc_create_quote.sql

create or replace function public.create_quote(payload jsonb)
returns jsonb
language plpgsql
security definer  -- Fonksiyon sahibi yetkisiyle çalışır (RLS bypass için)
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
  v_tier          jsonb;
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
  -- ── Kullanıcı doğrulama ──────────────────────────────
  if v_uid is null then
    raise exception 'Yetkisiz erişim.';
  end if;

  select * into v_profile from customer_profiles where id = v_uid;
  if not found then
    raise exception 'Müşteri profili bulunamadı.';
  end if;

  -- ── İdempotency kontrolü — aynı key tekrar gelirse mevcut teklifi döndür ──
  if v_idem_key is not null then
    select row_to_json(q)::jsonb into v_result
    from quotes q
    where idempotency_key = v_idem_key and customer_id = v_uid;
    if found then
      return jsonb_build_object('quote', v_result, 'autoApproved', (v_result->>'auto_approved')::boolean);
    end if;
  end if;

  -- ── Sepet boş mu? ────────────────────────────────────
  if v_items is null or jsonb_array_length(v_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- ── Her kalem için ürün doğrulama + fiyat hesaplama ─
  for v_item in select * from jsonb_array_elements(v_items) loop
    select * into v_product from products where id = v_item->>'productId' and is_active = true;
    if not found then
      raise exception 'Ürün bulunamadı: %', v_item->>'productId';
    end if;

    v_qty := (v_item->>'quantity')::int;

    -- MOQ kontrolü
    if v_qty < v_product.moq then
      raise exception 'MOQ_VIOLATION: % için minimum % adet.', v_product.name, v_product.moq;
    end if;

    -- Stok kontrolü
    if v_qty > v_product.stock_qty then
      raise exception 'STOCK_EXCEEDED: % için stok yetersiz.', v_product.name;
    end if;

    -- Kademeli fiyat çözümleme
    v_list_price := v_product.base_price;
    for v_tier_item in select * from jsonb_array_elements(v_product.price_tiers) loop
      if v_qty >= (v_tier_item->>'minQuantity')::int then
        v_list_price := (v_tier_item->>'unitPrice')::numeric;
      end if;
    end loop;

    -- Hedef fiyat — müşteri isteği ya da liste fiyatı
    v_target_price := coalesce(
      nullif((v_item->>'targetUnitPrice')::numeric, 0),
      v_list_price
    );

    -- Satır toplamları
    v_total_list  := v_total_list + v_list_price   * v_qty;
    v_total_req   := v_total_req  + v_target_price * v_qty;
    v_total_cost  := v_total_cost + v_product.cost_price * v_qty;  -- Maliyet sunucuda kalır

    -- Kalem JSON'u oluştur (cost_price istemciye GÖNDERILMIYOR)
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
      -- marginPct sadece admin için, müşteri response'unda gizlenebilir
      'marginPct',      round(((v_target_price - v_product.cost_price) / nullif(v_target_price,0)) * 100, 2)
    );
  end loop;

  -- ── Marj hesabı ──────────────────────────────────────
  v_margin_pct := round(((v_total_req - v_total_cost) / nullif(v_total_req, 0)) * 100, 2);

  -- ── Kredi limiti kontrolü ─────────────────────────────
  select * into v_credit from customer_credit where customer_id = v_uid;
  if found then
    if (v_credit.outstanding + v_credit.overdue + v_total_req) > v_credit.credit_limit then
      raise exception 'CREDIT_LIMIT: Kullanılabilir limit %.2f ₺, talep %.2f ₺.',
        greatest(v_credit.credit_limit - v_credit.outstanding - v_credit.overdue, 0),
        v_total_req;
    end if;
  end if;

  -- ── Otomatik onay kuralı ──────────────────────────────
  v_auto_approve := v_margin_pct >= 10 and v_profile.risk_level != 'HIGH';

  -- ── Teklif numarası üret ──────────────────────────────
  v_seq       := nextval('quote_seq');
  v_quote_id  := 'q-' || v_seq;
  v_quote_code := 'TK-' || v_seq;

  -- ── Kayıt ────────────────────────────────────────────
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

  -- ── Otomatik onayda kredi güncelle ───────────────────
  if v_auto_approve then
    update customer_credit
    set outstanding = outstanding + round(v_total_req, 2),
        updated_at  = now()
    where customer_id = v_uid;
  end if;

  -- ── Sonuç döndür ─────────────────────────────────────
  select row_to_json(q)::jsonb into v_result from quotes q where id = v_quote_id;
  return jsonb_build_object('quote', v_result, 'autoApproved', v_auto_approve);
end;
$$;

