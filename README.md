# EXPERT TO ENTERPRISE — 課程銷售頁

林嘉宏 WIN 博士《專業收入升級實戰》一頁式銷售頁。
**純靜態網站**：HTML + CSS + GSAP，無需 build、無需 npm install，直接開 `index.html` 即可。

---

## 1. 檔案結構

```
expert-lp/
├── index.html              ← 全部內容與文案都在這裡
├── css/style.css           ← 設計系統與所有樣式
├── js/
│   ├── main.js             ← GSAP 動畫編排、表單邏輯、推薦名單資料
│   ├── gsap.min.js         ← GSAP 3.15.0（本地檔，不依賴 CDN）
│   ├── ScrollTrigger.min.js
│   └── DrawSVGPlugin.min.js   ← 2025/5 起全面免費，無需授權
└── assets/
    ├── award-stage.jpg     ← 首屏主圖（新加坡 BFG 得獎照）
    ├── ram-charan.jpg      ← 拉姆・查蘭獎（哈佛商業評論）
    ├── win-portrait.jpg    ← 講師形象照
    ├── win-headshot.jpg / win-full-navy.jpg / win-full-grey.jpg  ← 備用照
    ├── endorse/            ← 18 張名人合照（跑馬燈用）
    └── logos/              ← 13 個合作學校 logo（跑馬燈用）
```

---

## 2. 上線前必做：串接表單

打開 `index.html`，捲到底部 `<script>` 的設定區：

```js
window.LP_CONFIG = {
  FORM_ENDPOINT: "",   // ← 填這裡
  SIGNUP_URL: ""
};
```

**`FORM_ENDPOINT`**：接收報名資料的網址。表單以 `POST` + `FormData` 送出，
欄位為 `name` / `email` / `industry` / `source` / `submitted_at`。
可用 Zapier Webhook、Make、Google Apps Script Web App、或自家 API。
*目前留空，送出時會顯示「表單尚未串接」的提示。*

**`SIGNUP_URL`**（選用）：若你想改用現成的 Google 表單，把網址填在這裡，
所有 CTA 就會改成直接開新分頁，站內彈窗表單不啟用。

> 用 Google Apps Script 時記得部署為「任何人皆可存取」，
> 並在 `doPost` 回傳 `ContentService` 輸出，否則會被 CORS 擋下。

---

## 3. 內容怎麼改

| 要改什麼 | 改哪裡 |
|---|---|
| 所有文案 | `index.html`（依 S1~S11 區塊註解尋找） |
| 名人推薦名單 | `js/main.js` 最上方的 `ENDORSERS` 陣列 |
| 合作學校 | `js/main.js` 的 `LOGOS` 陣列 + `assets/logos/` |
| 顏色 / 字級 | `css/style.css` 最上方的 `:root` 變數 |
| 產業別選項 | `index.html` 的 `<select id="f-industry">` |

### ⚠️ 文案排版規則（重要）

本頁採用**「逗點、句點強制斷行」**的排版，**不依賴瀏覽器自動換行**。
每個子句都要用 `<span class="cl">` 包起來，父層加 `data-clauses`：

```html
<p data-clauses>
  <span class="cl">把你的專業，</span>
  <span class="cl">變成市場認得、願意買單、</span>
  <span class="cl">能夠放大的<em>影響力資產</em>。</span>
</p>
```

**新增或修改文案時務必照此拆行**，每行控制在 **12–16 字以內**
（大標題 10–11 字），否則窄螢幕會被擠到自動換行、破壞版面。
`js/main.js` 會自動為每個 `.cl` 包上遮罩，做出「逐句揭示」的進場動畫。

單行標題則用 `data-lines`（整行一個遮罩），不需拆 `.cl`。

---

## 4. 動畫一覽（GSAP + ScrollTrigger）

| 區塊 | 效果 |
|---|---|
| 開場 | Loader 拉線 → 面板上滑 → 標題逐字彈出 → 主圖裁切揭示 |
| Hero | 照片視差、文字隨捲動淡出 |
| 跑馬燈 | 無限循環，**捲動速度越快跑得越快** |
| 全站文字 | 逐句遮罩揭示（`data-clauses` / `data-lines`） |
| 三階段 | 橫排滑動卡片 + 磁吸對齊 + 右側脈衝箭頭引導 |
| 複利引擎 | 控制台通電：掃描光帶由上往下掃過五個模組，掃到哪一列就點亮節點、切換「待機→運轉中」、分段電量條充滿；啟動完成後掃描線持續巡迴 |
| 複利鏈條 | 隨捲動畫線、節點依序點亮 |
| 照片 | 裁切揭示 + 內部視差 |
| 表單 | 彈窗上滑 + 欄位依序浮現 + 錯誤時彈性抖動 |

已支援 `prefers-reduced-motion`：使用者開啟減少動態時，全部動畫停用但功能正常。

---

## 5. 三階段的視覺遞進

STAGE 01 → 02 → 03 刻意做成**越往上越亮**，讓「升級」被看見：

- **01 勞務型**：灰暗、低對比、標題灰字（還被困在勞務裡）
- **02 槓桿型**：背景微亮偏綠、萊姆綠框線、淡光暈
- **03 資產型**：最亮、萊姆綠字、強光暈、邊框最亮

卡片左上角的三段式亮度條（`.stage-meter`）同步顯示進度。
改樣式請找 `css/style.css` 的 `.stage-card[data-stage="0|1|2"]`。

---

## 6. 本機預覽

因為用了 `fetch` 與相對路徑，**請用本機伺服器開啟，不要直接雙擊 index.html**：

```bash
cd expert-lp && python3 -m http.server 8000
```

然後開 http://localhost:8000

---

## 7. 部署

純靜態，整個 `expert-lp/` 資料夾丟上去即可：
Vercel / Netlify / Cloudflare Pages / GitHub Pages / 任何虛擬主機都行。

上線前記得補：
- [ ] `FORM_ENDPOINT` 串接
- [ ] `favicon`
- [ ] OG 分享圖（`<meta property="og:image">`）
- [ ] GA / Meta Pixel 追蹤碼

---

## 8. 頁面區塊順序

1. HERO
2. 痛點 HOOK（最貴的問題…）
3. 痛點清單（…被 24 小時綁住）
4. 定調宣言（你已經證明…＋「不是／是」宣言區塊）
5. 三份加碼內容
6. 三次複利 STAGE 01–03（橫排滑動，亮度遞進）
7. 專業複利法（鏈條）
8. 專業複利引擎（控制台 HUD，五個模組）
9. 講師介紹＋拉姆查蘭獎
10. 名人推薦・合作學校（雙向跑馬燈）
11. 你卡在哪一層（診斷）
12. 最終 CTA

> 先痛點、後解方與 offer——2026/08 依業主要求調整過順序。
> 各區背景在 `--bg` 與 `--bg2` 之間交錯，改順序時記得同步調整，避免相鄰區塊同色黏在一起。

---

## 9. 專業複利引擎（控制台）的設計理由

這一區試過兩版才定案，改動前請先看這段：

- **第一版：圓形繞行圖** — 五張卡圍著同心圓排列。問題是①放射狀構圖沒有閱讀順序，眼睛得自己找號碼；②視覺重量外重內輕，力氣往外散；③卡片壓在環上把圓切碎，「循環」讀不出來；④手機上每張卡只有 47% 寬，中文被壓成六到八字的碎片。
- **第二版（現行）：控制台 HUD** — 五列由上往下堆疊，節奏固定、動線與捲動方向一致，而且滿版寬度讓每個環節能寫完整一句話。

> 概念上要注意：**圓形其實不適合「複利」**——繞一圈回到原點是循環，不是複利。
> 現行版本用「掃描線跑完一輪再從頭開始」表達迴圈，不需要真的畫一個圓。

`.lm-bar` 的電量條**不代表任何真實數據**，它只是「這個環節已啟動」的狀態指示。
若之後要放真實數字，請確認數據來源，不要填假的百分比。
