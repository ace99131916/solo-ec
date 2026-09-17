# Solo EC Shop — 跨 session 記憶本
> 新 session 開頭先讀這份；收尾時把「Session  log」補上。本檔只記狀態和決策，不記金鑰。

## 現況（2026-09-17）
- 正式站 `https://solo-ec.vercel.app/` 可開，Supabase 即時讀取正常，綠界**測試模式**付款已驗過。
- 已做完：黑金質感 UI、Hero 輪播、首頁版面後台、知識專欄後台、商品圖片/影片上傳＋畫廊、商品介紹區、商品名/SKU 編輯、頂部公告列後台。
- 金流正式參數還沒換（切換時 `ecpay-create` 的 `payment-stage` 要改正式網域）。

## 待跑 SQL（跑過就打勾）
- [ ] 按 AGENTS.md 順序確認 8 支全跑完（若都跑過可刪此節）

## 待辦
- [ ] 上線驗收清單：已付款回寫、後台出貨狀態機、優惠碼、超賣防護、未登入進 /admin 導走、手機版。
- [ ] 商品佔位圖文換自家正式圖文（`product-images` bucket＋後台）。
- [ ] 綠界換正式 MerchantID/Key/IV＋正式網域切換。

## Session log（新到舊）
- 2026-09-17：頁尾改後台可編輯（簡介/信箱/時間/版權）＋後台入口移至頁尾底；SQL 順序加 footer。
- 2026-09-17：右下角 LINE 浮動客服鈕（連結後台可設，預設隱藏）；SQL 順序加 line-float。
- 2026-09-17：建立 AGENTS.md＋MEMORY.md 跨 session 記憶；頂部公告列改後台可管（59bdf9d，已推）。
- 2026-09-17：商品介紹區（detail_text/detail_images）、商品名編輯、SKU 編輯/停用/刪除。
- 2026-09-16：Hero 改自動輪播＋點圖進商品頁；Banner 圖片改選填；知識專欄後台＋guides 表。
- 2026-09-16：首頁版面後台（site_blocks）＋六區可設定；導覽不換行＋搜尋框縮小。
- 2026-09-16：質感 UI 重設（黑金＋Noto Serif TC＋SVG icon）；修無樣式 dev 問題排查流程。
