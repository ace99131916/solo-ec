-- =============================================
-- LINE 浮動客服按鈕（右下角固定，後台可設連結）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 之後到 /admin/site → LINE 浮動客服，把標題欄填 LINE 連結並打勾顯示
-- =============================================

insert into public.site_blocks (id, title, subtitle, visible, sort, title_size, theme)
values ('line', '', '', false, 0, 'sm', 'light')
on conflict (id) do nothing;
