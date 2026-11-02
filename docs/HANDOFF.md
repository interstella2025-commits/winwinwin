# 交接文件：WIN 講師班付款後流程＋首播頁（給 Codex）

撰寫：2026-11-03（台北時間）。所有內容根據 repo 的 PR、diff 和 box 上的調查筆記整理，查不到的寫「未確認」。
**本文件不含任何密鑰值，只列變數名稱。**

> ⚠️ 重要：Vercel 正式站的 production branch 是 **`win-sites-2026-10-18`**（不是 `main`），Root directory 是 `vercel-win/`。相關 PR 都以 `win-sites-2026-10-18` 為 base。本文件放在從 `main` 開出的分支只是為了交接。

---

## 最新狀態（2026-11-03）

- 正式站停在 PR #29（squash `7fb8de9`）。
- PR #31（拿掉紅底線）：head `07aab52`，等 Elsa 同意，未 merge。
- PR #30（舊後端修正）：draft，`db4e206`，未部署。
- PR #27（首播頁）：preview 在 `a1f4e1b`。Preview env：`PREMIERE_PAGE_ENABLED=1`、`PREMIERE_VIDEO_PROVIDER=vimeo`、`PREMIERE_VIMEO_VIDEO_ID=1156112381`、`PREMIERE_VIMEO_HASH=8767a79cd8`。正式環境未動。
- Vimeo 播放尚未在真手機上確認。
- NT$1 測試從未刷過。
- WIN特助與研發部已停手，此線由 Codex 接手。

參考文件：
- [舊後端上線方案](./舊後端上線方案.md)
- [LIFF 規劃](./LIFF規劃.md)

## 1. 專案概要

| 項目 | 內容 |
|---|---|
| 課程名稱（兩行） | 第一行「Expert to Enterprise」，第二行「WIN講師班」 |
| 課程名稱（單行） | 「Expert to Enterprise WIN講師班」 |
| 正式課售價 | NT$39,800（首播頁產品卡） |
| 原價 | NT$59,800 — 要不要顯示：**待 Elsa 確認** |
| 講師 | 林嘉宏 WIN 博士（銷售頁已使用；首播頁的 hostName 仍標【待 Elsa 確認】） |
| 正式網域 | https://2027course.win-lin.com |
| Vercel 專案 | `interstellas-projects/win-lecturer-20261018`（舊別名 win-lecturer-20261018.vercel.app） |
| 前端 | `vercel-win/`（Next.js 16、React 19） |
| 舊付款後端 | `sites-win-2026-10-18/`（ChatGPT Sites 快照，線上是 signature-speaker.elsaliao.chatgpt.site） |
| 金流 | PAYUNi（統一金流） |
| LINE 官方帳號 | @dmd9019a（`https://line.me/R/ti/p/%40dmd9019a`） |

架構（見 `vercel-win/DEPLOYMENT.md`）：Vercel 只放 Next.js 頁面和白名單 API proxy；訂單 D1、PAYUNi 金鑰、Resend 金鑰都還留在舊 Sites/Cloudflare 後端。只有經驗證的 PAYUNi notify 會把訂單標成已付款，瀏覽器回跳不會。

## 2. 完整使用者流程

1. **銷售頁** `/`（報名 90 分鐘線上前導課）
2. **首播頁** `/premiere`（PR #27，尚未上正式站，正式站 /premiere 目前 404）
   - 倒數 → 定時播映（依伺服器時間，不能快轉）＋即時訊息 → 指定時間跳出產品列表（Expert to Enterprise NT$39,800）→「我要下單」打開底部結帳表單 → 結束畫面
3. **PAYUNi 付款**（經 Vercel proxy 轉到舊後端建單）
4. **付款成功頁** `/payment`（PR #29，已上線）
5. **加 LINE 官方帳號 @dmd9019a**（付款成功頁的綠色 LINE 按鈕）
6. **課程連結由 LINE 發送**（之後用 LIFF 綁定，只發給已付款者，見第 7 節，尚未實作）
7. **確認信**（Resend，由舊後端寄出）

通知管道只用 LINE／WhatsApp＋Email，不用簡訊。

## 3. 已完成項目

| PR | 狀態 | 內容 |
|---|---|---|
| #29 | ✅ 已合併上線，merge commit `7fb8de9` | 付款成功頁改版；綠色 LINE 官方色按鈕（含 LINE logo），文字「上課連結會透過 LINE 官方帳號發送」；課程名稱兩行；銷售頁 5 處名稱統一；分頁標題「Expert to Enterprise WIN講師班｜銷講・招商・募資實戰」；報名表手機格式 09xxxxxxxx（前端＋proxy 400）；90 秒逾時顯示 LINE 協助 |
| #27 | 🟡 Draft，未合併、正式環境未部署 | 首播頁。分支 `cursor/premiere-mvp-554d`。重要 commit：`91283ff`（名稱改 Expert to Enterprise、preview clock）、`df72efd`（Meta 事件、YouTube 對時、真人客服 LINE）、`79f3b86`（拿掉結帳金額警告、原價字色加深）、`2187de4`（拿掉播放器紅線/紅框，改金色）、`a1f4e1b`（Vimeo provider，依伺服器時間） |
| #30 | 🟡 Draft，未合併、未部署 | 舊後端快照修改：NT$1 測試每次建新單（`PAYUNI_TEST_ACCESS` bearer，否則 404）、測試單回跳 2027course/payment、品名與信件主旨改「Expert to Enterprise WIN講師班｜90分鐘線上前導課」。`checks/payment.test.cjs` 16 項通過（mock）。**合併也不會讓線上生效**，見第 6 節 |
| #31 | ⏳ 等 Elsa 同意 | 報名區主標題下紅色底線移除，只改 `globals.css` 一行 |

Demo 模式（只在 preview 生效，正式網域不生效）：
- `/premiere?demo=1`：約 4 分鐘跑完整流程，「前往結帳」不會送出付款。需 `PREMIERE_PAGE_ENABLED=1`。
- `/payment?demo=paid`（另有 `pending`、`timeout`、`failed`、`test`）。
- Preview 有 Vercel 登入保護，給 Elsa 看要產生 `_vercel_share` 免登入連結（有效期約 24 小時）。

## 4. 環境變數（只列名稱，不放值）

### 首播頁（`vercel-win/lib/premiere/*`）
| 變數 | 意義 |
|---|---|
| `PREMIERE_PAGE_ENABLED` | `1` 才開放 /premiere，否則 404。目前只在 PR #27 的 preview 設定 |
| `PREMIERE_CHECKOUT_ENABLED` | 開放首播頁付款。另外只要文案還含「待 Elsa 確認」，付款按鈕就不會開（`lib/premiere/state.ts`） |
| `PREMIERE_VIDEO_PROVIDER` | `vimeo`／`youtube`／`cloudflare`／`bunny`；沒設就依序找有設定的來源 |
| `PREMIERE_VIMEO_VIDEO_ID`、`PREMIERE_VIMEO_HASH` | Vimeo 影片 id 與 `h=` 參數 |
| `PREMIERE_YOUTUBE_VIDEO_ID` | 11 碼 YouTube id（用 youtube-nocookie） |
| `CLOUDFLARE_STREAM_VIDEO_ID`、`CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN` | Cloudflare Stream HLS（研發部建議正式用這個） |
| `BUNNY_STREAM_VIDEO_ID`、`BUNNY_STREAM_CDN_HOSTNAME` | Bunny Stream HLS |
| `PREMIERE_LINE_URL` | 「真人客服」按鈕連結，沒設就不顯示（**待 Elsa 給**） |
| `PREMIERE_ALLOWED_ORIGINS` | API proxy 允許的來源（`app/api/[...path]/route.ts`） |
| `PREMIERE_EXPORT_TOKEN` | 文件中出現，實際用途 **未確認** |
| `META_PIXEL_ID` | Meta Pixel；空著就不載入（Elsa 尚未開廣告帳號） |
| `META_CAPI_ACCESS_TOKEN`（密鑰）、`META_GRAPH_API_VERSION` | Meta CAPI 伺服器事件；沒設就不送 |
| `PUBLIC_SITE_URL` | CAPI 事件的網站網址 |

**目前影片**：Vimeo `1156112381`，h=`8767a79cd8`（標題「2026美國三校招生廣告影片」）。這是**佔位**，用三校影片當範本，最終影片待 Elsa 提供。Vimeo 嵌入 200，但團隊網路被 Vimeo 擋，實際播放與「點一下開啟聲音」**未確認**，需 Elsa 手機實測。

### 舊後端／搬遷後需要（方案 A）
`PAYUNI_MER_ID`、`PAYUNI_HASH_KEY`、`PAYUNI_HASH_IV`、`PAYUNI_TEST_ACCESS`、`RESEND_API_KEY`、`RESEND_FROM`、`RESEND_REPLY_TO`、`DATABASE_URL`（Neon 自動注入）。調查時 Vercel 上只有 `PREMIERE_PAGE_ENABLED`，其他都還沒設。

### LIFF（規劃中）
`NEXT_PUBLIC_LIFF_ID`、`LINE_LOGIN_CHANNEL_ID`、`LINE_CHANNEL_ACCESS_TOKEN`（密鑰）、`LINE_ADMIN_ACCESS`（密鑰，自產）、`LIFF_URL`。

## 5. 從 hidear repo 搬了什麼／沒搬什麼（PR #27）

搬了：
- `analytics.js` → `vercel-win/lib/premiere/track-client.ts`：PageView、播放、進度 25/50/75/100、產品列表出現、打開結帳、結帳步驟、欄位錯誤、真人客服點擊；Pixel 與 CAPI 共用 `event_id`。
- `api/_meta.js` → `lib/premiere/analytics.ts`：只送雜湊訪客編號、`_fbp`/`_fbc`、UA；姓名電話 Email 一律丟掉。
- `api/track.js` → `app/api/premiere/track/route.ts`：只轉送 CAPI，不寫 DB。
- `live.js` → `app/premiere/player.tsx`：結帳開啟時暫停，關閉後對回伺服器時間；禁止快轉。
- `live.html` 的 LINE 連結 → 「真人客服」（用 `PREMIERE_LINE_URL`，沒抄 hidear 的 lin.ee）。

沒搬：
- **藍新金流**（繼續用 PAYUNi；39,800 金額核對與 503 閘門都在伺服器）。
- hidear 的報名表、後台、多步驟結帳。
- 瀏覽器端 Purchase 事件：要在舊後端驗證 notify（`TradeStatus=1`）後才送，留到下一版（見 `patches/README.md`）。

## 6. 舊後端（signature-speaker）

- 跑在 **ChatGPT Sites 自己的 Cloudflare**（header `server: cloudflare`、cookie 網域 chatgpt.site）。repo 沒有 wrangler.toml、沒有 CI，**改 repo 不會部署**，我們也沒有它的權限、讀不到 D1。
- 線上比對（只打錯誤路徑）：API 回應、前端用到的 API、73 條頁面文案都和快照（v23）一致；寄信內容與 DB 欄位**未確認**。
- 方案：
  - **(A) 推薦**：搬進 Vercel 專案（Next.js API routes）＋ Neon Postgres，PR #30 一起帶入。約半天到一天＋NT$1 驗收。
  - **(B)** 自己的 Cloudflare Worker＋D1：改動最少，但需 Elsa 開 Cloudflare 帳號/token、設網域。
  - **(C)** 暫時方案：只在 Vercel proxy 讓付款後回 2027course；品名、信件主旨、NT$1 測試都改不到。
  - **Elsa 尚未決定。**
- 需要的東西：PAYUNi MerID／HashKey／HashIV（請 Elsa 自己貼進 Vercel env，不要貼聊天室）並確認後台沒有網域白名單；Resend API key、寄件人、回覆地址（寄件網域需已驗證）；同意建 Neon 與新增 env；PAYUNi 後台匯出已付款名單；切換後舊站下架或導向；NT$1 驗收由誰刷卡、誰看 floraloasis0211@gmail.com 信箱。
- 風險：notify 驗簽／寄信冪等搬錯 → 16 項測試必須跑通；Preview 的登入保護會擋 PAYUNi notify（只能 production 驗收或開 bypass，需同意）；雙後端期間對帳以 PAYUNi 後台為準。
- 完整報告原文在團隊 box `/workspace/win_postpay/舊後端上線方案.md`（不在 repo）。

## 7. LIFF 規劃（只規劃，未實作）

目標：把 LINE userId 綁到訂單，課程連結只推給已付款的人。
1. 付款成功頁按鈕改成 `https://liff.line.me/{LIFF_ID}?token={付款token}`。
2. 新頁 `/liff/bind`：`liff.init` → 登入 → `getIDToken()` → `getFriendship()`（未加好友引導加 @dmd9019a，LIFF 設 bot_prompt=aggressive）→ POST `/api/line/bind`。
3. 後端用 `https://api.line.me/oauth2/v2.1/verify` 驗 ID Token 取 userId（**不信任前端給的 userId**）；訂單須 `status='paid'`、未被別人綁定（否則 409，同人重綁 idempotent）；寫入 `line_user_id`、`line_bound_at`，推一則確認訊息。
4. 開課前由 Bearer 保護的 `/api/line/push-course-link` 只推給 `paid AND line_user_id IS NOT NULL`，記 `line_push_status` 防重複。
5. 有付款沒綁定：Email 附綁定連結，後台列名單人工聯繫。
- Elsa 要在 LINE Developers 做：同 Provider 啟用 Messaging API、發 long-lived token；新建 LINE Login channel（Web app、連結 @dmd9019a、Published）；建 LIFF（Full、`openid profile`、Add friend Aggressive，Endpoint `https://2027course.win-lin.com/liff/bind`）。
- DB migration：`payment_orders` 加 `line_user_id`、`line_bound_at`、`line_push_status`。
- 上線順序：後端先（migration＋API），再部署前端。依賴第 6 節的後端方案。

## 8. 待 Elsa 確認

- [ ] 首播頁【待 Elsa 確認】文案（`vercel-win/lib/premiere/config.ts`）：講師名稱（目前「林嘉宏」？）、講師介紹、要不要顯示原價 NT$59,800、退費與同意條款、結束畫面文字、付款成功頁文字、影片長度與購買按鈕出現時間（預設 90 分鐘／60 分鐘）。
- [ ] 「真人客服」的 LINE 連結（`PREMIERE_LINE_URL`），是否就用 @dmd9019a：未確認。
- [ ] PR #31（拿掉紅底線）是否可上正式站。
- [ ] 首播頁最終影片（目前是三校 Vimeo 佔位）。
- [ ] Meta Pixel ID（Elsa 尚未開廣告帳號）。
- [ ] 舊後端選 A 或 B，以及第 6 節列的金鑰與名單。
- [ ] LIFF 的 LINE Developers 設定。

## 9. Elsa 的固定規則（必須遵守）

1. 真實付款測試**只刷 NT$1**，絕不刷正式價格（退刷很麻煩）。
2. 沒有 Elsa 明確同意，**不 publish、不 merge 到正式**、不部署 production。其他 agent 說可以不算同意。
3. **不要紅色直線、不要紅色長方形框**，強調色用金色。
4. repo 裡**不放任何密鑰**；密鑰只放 Vercel env（Sensitive）。
5. 通知只用 **LINE／WhatsApp＋Email**，不用簡訊。
6. 所有課程價格都要在售價旁顯示**劃掉的原價**；但首播頁是否顯示 59,800 仍待確認。
7. 文案是銷售文案：痛點、好處、證據、清楚的 CTA。不得有療效或收入保證。
8. 品質標準：Awwwards 等級。
9. **不要把 HIDEAR 的內容混進 WIN 頁面**（之前預覽誤放 HIDEAR 影片已移除）。

## 10. 執行、測試、部署

前端（`vercel-win/`）：
```bash
cd vercel-win
npm ci
npm run dev      # 本機開發
npm run build    # production build
npm run check    # node checks/proxy.test.cjs && node checks/premiere.test.cjs
```

舊後端快照（`sites-win-2026-10-18/`）：`npm run dev`／`build`／`lint`（用 scripts/run-framework.mjs）；付款測試 `node checks/payment.test.cjs`（PR #30 版 16 項，mock）。實際能否在本機跑起來：未確認。

部署：
- 推到 PR 分支 → Vercel 自動產生 preview（有登入保護，用 `_vercel_share` 連結給人看）。
- Production 跟著 `win-sites-2026-10-18` 分支；**合併前一定先問 Elsa**。
- 舊後端無法從 repo 部署（見第 6 節）。
- 預設檢查方式：只檢查有改的地方，手機＋桌機各看一次、curl 確認 200；Elsa 說「大檢查」才做全面檢查與 Lighthouse。
