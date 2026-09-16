# 上線部署手冊（Vercel + Supabase + 綠界）— 一步一步做

> 目標：完整可上線運作。先用「綠界測試參數」跑通，再切正式。

## 0. 你要準備的東西
- [ ] Supabase 帳號（免費即可）：https://supabase.com
- [ ] Vercel 帳號：https://vercel.com
- [ ] 綠界 ECPay 廠商帳號（先用測試商號 `3002607`，正式需自行申請）
- [ ] 一個網域（可用 `xxx.vercel.app` 先上線）

## 1. 建 Supabase（10 分鐘）
1. Supabase Dashboard → New Project → 取名 `solo-ec`，選 region `Northeast Asia (Tokyo)`，設 DB 密碼
2. 左側 SQL Editor → 先貼上 `supabase/schema.sql` 全選 Run → 再貼 `supabase/seed.sql` Run
3. Authentication → Providers → 確認 Email 開啟；若要免驗證快速測試：Authentication → Settings → 關掉 Confirm email（正式務必打開）
4. Storage：schema 已建 `product-images / banners / avatars`（public read，寫入限 admin）
5. 記下 Project Settings → API：`Project URL`、`anon public key`、`service_role key`

## 2. 設第一個管理員
1. 前台 `/login` 註冊一組你自己的 Email
2. Supabase → Table Editor → `profiles` 找到你的 id → `role` 改 `admin`
3. 重登後可進 `/admin`

## 3. 部署到 Vercel（5 分鐘）
1. 把本專案推到 GitHub（private 也可）
2. Vercel → Add New Project → Import 該 repo → Framework 選 Next.js
3. Environment Variables 填：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...（只給 server 用）
ECPAY_MERCHANT_ID=3002607
ECPAY_HASH_KEY=5294y06JbISpM5x9
ECPAY_HASH_IV=v77hoKGio4hakUpy
ECPAY_RETURN_URL=https://xxx.supabase.co/functions/v1/ecpay-callback
ECPAY_CLIENT_BACK_URL=https://你的vercel網址/checkout/result
ECPAY_ENCRYPT_TYPE=1
```
4. Deploy → 拿到 `https://xxx.vercel.app`

## 4. 綠界 Edge Functions（金流）
1. 安裝 Supabase CLI 並 login：`supabase login`、`supabase link --project-ref xxx`
2. 設 secrets：
```
supabase secrets set ECPAY_MERCHANT_ID=3002607 ECPAY_HASH_KEY=5294y06JbISpM5x9 ECPAY_HASH_IV=v77hoKGio4hakUpy ECPAY_RETURN_URL=https://xxx.supabase.co/functions/v1/ecpay-create ECPAY_CLIENT_BACK_URL=https://xxx.vercel.app/checkout/result SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ...
supabase functions deploy ecpay-create
supabase functions deploy ecpay-callback
```
3. 綠界廠商後台 → 付款結果通知 ReturnURL 填上面的 callback；測試卡號用綠界文件（測試：4311-9511-2222-3333 等）
4. 正式切換：把 `ecpay-create/index.ts` 的 `payment-stage` 改 `payment.ecpay.com.tw`＋換正式 MerchantID/Key/IV

> 物流建議：第一版先用「宅配手填＋超商門市手選單」上線（本站已內建），綠界物流需另申請（需門市地圖＋物流訂單 API），等金流跑順再開第二階段。

## 5. 上線前操作測試清單（必跑）
- [ ] 訪客加購物車 → 登入合併 → 結帳（宅配/超商各一筆）
- [ ] 優惠碼 `WELCOME100` 滿500折100、未達門檻不折、同一人重複用被擋
- [ ] 庫存不足擋單（開兩視窗搶同一 SKU，最後一隻應報錯不超賣）
- [ ] 未登入打 `/admin` 被導回 `/`；一般會員打 `/admin` 也被擋
- [ ] 綠界測試付款 → callback 後訂單變 `paid`（若卡住先查 Edge Function Logs＋確認非 localhost）
- [ ] 後台：訂單 待付款→已付款→備貨中→已出貨→已完成；商品上下架/改庫存即時反映前台
- [ ] 手機版排版（導覽橫滑、結帳表單）
- [ ] 18+ 彈窗、隱密包裝文案、退換貨文案已換成自家版本，佔位圖已換

## 常見購物車坑（已預防）
1. 超賣：`place_order` 用 `FOR UPDATE` 鎖 SKU＋扣庫存同一交易
2. 前端改價：以後端 SKU 價格為準，不信任前端傳的金額
3. 優惠券重複：`coupon_claims (coupon_id,user_id)` 唯一＋ `used_count` 計數
4. 購物車遺失：訪客存 localStorage，登入自動 merge 上雲
5. 金流假通知：callback 驗 CheckMacValue，不符直接 400
6. 個資：service_role 只在 server/edge 用，前端只用 anon＋RLS

## 下一步（等你回覆）
1. 店名/主色/分類要定稿嗎？（目前 `lib/shop.ts` 一處改全站）
2. 你 Supabase 建好了嗎？建好把 URL＋anon key 貼我，我幫你對接驗證
3. 綠界要用測試先行還是你已有正式參數？
4. 登入只要 Email 密碼，還是要加 Google 登入？
