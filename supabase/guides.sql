-- =============================================
-- 知識專欄文章管理（JOURNAL / GUIDES）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 之後到 /admin/guides 即可新增 / 修改 / 刪除 / 排序 / 上下架
-- =============================================

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  excerpt text not null default '',
  content text not null default '',
  cover_image text,
  sort int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 預設三篇（跟現有前台示範內容一致，已存在的 slug 不覆蓋）
insert into public.guides (slug, title, excerpt, content, sort, is_active)
values
  ('guide-buy', '新手選購攻略：先看尺寸、材質、震動強度', '第一次購買建議從入門款開始，注意醫用級矽膠與水洗等級。', '（示範內文，上線前請換成自家 SEO 文章。建議每篇 800–1500 字＋3 張圖＋內連到商品。）', 10, true),
  ('guide-care', '清潔與保養：中性清潔＋陰涼收納', '使用前後以專用清潔液清洗、擦乾後收納，避免高溫與混放。', '（示範內文，上線前請換成自家 SEO 文章。建議每篇 800–1500 字＋3 張圖＋內連到商品。）', 20, true),
  ('guide-review', '開箱評測怎麼看：震感、音量、續航', '排行榜僅供參考，實際以個人體感為主，建議看多篇交叉比對。', '（示範內文，上線前請換成自家 SEO 文章。建議每篇 800–1500 字＋3 張圖＋內連到商品。）', 30, true)
on conflict (slug) do nothing;

alter table public.guides enable row level security;

drop policy if exists "pub_read_guides" on public.guides;
create policy "pub_read_guides" on public.guides for select using (is_active or public.is_admin());

drop policy if exists "admin_write_guides" on public.guides;
create policy "admin_write_guides" on public.guides for all using (public.is_admin()) with check (public.is_admin());
