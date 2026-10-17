# WIN NT$399 線上體驗課付款

- 保留原 Sites project、公開 audience、D1 綁定及全部原圖／CSS。
- 後端固定商品與金額：WIN 講師班線上90分鐘體驗課，TWD 399。
- 正式端點：https://api.payuni.com.tw/api/upp，版本 2.0；目前開放信用卡付款。
- 後端秘密：PAYUNI_MER_ID、PAYUNI_HASH_KEY（32 bytes）、PAYUNI_HASH_IV（16 bytes）；沿用 RESEND_API_KEY、RESEND_FROM。
- POST /api/payuni/create 驗證欄位／同意／來源，限制每 IP 每分鐘 5 次新建單，以 requestId 去重並保存 applications/payment_orders。
- GET /api/payuni/checkout 只接受隨機 UUID 付款 token，產生簽章／加密的整合式支付表單；前端無法指定收款金額。
- POST /api/payuni/notify 驗證 SHA-256、AES-GCM、商店、單號與金額。僅 TradeStatus=1 標記 paid；已付款不被舊失敗通知覆寫。
- POST /api/payuni/return 僅驗證並導回 /payment；不更新付款狀態。
- GET /api/payuni/status 回傳最少付款狀態並禁止快取，不回傳姓名或聯絡資料。
- 付款確認信在 verified paid 後寄出；寄信失敗保留 paid 資料並回 RETRY 讓金流通知重試；寄信使用訂單固定 Idempotency-Key 和 D1 lease，避免重複通知重寄。
- 原 /api/apply 轉用同一付費建單驗證流程；不再寄未付款的免費申請確認信。舊 applications 保留。
- 新增的 Drizzle migration 只增加付款及限流資料表，不修改原 applications。
- 課程日期與參加方式仍待公布；無課前提醒或行銷排程。

驗證：node checks/payment.test.cjs（測試憑證、記憶體 SQLite、模擬寄信，不會收款或寄真實郵件）；TypeScript；production build；手機 390px 表單無水平溢出。
正式端到端完成付款仍需真人刷卡，並核對 verified notify、D1 paid、結果頁與 Resend Delivered；抵達支付頁不能當成收款成功。
