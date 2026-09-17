-- =============================================
-- Banner 圖片改為選填（首頁 Hero 精選卡片只用標題+連結）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- =============================================

alter table public.banners alter column image_url set default '';
update public.banners set image_url = '' where image_url is null;
