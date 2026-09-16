-- =============================================
-- Solo B2C 電商 V1.0 — Supabase Schema (Postgres 15)
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行
-- 順序: schema.sql -> seed.sql
-- =============================================

-- 0. 擴充
create extension if not exists "pgcrypto";

-- 1. 輔助函式：是否為管理員 (SECURITY DEFINER 避開 RLS 遞迴)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and coalesce(is_blocked, false) = false
  );
$$;

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 2. profiles (對應 auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  phone text,
  avatar_url text,
  level text not null default 'general' check (level in ('general','vip','blacklist')),
  points int not null default 0 check (points >= 0),
  role text not null default 'member' check (role in ('member','admin')),
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.handle_updated_at();

-- 3. categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  sort int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. products (SPU)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  description text,
  cover_image text,
  images text[] not null default '{}',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  base_price int not null default 0 check (base_price >= 0),
  seo_title text,
  seo_desc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.handle_updated_at();
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_active on public.products(is_active);

-- 5. product_skus
create table if not exists public.product_skus (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku_code text not null unique,
  spec_name text not null default '標準',
  price int not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  safety_stock int not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_skus_updated on public.product_skus;
create trigger trg_skus_updated before update on public.product_skus
  for each row execute function public.handle_updated_at();
create index if not exists idx_skus_product on public.product_skus(product_id);

-- 6. cart_items
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sku_id uuid not null references public.product_skus(id) on delete cascade,
  qty int not null check (qty > 0 and qty <= 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, sku_id)
);
create index if not exists idx_cart_user on public.cart_items(user_id);

-- 7. coupons
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  discount_type text not null check (discount_type in ('fixed','percent')),
  discount_value int not null check (discount_value > 0),
  min_amount int not null default 0,
  usage_limit int, -- null = 無限
  used_count int not null default 0,
  per_user_limit int not null default 1,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.coupon_claims (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique(coupon_id, user_id)
);

-- 8. orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','preparing','shipped','completed','cancelled','refunding','refunded')),
  subtotal int not null default 0,
  discount int not null default 0,
  shipping_fee int not null default 0,
  total int not null default 0 check (total >= 0),
  payment_method text not null default 'ecpay',
  shipping_method text not null default 'home' check (shipping_method in ('home','cvs')),
  recipient_name text,
  recipient_phone text,
  recipient_address text,
  cvs_store_id text,
  cvs_store_name text,
  cvs_store_address text,
  invoice_type text not null default 'personal' check (invoice_type in ('personal','company','carrier')),
  invoice_no text,
  coupon_id uuid references public.coupons(id) on delete set null,
  points_used int not null default 0,
  points_earned int not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.handle_updated_at();
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_no on public.orders(order_no);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sku_id uuid references public.product_skus(id) on delete set null,
  product_name text not null,
  spec_name text not null,
  unit_price int not null,
  qty int not null check (qty > 0),
  subtotal int not null
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- 9. payments / shipments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  merchant_trade_no text not null unique, -- 我方訂單編號(綠界 MerchantTradeNo)
  ecpay_trade_no text,                    -- 綠界 TradeNo
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  amount int not null,
  paid_at timestamptz,
  raw_callback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  status text not null default 'preparing' check (status in ('preparing','shipped','delivered','returned')),
  logistics_id text,
  tracking_no text,
  cvs_store_id text,
  cvs_store_name text,
  cvs_store_address text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

-- 10. points / banners / audit
create table if not exists public.point_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  change_value int not null, -- 正=發放 負=折抵
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_point_user on public.point_logs(user_id);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text,
  sort int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_entity on public.audit_logs(entity, entity_id);

-- 關聯 coupon_claims.order_id -> orders (建立時 orders 還沒建好，故補 FK)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fk_claims_order') then
    alter table public.coupon_claims
      add constraint fk_claims_order foreign key (order_id)
      references public.orders(id) on delete set null;
  end if;
end $$;

-- 11. 下單函式：鎖庫存 + 建單 + 扣庫存 (一人維護也必須防超賣)
create or replace function public.place_order(
  p_user_id uuid,
  p_items jsonb, -- [{"sku_id":"...","qty":2}]
  p_shipping_method text default 'home',
  p_recipient_name text default null,
  p_recipient_phone text default null,
  p_recipient_address text default null,
  p_coupon_code text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_no text;
  v_subtotal int := 0;
  v_discount int := 0;
  v_total int := 0;
  v_coupon_id uuid := null;
  item jsonb;
  v_sku product_skus%rowtype;
  v_qty int;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  v_order_no := to_char(now(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 6));
  v_order_id := gen_random_uuid();

  insert into public.orders(id, order_no, user_id, status, shipping_method, recipient_name, recipient_phone, recipient_address)
  values (v_order_id, v_order_no, p_user_id, 'pending_payment', p_shipping_method, p_recipient_name, p_recipient_phone, p_recipient_address);

  for item in select * from jsonb_array_elements(p_items) loop
    v_qty := (item->>'qty')::int;
    select * into v_sku from public.product_skus where id = (item->>'sku_id')::uuid for update;
    if not found then raise exception 'sku not found'; end if;
    if v_sku.stock < v_qty then raise exception '庫存不足: % 剩 %', v_sku.sku_code, v_sku.stock; end if;

    v_subtotal := v_subtotal + v_sku.price * v_qty;

    insert into public.order_items(order_id, sku_id, product_name, spec_name, unit_price, qty, subtotal)
    select v_order_id, v_sku.id, p.name, v_sku.spec_name, v_sku.price, v_qty, v_sku.price * v_qty
    from public.products p where p.id = v_sku.product_id;

    update public.product_skus set stock = stock - v_qty where id = v_sku.id;
  end loop;

  -- 優惠券(簡版：fixed 或 9折類 percent，percent 存 90 = 9折)
  if p_coupon_code is not null then
    select id into v_coupon_id from public.coupons
    where code = p_coupon_code and is_active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
      and (usage_limit is null or used_count < usage_limit);
    if found then
      select case when discount_type='fixed' then discount_value
        else (v_subtotal * (100 - discount_value) / 100) end
        into v_discount from public.coupons where id = v_coupon_id;
      if v_subtotal < (select min_amount from public.coupons where id = v_coupon_id) then
        v_discount := 0; v_coupon_id := null;
      else
        insert into public.coupon_claims(coupon_id, user_id, order_id)
        values (v_coupon_id, p_user_id, v_order_id)
        on conflict (coupon_id, user_id) do nothing;
        update public.coupons set used_count = used_count + 1 where id = v_coupon_id;
      end if;
    end if;
  end if;

  v_total := greatest(v_subtotal - v_discount, 0) + 60; -- 運費固定60，免運門檻日後加
  update public.orders set subtotal=v_subtotal, discount=v_discount, shipping_fee=60, total=v_total, coupon_id=v_coupon_id
  where id = v_order_id;

  insert into public.payments(order_id, merchant_trade_no, amount)
  values (v_order_id, v_order_no, v_total);

  delete from public.cart_items where user_id = p_user_id;

  return v_order_id;
end $$;

-- 12. RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_skus enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_claims enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.point_logs enable row level security;
alter table public.banners enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
drop policy if exists "profiles_self_rw" on public.profiles;
create policy "profiles_self_rw" on public.profiles
  for all using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

-- 公開讀：分類/商品/SKU/Banner/優惠券
drop policy if exists "pub_read_categories" on public.categories;
create policy "pub_read_categories" on public.categories for select using (is_active or public.is_admin());
drop policy if exists "admin_write_categories" on public.categories;
create policy "admin_write_categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pub_read_products" on public.products;
create policy "pub_read_products" on public.products for select using (is_active or public.is_admin());
drop policy if exists "admin_write_products" on public.products;
create policy "admin_write_products" on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pub_read_skus" on public.product_skus;
create policy "pub_read_skus" on public.product_skus for select using (is_active or public.is_admin());
drop policy if exists "admin_write_skus" on public.product_skus;
create policy "admin_write_skus" on public.product_skus for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pub_read_banners" on public.banners;
create policy "pub_read_banners" on public.banners for select using (is_active or public.is_admin());
drop policy if exists "admin_write_banners" on public.banners;
create policy "admin_write_banners" on public.banners for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pub_read_coupons" on public.coupons;
create policy "pub_read_coupons" on public.coupons for select using (is_active or public.is_admin());
drop policy if exists "admin_write_coupons" on public.coupons;
create policy "admin_write_coupons" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

-- 會員私有：購物車/訂單/點數/領券 (本人+admin)
drop policy if exists "owner_cart" on public.cart_items;
create policy "owner_cart" on public.cart_items for all using (auth.uid()=user_id or public.is_admin()) with check (auth.uid()=user_id or public.is_admin());
drop policy if exists "owner_claims" on public.coupon_claims;
create policy "owner_claims" on public.coupon_claims for all using (auth.uid()=user_id or public.is_admin()) with check (auth.uid()=user_id or public.is_admin());
drop policy if exists "owner_orders" on public.orders;
create policy "owner_orders" on public.orders for all using (auth.uid()=user_id or public.is_admin()) with check (auth.uid()=user_id or public.is_admin());
drop policy if exists "owner_order_items" on public.order_items;
create policy "owner_order_items" on public.order_items for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
drop policy if exists "owner_payments" on public.payments;
create policy "owner_payments" on public.payments for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
drop policy if exists "owner_shipments" on public.shipments;
create policy "owner_shipments" on public.shipments for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
drop policy if exists "owner_points" on public.point_logs;
create policy "owner_points" on public.point_logs for select using (auth.uid()=user_id or public.is_admin());

-- audit_logs：admin 可讀，寫入走 service_role
drop policy if exists "admin_read_audit" on public.audit_logs;
create policy "admin_read_audit" on public.audit_logs for select using (public.is_admin());

-- 13. Storage buckets + policies
insert into storage.buckets (id, name, public)
values ('product-images','product-images', true), ('banners','banners', true), ('avatars','avatars', true)
on conflict (id) do nothing;

drop policy if exists "public read images" on storage.objects;
create policy "public read images" on storage.objects for select using (bucket_id in ('product-images','banners','avatars'));
drop policy if exists "admin write images" on storage.objects;
create policy "admin write images" on storage.objects for all using (public.is_admin()) with check (public.is_admin());
