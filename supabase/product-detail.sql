-- =============================================
-- 商品介紹區（商品頁下方圖文區，後台可改）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 之後到 /admin/products 每個商品卡片下方的「商品介紹」區編輯
-- =============================================

alter table public.products add column if not exists detail_text text not null default '';
alter table public.products add column if not exists detail_images text[] not null default '{}';
