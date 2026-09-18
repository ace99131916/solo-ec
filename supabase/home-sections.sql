-- =============================================
-- 首頁男性/女性專區（後台可改標題/英文小標/開關）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 商品自動抓各分類最新 4 件（含首圖），之後到 /admin/site 改文字
-- =============================================

insert into public.site_blocks (id, title, subtitle, visible, sort, title_size, theme)
values
  ('men', '男性專區', '', true, 45, 'md', 'light'),
  ('women', '女性專區', '', true, 46, 'md', 'light')
on conflict (id) do nothing;
