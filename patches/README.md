# 套用首播用的舊後端修改

這份說明給**進得了 ChatGPT Sites 專案**的人。線上後端是：

https://signature-speaker.elsaliao.chatgpt.site

程式必須已經是現在的 **v25**（也就是 10/18 快照再加上 `vercel-win/backend-vercel-bridge.patch`）。這份新的 patch 是疊在 v25 上面，不是疊在最原始的快照上。

檔案：`patches/premiere-sites-v25.patch`

這一支 Git 分支**不會**發布 Sites，也**不會**改 Vercel 正式站、DNS 或金鑰。請不要把 patch 合併進 `win-sites-2026-10-18`，那個分支會自動部署 Vercel 正式站。

## 這份 patch 做這些事

1. 正式課程方案 `fullcourse`，金額固定 **39800**。沒有帶方案的舊報名仍是 **399**。瀏覽器傳來的金額一律不採用。訂單會記下方案代碼（`precourse`、`fullcourse` 或測試的 `test`），之後的信和付款結果頁讀這個代碼，不從金額猜。
2. 首播用自己的場次代碼 `premiere-2026-11-03`。前導課的四個場次不能拿來買正式課程，正式課程也不能拿前導課的場次。
3. 登記入口 `POST /api/premiere/register` 仍在，只存姓名、Email、場次，**不建立訂單**。同一個 Email 再登記一次，只回「已經登記」，**不會再交出原本的進入憑證**。首播頁已經不再呼叫它。`premiere_registrants` 這張表留著，但這次的頁面和匯出都不用它。
4. 正式課程建單**不會**再寫進 `premiere_registrants`。匯出 `GET /api/premiere/export` 改以既有報名表 `applications` 為主（同一個 Email 留最新一筆）。有付 39800 或方案是 `fullcourse` 標「有買」，否則「沒買」。另外一欄寫前導課 399 有沒有付過。要用環境變數 `PREMIERE_EXPORT_TOKEN` 保護。進入時間那條 `POST /api/premiere/attend` 也還在，頁面不再呼叫。
5. 即時訊息 `GET /api/premiere/messages` 誰都可以讀，出廠是空陣列。`POST` 同一路徑會整份取代清單，要帶同一個匯出通行碼，而且必須從網站自己的網址送出。每一則有顯示名稱、頭像、內容、出現秒數、類型（老師公告 `announcement`、學員回饋 `feedback`、一般留言 `note`）。資料在 D1 的 `premiere_messages`。
6. 付款成功信依訂單上的方案分開。NT$399 那封信的內容與寄送方式（含不可重複寄）維持原樣。NT$39,800 用另一封，主旨和內文都標了【待 Elsa 確認】。對不上的方案會寄一封中性的確認信，不會寫成前導課。
7. 付款結果頁 `/payment` 的標題、課程名稱和金額依訂單上的方案。方案來自資料庫裡的訂單，不看網址上的參數。還沒讀到訂單時，不會先顯示 NT$399。

CSV 最後一列有備註：這份名單以既有報名表為主，不使用 `premiere_registrants`。報名和付款若不是同一個 Email，報名那一列會顯示沒買。建單時仍會先寫一筆報名，所以有付款的 Email 會出現在名單裡。

## 套用步驟

1. 打開會發布到上面那個網址的 Sites 專案，確認它已包含 v25 的橋接修改（程式裡找得到 `VERCEL_ORIGIN` 或 `publicOrigin`）。
2. 在那個專案的程式目錄執行：

```bash
patch -p1 --dry-run < premiere-sites-v25.patch
patch -p1 < premiere-sites-v25.patch
```

先看 dry-run。若出現失敗，不要硬套，把失敗的檔名傳回來。

3. 安裝依賴後跑檢查（不會真的扣款或寄信）：

```bash
node checks/payment.test.cjs
node checks/premiere-roster.test.cjs
```

第一個應仍是 17 項通過，用來確認 NT$399 沒被改壞。第二個確認 39800、信件、付款結果頁、只登記不建單，以及 CSV。

4. 在這個專案的 **正式 D1**，先執行 `drizzle/0004_payment_plan.sql`，再執行 `drizzle/0003_premiere_registrants.sql`，然後執行 `drizzle/0005_premiere_messages.sql`。  
   **0004 要先做。** 沒有 `plan` 欄位時，連原本的 NT$399 建單都會失敗。  
   發布程式**不會**自動改表。請在管理資料庫的地方手動執行。  
   不要刪除 `applications`、`payment_orders`。0003 和 0005 用了「若已存在就跳過」。0004 的新增欄位只能執行一次；後面那句把既有的 NT$1 測試單標成 `test`，可以再跑。舊的前導課訂單會被標成 `precourse`。沒跑 0005 時，訊息讀取會是空的，儲存會失敗。

5. 在 Sites 的環境變數新增 `PREMIERE_EXPORT_TOKEN`。值用一長串隨機文字，只放在 Sites，不要寫進程式、不要貼到 Vercel。  
   不要改現有的 `PAYUNI_MER_ID`、`PAYUNI_HASH_KEY`、`PAYUNI_HASH_IV`、`RESEND_API_KEY`、`RESEND_FROM`、`RESEND_REPLY_TO`、`PAYUNI_TEST_ACCESS`。

6. 再發布這個 Sites 專案。發布的是舊後端，不是 Vercel。

## 發布後怎麼確認

- 首頁前導課不帶 `product` 時，訂單金額仍是 399。
- 帶 `product` 為 `fullcourse` 的新訂單，金額是 39800。若付款頁看到 399，不要付款。
- 首播頁不再叫人填登記表。`premiere_registrants` 可以是空的。
- `GET /api/premiere/messages` 回 `{"messages":[]}`，直到負責人在 `/premiere/messages` 儲存。
- 用下面方式下載 CSV（把標示處換成你設的那組字，不要把字存進檔案）：

```bash
curl -H "Authorization: Bearer 這裡換成 PREMIERE_EXPORT_TOKEN 的值" \
  https://signature-speaker.elsaliao.chatgpt.site/api/premiere/export \
  -o roster.csv
```

密碼不對會看到找不到，這是刻意的。這個匯出網址在舊 Sites，不經過 Vercel。

「有買」只認 Email 相同、而且已付款 39800（或方案是 `fullcourse`）的訂單。名單來自既有報名表，不讀 `premiere_registrants`。報名和付款若用了不同 Email，報名那一列會顯示沒買。CSV 最後的「注意」列也寫了這件事。

即時訊息的儲存用同一個通行碼，例如（不要把字存進檔案）：

```bash
curl -H "Authorization: Bearer 這裡換成 PREMIERE_EXPORT_TOKEN 的值" \
  -H "Content-Type: application/json" \
  -H "Origin: https://signature-speaker.elsaliao.chatgpt.site" \
  -d '{"messages":[]}' \
  https://signature-speaker.elsaliao.chatgpt.site/api/premiere/messages
```

從 Vercel 儲存時，瀏覽器會自己帶通行碼。請用 `/premiere/messages`，不必自己打上面這段。

## 確認 39800 之後，才打開 Vercel 的按鈕

回到 Vercel 專案 `win-lecturer-20261018`，把 `PREMIERE_CHECKOUT_ENABLED` 設成 `1` 並重新部署。順序反了時，說明會按鈕會打到還沒更新的後端，可能變成收 399。

## 收 39800 之前還要處理

- NT$399 的付款成功信沒有改。NT$39,800 的信已經換成待確認的句子，主旨和內文都有【待 Elsa 確認】。請 Elsa 改完 `lib/payuni/server.ts` 裡正式課程那一封，再真的收款。
- 跟統一確認單筆 39800 是否可刷、要不要分期。
- 把 patch 裡 `fullcourse` 的商品名稱（目前標成待 Elsa 確認）改成定稿，再發布一次 Sites。商品名稱在 `lib/payuni/core.ts` 的 `PRODUCTS`。Vercel 上只要這些名稱或說明會文案還有「待 Elsa 確認」，付款按鈕就不會打開。
