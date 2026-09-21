-- =============================================
-- 專欄頁頂部付款物流說明（後台可改四段文字）
-- 執行位置: Supabase Dashboard > SQL Editor，全選執行一次
-- 之後到 /admin/site → 專欄付款物流說明 即可修改
-- =============================================

alter table public.site_blocks add column if not exists payload jsonb not null default '{}';

insert into public.site_blocks (id, title, subtitle, visible, sort, title_size, theme, payload)
values ('guideinfo', '知識專欄・付款與物流說明', '', true, 0, 'md', 'light',
  '{"payment": "綠界金流：信用卡、ATM 轉帳、超商代碼。訂單成立後自動導向綠界，付款完成由 callback 自動更新為「已付款」。", "shipping": "宅配（本島 60 元，滿 1000 免運）／超商取貨（7-11、全家、萊爾富、OK）。隱密包裝，品名標示「生活用品」。", "returns": "貼身用品拆封恕不退換；瑕疵品 7 日內請拍照聯繫客服換貨。福利品、優惠套組售出恕不退換。", "privacy": "訂單明細不會出現在帳單，帳單顯示為綠界或商城名稱。會員資料僅用於出貨與客服。"}')
on conflict (id) do nothing;
