-- supabase/migrations/007_auth_hook.sql

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable  -- Sadece okuma yapar
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

-- Hook'a yetki ver
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

