-- =============================================
-- Hero 主視覺細項設定（徽章 + 滿額贈）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 之後到 /admin/site → 主視覺 Hero 即可改徽章文字和三格滿額贈
-- （右邊精選卡片是另一張表 banners，到 /admin/banners 管）
-- =============================================

alter table public.site_blocks add column if not exists payload jsonb not null default '{}';

update public.site_blocks
set payload = '{"eyebrow": "9 月購物季・滿千免運", "promos": [{"threshold": "滿1000", "gift": "隱密收納袋"}, {"threshold": "滿1500", "gift": "迷你好禮隨機"}, {"threshold": "滿5000", "gift": "高質感好禮"}]}'
where id = 'hero' and coalesce(payload, '{}') = '{}';
