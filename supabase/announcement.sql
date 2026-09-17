-- =============================================
-- 頂部公告列（網站最上方黑條，後台可改）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 之後到 /admin/site → 頂部公告列 即可改左右兩段文字和顯示開關
-- =============================================

insert into public.site_blocks (id, title, subtitle, visible, sort, title_size, theme)
values ('announcement', '隱密包裝・24H出貨・全館滿千免運', '首購碼 WELCOME100（滿500折100）', true, 5, 'sm', 'dark')
on conflict (id) do nothing;
