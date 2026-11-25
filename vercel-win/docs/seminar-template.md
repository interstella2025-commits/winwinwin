# 說明會模板

一份引擎、每個專案一份設定。網址：`/seminar/<代號>`，後台：`/seminar-admin`。

## 開關（全部預設關閉）

| 環境變數 | 作用 |
|---|---|
| `SEMINAR_TEMPLATE_ENABLED=1` | 開放說明會頁與後台。沒設時一律 404，正式站行為不變。 |
| `SEMINAR_STORE=postgres` | 資料寫進資料庫（先執行 `db/migrations/0004_seminar.sql`）。沒設時存在伺服器記憶體，只適合預覽。 |
| `SEMINAR_CHECKOUT_ENABLED=1` | 刷卡模式真的建立 PAYUNi 訂單。還需要 `SEMINAR_STORE=postgres` 與 PAYUNi 金鑰。 |
| `SEMINAR_CARD_TEST_AMOUNT=1` | 訂單金額固定 NT$1。 |
| `SEMINAR_EMAIL_ENABLED=1` | 用 Resend 寄通知。沒設時只記錄，不寄出。 |

後台登入沿用 `ADMIN_PASSWORD`、`ADMIN_SESSION_SECRET`。

## 新增一個專案

1. 複製 `lib/seminar/projects/template.ts`，改成自己的內容，登記在 `lib/seminar/registry.ts` 的 `BUILTIN`。
2. 或在後台選「說明會範本」→「複製成新場次」，再逐頁修改（需要 `SEMINAR_STORE=postgres` 才會永久保存）。

## 可設定的項目

品牌與字標、主標副標、講者與大頭照、主視覺、七個顏色、開始時間與長度、「即將開始」提前幾分鐘、影片（HLS／MP4／Vimeo／YouTube）與章節、筆記重點、預排訊息與「預先準備」標示、常見問題、提問開關與審核、CTA 模式（刷卡／填表／預約／留名單）與所有按鈕文字、價格與原價、方案出現時間與截止時間、下一場、LINE 與 Email、Meta Pixel、九種通知範本。

## 狀態

S0 開放預約 → S1 即將開始 → S2 進行中 → S3 方案出現 → S4 已結束（方案開放中）→ S5 方案截止。不開放重播。

## 示範模式（只在預覽環境有效）

- `?demo=1`：兩分鐘跑完六種狀態。
- `?demo=1&at=S3`：固定在某個狀態。
- `?demo=1&cta=card|form|booking|lead`：換 CTA 模式看效果。

示範資料會標記為示範，數據與匯出預設不計入，也不會觸發通知。
