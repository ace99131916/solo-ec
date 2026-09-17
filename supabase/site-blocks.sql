-- =============================================
-- 首頁區塊可設定（完整編輯器底層）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 之後到 /admin/site 即可調整每區文字、大小、顏色、開關、排序
-- =============================================

create table if not exists public.site_blocks (
  id text primary key,
  title text not null default '',
  subtitle text not null default '',
  visible boolean not null default true,
  sort int not null default 0,
  title_size text not null default 'md' check (title_size in ('sm','md','lg')),
  theme text not null default 'light' check (theme in ('light','dark','gold')),
  updated_at timestamptz not null default now()
);

-- 預設六區（IF NOT EXISTS 邏輯：已存在的列不覆蓋店主改過的內容）
insert into public.site_blocks (id, title, subtitle, visible, sort, title_size, theme)
values
  ('hero', '探索你的心動頻率', '每日出貨・匿名包裝・每筆訂單 5% 點數回饋・原廠正貨保固。', true, 10, 'lg', 'dark'),
  ('categories', '熱門分類', '', true, 20, 'md', 'light'),
  ('featured', '本週 TOP 推薦', '', true, 30, 'md', 'light'),
  ('brands', '品牌旗艦館', '原廠正貨・分區選購更快', true, 40, 'md', 'dark'),
  ('guides', '選購知識專欄', '', true, 50, 'md', 'light'),
  ('trust', '購物保障', '', true, 60, 'sm', 'light')
on conflict (id) do nothing;

alter table public.site_blocks enable row level security;

drop policy if exists "pub_read_site_blocks" on public.site_blocks;
create policy "pub_read_site_blocks" on public.site_blocks for select using (true);

drop policy if exists "admin_write_site_blocks" on public.site_blocks;
create policy "admin_write_site_blocks" on public.site_blocks for all using (public.is_admin()) with check (public.is_admin());
