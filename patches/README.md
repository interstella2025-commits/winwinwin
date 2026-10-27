# 套用首播用的舊後端修改

這份說明給**進得了 ChatGPT Sites 專案**的人。線上後端是：

https://signature-speaker.elsaliao.chatgpt.site

程式必須已經是現在的 **v25**（也就是 10/18 快照再加上 `vercel-win/backend-vercel-bridge.patch`）。這份新的 patch 是疊在 v25 上面，不是疊在最原始的快照上。

檔案：`patches/premiere-sites-v25.patch`

這一支 Git 分支**不會**發布 Sites，也**不會**改 Vercel 正式站、DNS 或金鑰。請不要把 patch 合併進 `win-sites-2026-10-18`，那個分支會自動部署 Vercel 正式站。

## 這份 patch 做三件事

1. 正式課程方案 `fullcourse`，金額固定 **39800**。沒有帶方案的舊報名仍是 **399**。瀏覽器傳來的金額一律不採用。
2. 新的登記入口 `POST /api/premiere/register`。只存姓名、Email、場次，**不建立訂單**。
3. 匯出 `GET /api/premiere/export`。要用環境變數 `PREMIERE_EXPORT_TOKEN` 保護。名單會標「有買」或「沒買」：有買指的是同一個 Email 已付清 39800。另外一欄寫前導課 399 有沒有付過。第一次打開說明會頁時，會記一筆進入時間。

沒有新增寄信程式。付款成功信仍是原本那封「NT$399 前導課」。

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

第一個應仍是 17 項通過，用來確認 NT$399 沒被改壞。第二個確認 39800、只登記不建單，以及 CSV。

4. 在這個專案的 **正式 D1** 執行 `drizzle/0003_premiere_registrants.sql` 的內容。  
   發布程式**不會**自動建立這張新表。請在管理資料庫的地方手動執行。  
   不要刪除 `applications`、`payment_orders`。這份 SQL 用了「若已存在就跳過」，執行兩次也不會清掉資料。

5. 在 Sites 的環境變數新增 `PREMIERE_EXPORT_TOKEN`。值用一長串隨機文字，只放在 Sites，不要寫進程式、不要貼到 Vercel。  
   不要改現有的 `PAYUNI_MER_ID`、`PAYUNI_HASH_KEY`、`PAYUNI_HASH_IV`、`RESEND_API_KEY`、`RESEND_FROM`、`RESEND_REPLY_TO`、`PAYUNI_TEST_ACCESS`。

6. 再發布這個 Sites 專案。發布的是舊後端，不是 Vercel。

## 發布後怎麼確認

- 首頁前導課不帶 `product` 時，訂單金額仍是 399。
- 帶 `product` 為 `fullcourse` 的新訂單，金額是 39800。若付款頁看到 399，不要付款。
- 說明會頁的「登記這場首播」成功後，D1 的 `premiere_registrants` 有一筆，`payment_orders` 不會因此多一筆。
- 用下面方式下載 CSV（把標示處換成你設的那組字，不要把字存進檔案）：

```bash
curl -H "Authorization: Bearer 這裡換成 PREMIERE_EXPORT_TOKEN 的值" \
  https://signature-speaker.elsaliao.chatgpt.site/api/premiere/export \
  -o roster.csv
```

密碼不對會看到找不到，這是刻意的。這個匯出網址在舊 Sites，不經過 Vercel。

「有買」只認 Email 相同、而且已付款 39800 的訂單。登記和付款若用了不同 Email，會被算成沒買。

## 確認 39800 之後，才打開 Vercel 的按鈕

回到 Vercel 專案 `win-lecturer-20261018`，把 `PREMIERE_CHECKOUT_ENABLED` 設成 `1` 並重新部署。順序反了時，說明會按鈕會打到還沒更新的後端，可能變成收 399。

## 收 39800 之前還要處理

- 付款成功信仍寫前導課與 NT$399。請另改 `lib/payuni/server.ts` 的 `sendPaidEmail`。這份 patch 沒有改它。
- 跟統一確認單筆 39800 是否可刷、要不要分期。
- 把 patch 裡 `fullcourse` 的商品名稱（目前標成待 Elsa 確認）改成定稿，再發布一次 Sites。商品名稱在 `lib/payuni/core.ts` 的 `PRODUCTS`。
