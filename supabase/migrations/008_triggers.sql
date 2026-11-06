-- supabase/migrations/008_triggers.sql

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

