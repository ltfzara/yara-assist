-- Yara Finance Phase 1: additive, shop-scoped schema.
-- Safe to run after the existing yara-preferred-ui-migration.sql.
-- Does not rewrite or delete existing orders. Legacy order costs remain unknown.

create table if not exists public.shop_settings (
  shop_id uuid primary key references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_code text not null default 'IRR' check (currency_code in ('IRR','USD','EUR','TRY','AED')),
  currency_symbol text not null default 'تومان',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 140),
  sku text,
  category text,
  sourcing_type text not null default 'buy' check (sourcing_type in ('buy','make','both')),
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  purchase_cost numeric(14,2) not null default 0 check (purchase_cost >= 0),
  production_cost numeric(14,2) not null default 0 check (production_cost >= 0),
  packaging_cost numeric(14,2) not null default 0 check (packaging_cost >= 0),
  labor_minutes numeric(10,2) not null default 0 check (labor_minutes >= 0),
  labor_hourly_rate numeric(14,2) not null default 0 check (labor_hourly_rate >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, sku)
);

-- Historical unit-cost snapshots belong to each order line, not the live catalog.
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.businesses(id) on delete cascade,
  -- order_id is added below using the exact existing public.orders.id type.
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_sale_price numeric(14,2) not null check (unit_sale_price >= 0),
  unit_purchase_cost numeric(14,2) not null default 0 check (unit_purchase_cost >= 0),
  unit_production_cost numeric(14,2) not null default 0 check (unit_production_cost >= 0),
  unit_packaging_cost numeric(14,2) not null default 0 check (unit_packaging_cost >= 0),
  unit_labor_cost numeric(14,2) not null default 0 check (unit_labor_cost >= 0),
  cost_recorded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 140),
  amount numeric(14,2) not null check (amount > 0),
  category text not null default 'other' check (category in ('purchase','production','packaging','shipping','commission','advertising','fixed','salary','internet','equipment','other')),
  expense_type text not null default 'fixed' check (expense_type in ('fixed','variable')),
  expense_date date not null default current_date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Shipping paid by seller, shipping collected from customer, and commission are separate.
alter table public.orders
  add column if not exists shipping_cost numeric(14,2) not null default 0 check (shipping_cost >= 0),
  add column if not exists shipping_charged numeric(14,2) not null default 0 check (shipping_charged >= 0),
  add column if not exists commission_amount numeric(14,2) not null default 0 check (commission_amount >= 0),
  add column if not exists financial_cost_status text not null default 'unknown'
    check (financial_cost_status in ('unknown','recorded','estimated'));

-- Detect the existing orders.id type instead of assuming the legacy schema's key type.
do $$
declare id_type text; id_sql text;
begin
  select udt_name into id_type
  from information_schema.columns
  where table_schema='public' and table_name='orders' and column_name='id';
  if id_type is null then
    raise exception 'Could not find public.orders.id; stop migration and inspect the existing schema.';
  end if;
  id_sql := case id_type
    when 'uuid' then 'uuid'
    when 'int8' then 'bigint'
    when 'int4' then 'integer'
    when 'text' then 'text'
    when 'varchar' then 'varchar'
    when 'bpchar' then 'char'
    else null
  end;
  if id_sql is null then
    raise exception 'Unsupported public.orders.id type (%). Inspect schema before continuing.', id_type;
  end if;
  execute format('alter table public.order_items add column if not exists order_id %s', id_sql);
  if not exists (select 1 from pg_constraint where conname='order_items_order_id_fkey' and conrelid='public.order_items'::regclass) then
    alter table public.order_items add constraint order_items_order_id_fkey
      foreign key (order_id) references public.orders(id) on delete cascade;
  end if;
  alter table public.order_items alter column order_id set not null;
end $$;

create index if not exists products_shop_active_idx on public.products(shop_id, is_active);
create index if not exists order_items_shop_order_idx on public.order_items(shop_id, order_id);
create index if not exists expenses_shop_date_idx on public.expenses(shop_id, expense_date desc);

alter table public.shop_settings enable row level security;
alter table public.products enable row level security;
alter table public.order_items enable row level security;
alter table public.expenses enable row level security;

grant select, insert, update, delete on public.shop_settings to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;

drop policy if exists "Shop owners manage shop settings" on public.shop_settings;
create policy "Shop owners manage shop settings" on public.shop_settings for all to authenticated
using (auth.uid() = user_id and exists (select 1 from public.businesses b where b.id = shop_id and b.user_id = auth.uid()))
with check (auth.uid() = user_id and exists (select 1 from public.businesses b where b.id = shop_id and b.user_id = auth.uid()));

drop policy if exists "Shop owners manage products" on public.products;
create policy "Shop owners manage products" on public.products for all to authenticated
using (auth.uid() = user_id and exists (select 1 from public.businesses b where b.id = shop_id and b.user_id = auth.uid()))
with check (auth.uid() = user_id and exists (select 1 from public.businesses b where b.id = shop_id and b.user_id = auth.uid()));

drop policy if exists "Shop owners manage expenses" on public.expenses;
create policy "Shop owners manage expenses" on public.expenses for all to authenticated
using (auth.uid() = user_id and exists (select 1 from public.businesses b where b.id = shop_id and b.user_id = auth.uid()))
with check (auth.uid() = user_id and exists (select 1 from public.businesses b where b.id = shop_id and b.user_id = auth.uid()));

drop policy if exists "Shop owners manage order items" on public.order_items;
create policy "Shop owners manage order items" on public.order_items for all to authenticated
using (auth.uid() = user_id
  and exists (select 1 from public.businesses b where b.id = order_items.shop_id and b.user_id = auth.uid())
  and exists (select 1 from public.orders o where o.id = order_items.order_id and o.shop_id = order_items.shop_id and o.user_id = auth.uid())
  and (order_items.product_id is null or exists (
    select 1 from public.products p
    where p.id = order_items.product_id
      and p.shop_id = order_items.shop_id
      and p.user_id = auth.uid()
  )))
with check (auth.uid() = user_id
  and exists (select 1 from public.businesses b where b.id = order_items.shop_id and b.user_id = auth.uid())
  and exists (select 1 from public.orders o where o.id = order_items.order_id and o.shop_id = order_items.shop_id and o.user_id = auth.uid())
  and (order_items.product_id is null or exists (
    select 1 from public.products p
    where p.id = order_items.product_id
      and p.shop_id = order_items.shop_id
      and p.user_id = auth.uid()
  )));

-- Initialize per-shop settings without changing existing shop or order records.
insert into public.shop_settings(shop_id, user_id, currency_code, currency_symbol)
select b.id, b.user_id, 'IRR', 'تومان'
from public.businesses b
on conflict (shop_id) do nothing;

comment on table public.order_items is 'Line items with immutable-at-sale cost snapshots. Legacy orders are intentionally not backfilled.';
comment on column public.orders.financial_cost_status is 'unknown for legacy orders until historical costs are explicitly recorded.';
