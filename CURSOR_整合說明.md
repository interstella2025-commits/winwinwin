# EXPERT TO ENTERPRISE — 修改版交付說明

基準：commit `ada67f6`（Add international stage strip and animated footprint map）。
本包是在該基準上完成以下修改後的**完整網站**，可直接取代原專案內容（不含 `.git`）。

## 一、國際舞台區：改為「教育世界足跡定位圖」（`#worldStageV8`）

- 原 `#footprintMap` 動畫足跡地圖 div **已移除**；原對應 JS 有 `if (mapWrap)` 保護會自動跳過，保留未動（`assets/footprint-map.svg` 仍在，確認不用後可刪）
- 原本的**中文城市 chips**（台北/北京/深圳…）保留，作為地圖下方的據點清單
- 新區塊為**純靜態 SVG，零 JavaScript**（手機不會卡）：
  - 底圖 `assets/world-map-v2.png`（自 V3 交付包復原，CSS 提亮）
  - 7 支發光主 pin：台灣（起點・強調圈）、日本、中國、新加坡、英國、紐約、加州（STANFORD·BERKELEY 依據：頁面履歷「史丹佛/柏克萊訪問學者」）
  - 5 支次要小 pin（78%）：泰國、柬埔寨、馬來西亞、印尼、美東 MA
  - **次要 pin A/B 輪替**：A（泰國、印尼）/ B（柬埔寨、馬來西亞）每 5 秒交替淡入淡出；純 CSS `opacity` keyframes（`.ws8-cyc-a/.ws8-cyc-b`）；`prefers-reduced-motion` 時全部常駐；要改回全部常駐 → 刪 `world-stage-v8.css` 的 cycle animation 區塊
  - **發光航線**：6 條從台灣放射的虛線弧線（`.ws8-arc`，雙層 drop-shadow）
  - 手機（≤700px）：完整地圖一張圖、隱藏地圖上的英文標籤（資訊由下方中文 chips 承接）
- 樣式集中在新增檔 `css/world-stage-v8.css`

## 二、贈品三卡（`.gift-cards`）

- 文案對齊定稿：含「這一份的任務就是：…」三行（`.gift-task`）；02 說明修正為「把零散的專業整理成」
- 移除卡片上方的步驟小字帶（`.gift-path`「DIAGNOSE 找出卡點 →…」，HTML+CSS 清除）
- 排版改 flex：文字包進 `.gift-body`、封面 `.gift-cover` 右欄垂直置中；桌面 ≥1024px 封面回到卡片上方（`order:-1`）
- **三張新封面**（修正圖文不符＋統一黑綠品牌色）：
  - `assets/gift-diagnose-v2.png` — 中文副標修正為「專業收入槓桿診斷」
  - `assets/gift-design-v2.png` — 原藍色 → 品牌螢光綠
  - `assets/gift-scale-v2.png` — 原橘紅 → 品牌螢光綠
  - 舊封面檔保留；可編輯原始檔在 `covers-src/`（HTML，改字後以 headless Chrome 820×1025 截圖重出）

## 三、專業複利引擎（`#panel`）

- 移除「通電後無限循環掃描」（效能問題來源）；保留進場通電掃描一次，結束後掃描線淡出
- 新增 CSS hover：滑過 `.loop-row` 該列亮起、節點放大發光、標題轉螢光綠

## 四、三階段卡片（`.stage-card`）

- 移除三行「舊狀態 → 新狀態」對照（`.stage-shift`，HTML+CSS）

## 五、全站文字可讀性

- `--ink-faint`：`#707074` → `#8e8e93`（輔助小字整體提亮一級）
- 移除裝飾性散字標籤：「教育事業足跡」「合作學校」（`.logo-label`，HTML+CSS）
- CTA 說明句 `.cta-note`：12.5px → clamp(14–16px)、色階升為 `--ink-dim`
- 重點句放大：`.final-path`（靠自己賺→…→讓系統持續創造價值）16px → clamp(19–26px)；`.pf-main` 15–18 → 17–21px；宣言 `.mf-tag` 18 → 20px
- 輔助說明升級：引擎列描述 14.5px、媒體卡 caption 13px、宣言副註/引擎副句/三階段內文/贈品內文等 → 13.5–14px
- 微型標籤 9–10px → 11px（運轉中、滑動提示、logo 圖說等）
- 「THE REAL PROBLEM」大標每行加 `text-wrap: balance`，避免任何寬度出現單字孤行

## 版本參數（快取）

- `css/style.css?v=20260818-v11`
- `css/world-stage-v8.css?v=20260818-static7`（新增檔）
- `js/main.js?v=20260817-engine-hover`
