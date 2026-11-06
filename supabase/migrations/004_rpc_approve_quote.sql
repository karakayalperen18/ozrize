-- supabase/migrations/004_rpc_approve_quote.sql

create or replace function public.approve_quote(p_quote_id text, p_discount_pct numeric default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_role      text;
  v_quote     quotes%rowtype;
  v_items     jsonb;
  v_item      jsonb;
  v_new_items jsonb := '[]';
  v_factor    numeric;
  v_total_req numeric := 0;
  v_total_cost numeric := 0;
  v_margin_pct numeric;
  v_decision_note text;
begin
  -- Sadece admin onaylayabilir
  select role into v_role from customer_profiles where id = v_uid;
  if v_role != 'ADMIN' then
    raise exception 'Yetkisiz: Sadece yöneticiler teklif onaylayabilir.';
  end if;

  select * into v_quote from quotes where id = p_quote_id;
  if not found then raise exception 'Teklif bulunamadı: %', p_quote_id; end if;
  if v_quote.status != 'PENDING' then
    raise exception 'Yalnızca bekleyen teklifler onaylanabilir.';
  end if;

  -- İskonto faktörü
  v_factor := 1 - (coalesce(p_discount_pct, 0) / 100);

  -- Her kalemi yeniden hesapla
  for v_item in select * from jsonb_array_elements(v_quote.items) loop
    declare
      v_new_price numeric := round((v_item->>'targetUnitPrice')::numeric * v_factor, 2);
      v_qty       int     := (v_item->>'quantity')::int;
      -- Maliyet sunucudan yeniden alınır (istemci verisine güvenilmez)
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

  -- Müşterinin açık hesabını güncelle
  update customer_credit set
    outstanding = outstanding + round(v_total_req, 2),
    updated_at  = now()
  where customer_id = v_quote.customer_id;

  return (select row_to_json(q)::jsonb from quotes q where id = p_quote_id);
end;
$$;

