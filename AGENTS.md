# Solo EC Shop — 專案記憶（每個 session 自動載入）

## 起手式（每次新 session 必做）
1. 先讀 `MEMORY.md` 了解專案現況和上次進度。
2. 結束工作前，把本次變更和待辦更新回 `MEMORY.md`。
3. 回覆一律用繁體中文，簡潔直接。

## 專案
- Next.js 14 + Supabase + 綠界金流（ECPay，目前測試商號模式），中小型購物車。
- 工作目錄：`C:\Users\Ace\Documents\GitHub\solo-ec`（`Default Project` 是舊備份，不要碰）。
- GitHub：`ace99131916/solo-ec`，分支 `main`；正式站 Vercel `solo-ec.vercel.app`（push 即自動部署，約 2 分鐘）。
- Supabase project-ref：`uwunxvgjrgvzsmkzauyc`；正式金流測試卡 `4311-9522-2222-2222`。

## Windows 環境（PowerShell 5.1，注意事項）
- npm 一律用：`& "C:\Program Files\nodejs\npm.cmd" ...`（直接打 `npm` 會被執行原則擋掉）。
- supabase 一律用：`& "$env:APPDATA\npm\supabase.cmd" ...`
- git 不在 PATH，用：`& "C:\Users\Ace\AppData\Local\GitHubDesktop\app-3.6.5\resources\app\git\cmd\git.exe" ...`
- 一次只開一個 dev server；頁面無樣式＋按鈕沒反應＝dev 壞了：關掉所有 dev → 刪 `.next` → 重開 → 瀏覽器 Ctrl+Shift+R。
- 不要用 `Set-Location` 以外的 `cd` 寫法；路徑含空白一律加引號。

## Supabase SQL 執行順序（Dashboard → SQL Editor）
1. `supabase/schema-fixed.sql` → 2. `seed.sql` → 3. `site-blocks.sql` → 4. `hero-settings.sql` →
5. `guides.sql` → 6. `product-detail.sql` → 7. `banners-optional-image.sql` → 8. `announcement.sql` →
9. `line-float.sql` → 10. `footer.sql` → 11. `home-sections.sql`（男女專區列）→ 12. `zone-pins.sql`（各區置頂欄）→ 13. `news.sql`（最新資訊表＋清品牌列）→ 14. `guides-seed5.sql`（5 篇選購文章，可重跑覆蓋）→ 15. `guide-info.sql`（專欄付款物流列）
- 新表還沒建時前台一律用程式內預設值 fallback，站不會壞，後台會提示建表。

## 後台地圖（/admin）
- `site` 首頁版面（公告列/Hero/各區文字大小顏色開關排序）、`banners` Hero 輪播、
- `guides` 知識專欄、`products` 商品＋SKU＋圖片/影片＋商品介紹、`categories`、`coupons`、`members`、`orders`。

## 鐵律
- 絕不把金鑰寫進任何 md / 程式碼 / commit（`.env.local` 已 gitignore）。
- 改完程式先 `npm run build` 通過再推 GitHub；commit 訊息用 `feat:` / `fix:` 開頭繁中簡述。
- Tailwind 設計 tokens：墨黑 ink / 米白 cream / 香檳金 gold，標題 Noto Serif TC，icon 用 SVG 不用 emoji。
