-- Yara multi-shop, profile, and tenant-isolation migration.
-- Run once in Supabase SQL Editor. Safe to re-run.

-- Columns used by the existing preferred dashboard.
alter table public.orders
  add column if not exists category text not null default 'سایر',
  add column if not exists quantity integer not null default 1,
  add column if not exists tracking_code text;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
create index if not exists businesses_user_id_idx on public.businesses(user_id);
alter table public.businesses enable row level security;
grant select, insert, update, delete on public.businesses to authenticated;
drop policy if exists "Users manage their own businesses" on public.businesses;
create policy "Users manage their own businesses" on public.businesses
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;
drop policy if exists "Users manage their own profile" on public.profiles;
create policy "Users manage their own profile" on public.profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.business_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.business_categories enable row level security;
alter table public.business_categories drop constraint if exists business_categories_user_id_name_key;
drop policy if exists "Sellers can view their own business categories" on public.business_categories;
create policy "Sellers can view their own business categories" on public.business_categories for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Sellers can add their own business categories" on public.business_categories;
create policy "Sellers can add their own business categories" on public.business_categories for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Sellers can delete their own business categories" on public.business_categories;
create policy "Sellers can delete their own business categories" on public.business_categories for delete to authenticated using (auth.uid() = user_id);

-- Add a shop reference while preserving the current single-shop data.
alter table public.orders add column if not exists shop_id uuid references public.businesses(id) on delete cascade;
alter table public.business_categories add column if not exists shop_id uuid references public.businesses(id) on delete cascade;
create unique index if not exists business_categories_shop_name_key on public.business_categories(shop_id, name);

-- Existing accounts receive one default shop; their existing records stay in it.
do $$
declare u record; b_id uuid;
begin
  for u in select distinct user_id from public.orders where user_id is not null
           union select distinct user_id from public.business_categories where user_id is not null
  loop
    select id into b_id from public.businesses where user_id = u.user_id order by created_at limit 1;
    if b_id is null then
      insert into public.businesses(user_id, name) values (u.user_id, 'فروشگاه من') returning id into b_id;
    end if;
    update public.orders set shop_id = b_id where user_id = u.user_id and shop_id is null;
    update public.business_categories set shop_id = b_id where user_id = u.user_id and shop_id is null;
  end loop;
end $$;

-- Create a default shop/profile automatically for new signups.
create or replace function public.yara_create_user_defaults()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(user_id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name','')) on conflict do nothing;
  insert into public.businesses(user_id, name) values (new.id, 'فروشگاه من');
  return new;
end;
$$;
drop trigger if exists yara_auth_user_defaults on auth.users;
create trigger yara_auth_user_defaults after insert on auth.users
  for each row execute procedure public.yara_create_user_defaults();

-- Existing rows remain protected by user_id AND shop_id in the client;
-- RLS remains the final security boundary by user_id.
create index if not exists orders_shop_id_idx on public.orders(shop_id);
create index if not exists business_categories_shop_id_idx on public.business_categories(shop_id);

-- Keep category permissions scoped to authenticated owners.
grant select, insert, delete on public.business_categories to authenticated;
