-- =============================================
-- 各區獨立置頂開關（最新上市 / 男性 / 女性分開勾）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 執行後舊精選自動轉移：最新上市=舊精選；男女置頂=舊精選且分類相符者
-- 之後到商品編輯頁用三顆開關各自控制
-- =============================================

alter table public.products add column if not exists pin_home boolean not null default false;
alter table public.products add column if not exists pin_men boolean not null default false;
alter table public.products add column if not exists pin_women boolean not null default false;

-- 舊精選轉移（只補還沒設過的，避免蓋掉已調好的）
update public.products p
set pin_home = true
where coalesce(p.is_featured, false) = true
  and coalesce(p.pin_home, false) = false
  and coalesce(p.pin_men, false) = false
  and coalesce(p.pin_women, false) = false;

update public.products p
set pin_men = true
from public.categories c
where p.category_id = c.id and c.slug = 'men'
  and coalesce(p.is_featured, false) = true
  and coalesce(p.pin_home, false) = true;

update public.products p
set pin_women = true
from public.categories c
where p.category_id = c.id and c.slug = 'women'
  and coalesce(p.is_featured, false) = true
  and coalesce(p.pin_home, false) = true;
