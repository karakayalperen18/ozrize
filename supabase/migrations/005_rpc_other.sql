-- supabase/migrations/005_rpc_other.sql

-- ── RED ───────────────────────────────────────────────
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

-- ── KARŞI TEKLİF ─────────────────────────────────────
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

-- ── KREDİ DURUMU ─────────────────────────────────────
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

