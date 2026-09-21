-- =============================================
-- 最新資訊（管理者發布公告/新品/活動，前台首頁＋/news 顯示）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 之後到 /admin/news 發布；到 /admin/site → 最新資訊 改標題/小標/開關
-- =============================================

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  excerpt text not null default '',
  content text not null default '',
  cover_image text,
  sort int not null default 0,
  is_active boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.site_blocks (id, title, subtitle, visible, sort, title_size, theme)
values ('news', '最新資訊', '', true, 47, 'md', 'light')
on conflict (id) do nothing;

-- 品牌旗艦館已下架：清掉舊設定列（前台程式同步移除）
delete from public.site_blocks where id = 'brands';

alter table public.news enable row level security;

drop policy if exists "pub_read_news" on public.news;
create policy "pub_read_news" on public.news for select using (is_active or public.is_admin());

drop policy if exists "admin_write_news" on public.news;
create policy "admin_write_news" on public.news for all using (public.is_admin()) with check (public.is_admin());
