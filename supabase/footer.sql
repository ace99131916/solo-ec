-- =============================================
-- 頁尾可設定（品牌簡介 / 信箱 / 客服時間 / 版權列，後台可改）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 之後到 /admin/site → 頁尾設定 即可修改
-- =============================================

alter table public.site_blocks add column if not exists payload jsonb not null default '{}';

insert into public.site_blocks (id, title, subtitle, visible, sort, title_size, theme, payload)
values ('footer', '', '', true, 70, 'sm', 'dark',
  '{"about": ["隱密包裝・品名標示為「生活用品」", "24H 出貨・滿千免運・原廠正貨", "每筆訂單 5% 點數回饋"], "email": "service@example.com", "hours": "客服時間 平日 10:00–18:00", "copyright": "Demo 佔位圖文，上線前請更換・未滿 18 歲請勿瀏覽"}')
on conflict (id) do nothing;
