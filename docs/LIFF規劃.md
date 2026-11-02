# WIN 講師班 LIFF 綁定規劃（只有規劃，還沒實作）

目標：只有「已付款報名」的人，才會收到 LINE 推播的上課連結。
做法：付款成功後，用 LIFF 取得 LINE userId，綁定到訂單編號。之後由後端用 Messaging API，只推播給已付款的人。

---

## 一、使用者流程

1. 付款成功頁 `/payment?token=…`（PAYUNi 回傳後的頁面）
   - 「下一步 1」按鈕改成「綁定 LINE 接收上課連結」。
   - 按鈕連到 `https://liff.line.me/{LIFF_ID}?token={付款token}`。
2. LIFF 頁 `/liff/bind`（新頁面，放在 Vercel 站 2027course.win-lin.com）
   - `liff.init({ liffId })`。沒登入就呼叫 `liff.login()`。
   - 拿 `liff.getIDToken()`（ID Token，不能直接信任前端給的 userId）。
   - 用 `liff.getFriendship()` 看是否已加 OA 好友。
     - 未加好友：顯示「加入 LINE 官方帳號」按鈕 → `https://line.me/R/ti/p/@dmd9019a`。LIFF 也已開 bot_prompt=aggressive，登入時就會跳出加好友畫面。
   - 把 `{ token, idToken }` POST 到後端 `/api/line/bind`。
3. 後端 `/api/line/bind`
   - 向 LINE 驗證 ID Token：`POST https://api.line.me/oauth2/v2.1/verify`，參數 `id_token`、`client_id = LINE Login Channel ID`。取得 `sub`，也就是 userId。
   - 用 token 查訂單，必須同時符合：
     - `status='paid'`
     - `source` 不是 `win-test-1`，或測試時允許
     - 訂單尚未綁定其他 userId
   - 寫入 `line_user_id`、`line_bound_at`。成功後回「綁定完成」。
   - 同一個 userId 重複綁同一張訂單：回成功（idempotent）。綁到已被別人綁的訂單：回 409。
4. 綁定完成後，用 Push API 立刻推一則「已綁定，上課前會在這裡發送連結」。這則確認訊息必須在對方是好友時才送得到。
5. 開課前推播上課連結
   - 後台腳本或管理 API `/api/line/push-course-link`（Bearer 保護）。
   - 只撈 `status='paid' AND line_user_id IS NOT NULL`，可依場次 `session_code` 篩選。
   - 用 Messaging API `POST https://api.line.me/v2/bot/message/push` 逐一推播，也可以用 multicast（每次最多 500 人）。
   - 記錄 `line_push_status`，避免重複推播。
6. 有付款但沒綁定的人
   - Email 仍照常寄送，信裡附 LIFF 綁定連結。
   - 後台可以列出「已付款未綁定」名單，再人工聯繫。

---

## 二、Elsa 要在 LINE Developers 設定的項目

到 https://developers.line.biz/console/ 操作。

1. Provider
   - 使用（或建立）與 OA @dmd9019a 相同的 Provider，例如「WIN」。
   - 一定要同一個 Provider，同一個人的 userId 才會一致，LIFF 拿到的 userId 才能用在 OA 推播。
2. Messaging API Channel（OA 本身）
   - 先到 LINE Official Account Manager → 設定 → Messaging API → 啟用，並選擇上面那個 Provider。
   - 啟用後 Developers Console 會自動出現這個 Channel。
   - 在 Messaging API 分頁發行 Channel access token（long-lived）。
   - Webhook 可先不開。
3. LINE Login Channel（新建，放在同一個 Provider）
   - App type 選 Web app。
   - 「Linked LINE Official Account」選 @dmd9019a（Basic settings 裡）。
   - 狀態改成 Published。開發中（Developing）的狀態只有管理員能登入。
4. LIFF App（建在 LINE Login Channel 的 LIFF 分頁）
   - Endpoint URL：`https://2027course.win-lin.com/liff/bind`
   - Size：Full
   - Scopes：`openid`、`profile`（不需要 chat_message.write）
   - Add friend option（bot link feature）：On (Aggressive)
   - Scan QR：Off
   - 建好後會得到 LIFF ID，格式像 `1234567890-AbCdEfGh`。
5. 要交給我們的資料
   - 不是機密（可直接貼）：
     - LIFF ID
     - LINE Login Channel ID
   - 機密（請用私訊或密碼管理器交付，不要貼在群組）：
     - Messaging API Channel access token (long-lived)
     - Channel secret（Messaging API）：之後開 webhook 才需要，先不用
   - LINE Login Channel secret：ID Token 驗證用不到。用 verify API 只需要 Channel ID，所以先不用給。

---

## 三、程式／檔案／環境變數／資料庫要改的地方

### Vercel 站（`vercel-win/`）
- `app/payment/page.tsx`：paid 狀態的步驟 1 按鈕改為 LIFF 連結（帶 token），保留 OA 加好友作為備用。
- 新增 `app/liff/bind/page.tsx`（client）：載入 `@line/liff`，執行 init、login、getIDToken、getFriendship，再 POST 到後端。
- `app/api/[...path]/route.ts`：白名單加入 `line/bind`。只允許 POST，並且要檢查 Origin。
- `package.json`：加入 `@line/liff`。
- 環境變數：`NEXT_PUBLIC_LIFF_ID`（Production + Preview）。

### 舊後端（`sites-win-2026-10-18/`，ChatGPT Sites）
- 新增 `app/api/line/bind/route.ts`：驗證 ID Token、檢查訂單已付款、寫入綁定、推一則確認訊息。
- 新增 `app/api/line/push-course-link/route.ts`：Bearer（`LINE_ADMIN_ACCESS`）保護，只推給已付款且已綁定的人。
- 新增 `lib/line.ts`：封裝 verify 與 push、multicast 的呼叫。
- `lib/payuni/server.ts`：付款確認信加一行 LIFF 綁定連結。
- 新增 migration `drizzle/00xx_line_binding.sql`：
  ```sql
  ALTER TABLE payment_orders ADD COLUMN line_user_id TEXT;
  ALTER TABLE payment_orders ADD COLUMN line_bound_at TEXT;
  ALTER TABLE payment_orders ADD COLUMN line_push_status TEXT DEFAULT 'none';
  CREATE INDEX payment_orders_line_user ON payment_orders(line_user_id);
  ```
- 環境變數（Sites secrets）：
  - `LINE_LOGIN_CHANNEL_ID`
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_ADMIN_ACCESS`（自己產生的長隨機字串）
  - `LIFF_URL`（給 email 使用）
- `checks/payment.test.cjs`：新增綁定測試（mock LINE API），涵蓋：
  - 未付款拒絕
  - 錯誤 ID Token 拒絕
  - 重複綁定 idempotent
  - 已被別人綁定回 409

---

## 四、安全與注意事項
- userId 一定要後端用 ID Token 驗證後取得，不能採信前端傳來的 userId。
- token 是付款查詢用的 UUID，只能綁「自己的」已付款訂單。
- 推播只看 DB 的 `status='paid'`（由 PAYUNi notify 驗證寫入），不看前端狀態。
- Messaging API 免費方案每月有則數上限。推播前先看 OA 方案剩餘則數；四場、每人 1～2 則通常夠用。
- 測試建議：
  - 先用 LINE Login Channel 的 Developing 狀態 + 管理員帳號測。
  - 用 NT$1 測試單（source=win-test-1）走完整個綁定流程。
- 上線順序：
  1. 舊後端先發布（DB migration + API）。
  2. 再部署 Vercel 站（LIFF 頁 + 按鈕）。
