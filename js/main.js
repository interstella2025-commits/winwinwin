/* ═══════════ EXPERT TO ENTERPRISE — GSAP 動態編排 ═══════════ */
gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── 工具：把 [data-split] 內文字拆成字元 span ── */
function splitChars(el) {
  const text = el.textContent;
  el.textContent = "";
  const frag = document.createDocumentFragment();
  [...text].forEach(ch => {
    const s = document.createElement("span");
    s.className = "char";
    s.style.display = "inline-block";
    s.style.willChange = "transform";
    s.textContent = ch === " " ? " " : ch;
    frag.appendChild(s);
  });
  el.appendChild(frag);
  return el.querySelectorAll(".char");
}

/* ── 工具：[data-lines] 包上遮罩層 ── */
function wrapLine(el) {
  const inner = document.createElement("span");
  inner.className = "line-inner";
  inner.innerHTML = el.innerHTML;
  const mask = document.createElement("span");
  mask.className = "line-mask";
  mask.appendChild(inner);
  el.innerHTML = "";
  el.appendChild(mask);
  return inner;
}

document.querySelectorAll("[data-lines]").forEach(wrapLine);

/* ── 名人推薦／合作學校：由資料產生卡片（各複製兩份供無縫循環）── */
const ENDORSERS = [
  ["lai", "賴清德", "中華民國第16任總統"],
  ["ma", "馬英九", "第12-13任總統"],
  ["chen", "陳建仁", "第14任副總統"],
  ["wu", "吳敦義", "第13任副總統"],
  ["cheng", "鄭文燦", "行政院副院長"],
  ["chou", "周美青", "台灣第一夫人"],
  ["hou", "侯友宜", "新北市市長"],
  ["huang", "黃珊珊", "台北市副市長"],
  ["garyvee", "GaryVee", "世界社群行銷權威"],
  ["kevin", "Kevin Harrington", "Shark Tank 創業導師"],
  ["blair", "Blair Singer", "美國銷售領導力權威"],
  ["braincha", "Brain Cha", "香港激勵大師"],
  ["amada", "天田幸宏", "日本微創業大師"],
  ["shimizu", "清水健二", "本讚心術大師"],
  ["cn100", "百強培訓師", "中國大陸授證"],
  ["calif", "美國加州大", "榮譽教授授證"],
  ["rotary", "扶輪社社長", "史上最年輕"],
  ["chin", "秦慧珠議員推薦", "當選優秀青年"]
];
const LOGOS = ["stanford", "berkeley", "cambridge", "homerton", "monterey",
  "phillips", "stedmunds", "ucam", "sunderland", "calge", "svri", "iau", "crest"];

function chipHTML(list) {
  return `<span class="emq-chips">` + list.map(([slug, name, title]) =>
    `<span class="chip"><img src="assets/endorse/${slug}.webp" alt="${name}" loading="lazy">` +
    `<span class="chip-cap"><b>${name}</b><i>${title}</i></span></span>`).join("") + `</span>`;
}
function logoHTML() {
  return `<span class="emq-chips">` + LOGOS.map(s =>
    `<span class="chip-logo"><img src="assets/logos/${s}.webp" alt="" loading="lazy"></span>`
  ).join("") + `</span>`;
}
const half = Math.ceil(ENDORSERS.length / 2);
const rowA = ENDORSERS.slice(0, half), rowB = ENDORSERS.slice(half);
const elA = document.getElementById("emqA"),
      elB = document.getElementById("emqB"),
      elL = document.getElementById("emqLogo");
if (elA) elA.innerHTML = chipHTML(rowA) + chipHTML(rowA);
if (elB) elB.innerHTML = chipHTML(rowB) + chipHTML(rowB);
if (elL) elL.innerHTML = logoHTML() + logoHTML();

/* [data-clauses]：把每個 .cl 子句包上遮罩，供逐句揭示 */
document.querySelectorAll("[data-clauses] .cl").forEach(cl => {
  const mask = document.createElement("span");
  mask.className = "cl-mask";
  cl.parentNode.insertBefore(mask, cl);
  mask.appendChild(cl);
});

if (reduced) {
  /* 減少動態：全部直接顯示，僅保留互動邏輯 */
  document.getElementById("loader").style.display = "none";
  stageRailSetup();
  stickyCtaSetup();
} else {
  init();
}

function init() {

  /* ═══ 1. 開場 Loader → Hero ═══ */
  const heroChars = [];
  document.querySelectorAll(".hero-title [data-split], .ht-line[data-split]").forEach(el => {
    heroChars.push(splitChars(el));
  });

  gsap.set(".hero-title .char", { yPercent: 115 });
  gsap.set("[data-reveal]", { autoAlpha: 0, y: 34 });
  gsap.set(".hero-sub .cl", { yPercent: 115 });
  gsap.set(".hero-card", { clipPath: "inset(100% 0% 0% 0%)", yPercent: 8 });
  gsap.set(".hero-card img", { scale: 1.25 });
  gsap.set("#marquee1", { yPercent: 120, rotation: -1.6, scale: 1.03 });

  const intro = gsap.timeline({ defaults: { ease: "power4.out" } });

  intro
    .to(".loader-en", { opacity: 1, duration: .7, ease: "power2.out" })
    .to(".loader-line", { width: "min(52vw, 280px)", duration: .7, ease: "power3.inOut" }, "-=.3")
    .to(".loader-zh", { opacity: 1, duration: .5 }, "-=.35")
    .to({}, { duration: .45 })
    .to(".loader-inner", { yPercent: -30, autoAlpha: 0, duration: .55, ease: "power2.in" })
    .to(".loader-panel", { yPercent: -100, duration: .9, ease: "power4.inOut" }, "-=.15")
    .set("#loader", { display: "none" })
    /* hero 進場 */
    .to(".hero-kicker", { autoAlpha: 1, y: 0, duration: .8 }, "-=.55")
    .to(".hero-title .char", {
      yPercent: 0,
      duration: 1.1,
      stagger: { each: .028, from: "start" },
      ease: "power4.out"
    }, "-=.6")
    .to(".hero-sub .cl", { yPercent: 0, duration: .9, stagger: .1 }, "-=.7")
    .to(".hero-cta-wrap", { autoAlpha: 1, y: 0, duration: .9 }, "-=.55")
    .to(".hero-card", { clipPath: "inset(0% 0% 0% 0%)", yPercent: 0, duration: 1.15, ease: "power4.inOut" }, "-=.9")
    .to(".hero-card img", { scale: 1, duration: 1.4, ease: "power3.out" }, "<")
    .to("#marquee1", { yPercent: 0, rotate: -1.6, scale: 1.03, duration: .8, ease: "power3.out" }, "-=.8");

  /* hero 人物視差 */
  gsap.to("#heroPhoto", {
    yPercent: 10, scale: 1.06,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });
  gsap.to(".hero-top", {
    yPercent: -14, autoAlpha: .25,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "70% top", scrub: true }
  });

  /* ═══ 2. 跑馬燈：無限循環＋滾動變速（data-rev 反向）═══ */
  document.querySelectorAll(".marquee-track").forEach(track => {
    const rev = track.dataset.rev === "1";
    const loop = rev
      ? gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, duration: 26, ease: "none", repeat: -1 })
      : gsap.to(track, { xPercent: -50, duration: 22, ease: "none", repeat: -1 });
    ScrollTrigger.create({
      trigger: track.closest(".marquee") || track.closest(".emq-row"),
      start: "top bottom", end: "bottom top",
      onUpdate: self => {
        const v = Math.min(Math.abs(self.getVelocity()) / 300, 5);
        gsap.to(loop, { timeScale: 1 + v, duration: .4, overwrite: true });
      }
    });
  });

  /* ═══ 3. 通用 reveal（loader 內除外）═══ */
  gsap.utils.toArray("main [data-reveal], .stages [data-reveal]").forEach(el => {
    gsap.fromTo(el, { autoAlpha: 0, y: 34 }, {
      autoAlpha: 1, y: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%" }
    });
  });

  /* 行遮罩揭示 */
  gsap.utils.toArray("main [data-lines]").forEach(el => {
    const inner = el.querySelector(".line-inner");
    gsap.fromTo(inner, { yPercent: 115 }, {
      yPercent: 0, duration: 1.15, ease: "power4.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  /* 子句逐行揭示（hero 由開場動畫處理）*/
  gsap.utils.toArray("main [data-clauses]").forEach(el => {
    const cls = el.querySelectorAll(".cl");
    gsap.fromTo(cls, { yPercent: 115 }, {
      yPercent: 0, duration: .95, ease: "power4.out",
      stagger: .09,
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  /* 「不是…／是…」宣言逐條浮現 */
  gsap.utils.toArray("[data-creed]").forEach((line, i) => {
    gsap.fromTo(line, { autoAlpha: 0, x: -22 }, {
      autoAlpha: 1, x: 0, duration: .7, delay: i * .14, ease: "power3.out",
      scrollTrigger: { trigger: ".creed", start: "top 86%" }
    });
  });

  /* ═══ 4. 宣言三步驟 ═══ */
  gsap.utils.toArray("[data-mf]").forEach((step, i) => {
    gsap.fromTo(step,
      { autoAlpha: 0, x: i % 2 ? 60 : -60 },
      {
        autoAlpha: 1, x: 0, duration: .9, ease: "back.out(1.4)",
        scrollTrigger: { trigger: step, start: "top 88%" }
      });
  });

  /* ═══ 5. 卡片（加碼/診斷）═══ */
  gsap.utils.toArray("[data-card]").forEach((card, i) => {
    gsap.fromTo(card,
      { autoAlpha: 0, y: 70, rotate: i % 2 ? 2.5 : -2.5 },
      {
        autoAlpha: 1, y: 0, rotate: 0, duration: 1, ease: "power3.out",
        delay: (i % 3) * .12,
        scrollTrigger: { trigger: card, start: "top 90%" }
      });
  });

  /* ═══ 6. 痛點清單 ═══ */
  gsap.utils.toArray("[data-pain]").forEach((li, i) => {
    gsap.fromTo(li,
      { autoAlpha: 0, x: i % 2 ? 70 : -70 },
      {
        autoAlpha: 1, x: 0, duration: .85, ease: "power3.out",
        scrollTrigger: { trigger: li, start: "top 92%" }
      });
  });

  /* 24 小時數字 */
  const hours = document.getElementById("hoursNum");
  if (hours) {
    const counter = { n: 0 };
    ScrollTrigger.create({
      trigger: hours, start: "top 88%", once: true,
      onEnter: () => gsap.to(counter, {
        n: 24, duration: 1.4, ease: "power2.out",
        onUpdate: () => hours.textContent = Math.round(counter.n)
      })
    });
  }

  /* ═══ 7. 三階段：橫排一次展開＋右滑引導 ═══ */
  stageRailSetup();

  /* ═══ 8. 複利鏈條 ═══ */
  gsap.fromTo("#chainLine", { scaleY: 0 }, {
    scaleY: 1, ease: "none",
    scrollTrigger: { trigger: "#chain", start: "top 80%", end: "bottom 60%", scrub: true }
  });
  gsap.utils.toArray("[data-chain]").forEach(item => {
    gsap.fromTo(item, { autoAlpha: 0, x: 40 }, {
      autoAlpha: 1, x: 0, duration: .8, ease: "power3.out",
      scrollTrigger: {
        trigger: item, start: "top 82%",
        onEnter: () => item.classList.add("lit"),
      }
    });
  });

  /* ═══ 9. 專業複利引擎 ═══ */
  engineSetup();

  /* ═══ 10. 照片揭示＋內部視差 ═══ */
  gsap.utils.toArray("[data-photo]").forEach(fig => {
    const img = fig.querySelector("img");
    gsap.fromTo(fig, { clipPath: "inset(12% 6% 12% 6%)", autoAlpha: 0 }, {
      clipPath: "inset(0% 0% 0% 0%)", autoAlpha: 1,
      duration: 1.2, ease: "power3.out",
      scrollTrigger: { trigger: fig, start: "top 86%" }
    });
    gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, {
      yPercent: 6, scale: 1.12, ease: "none",
      scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* 講師紅框浮動 */
  const frame = document.querySelector(".mentor-frame");
  if (frame) {
    gsap.fromTo(frame, { x: 0, y: 0 }, {
      x: 14, y: 14, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".mentor-photo-wrap", start: "top 80%" }
    });
  }

  /* 資歷清單 */
  gsap.utils.toArray("[data-cred]").forEach((li, i) => {
    gsap.fromTo(li, { autoAlpha: 0, y: 26 }, {
      autoAlpha: 1, y: 0, duration: .7, delay: i * .1, ease: "power3.out",
      scrollTrigger: { trigger: li, start: "top 92%" }
    });
  });

  /* ═══ 11. 診斷關鍵字 pop ═══ */
  const words = document.querySelectorAll(".df-words span");
  if (words.length) {
    gsap.fromTo(words, { autoAlpha: 0, scale: .5, y: 20 }, {
      autoAlpha: 1, scale: 1, y: 0,
      duration: .6, stagger: .1, ease: "back.out(2.2)",
      scrollTrigger: { trigger: ".df-words", start: "top 90%" }
    });
  }

  /* ═══ 12. Final path pop ═══ */
  const pathItems = document.querySelectorAll(".final-path > *");
  if (pathItems.length) {
    gsap.fromTo(pathItems, { autoAlpha: 0, y: 18 }, {
      autoAlpha: 1, y: 0, duration: .55, stagger: .14, ease: "power3.out",
      scrollTrigger: { trigger: ".final-path", start: "top 90%" }
    });
  }

  stickyCtaSetup();
}

/* ═══ 專業複利引擎（控制台）：通電啟動 + 持續掃描 ═══ */
function engineSetup() {
  const panel = document.getElementById("panel");
  if (!panel) return;
  const body = document.getElementById("panelBody");
  const scan = document.getElementById("scanLine");
  const spine = panel.querySelector(".spine-fill");
  const rows = [...panel.querySelectorAll(".loop-row")];

  const ignite = row => {
    row.classList.add("on");
    row.querySelector(".lr-state").textContent = "運轉中";
  };

  /* 減少動態：直接顯示已啟動狀態 */
  if (reduced) {
    rows.forEach(ignite);
    gsap.set(".lm-bar i", { scaleX: 1 });
    gsap.set(spine, { scaleY: 1 });
    gsap.set(scan, { autoAlpha: 0 });
    return;
  }

  const H = () => body.offsetHeight;
  const BOOT = 4.2;

  /* ① 通電：掃描線由上往下掃，掃到哪一列就點亮哪一列 */
  const boot = gsap.timeline({ scrollTrigger: { trigger: panel, start: "top 76%" } });

  boot.from(panel, { autoAlpha: 0, y: 30, duration: .8, ease: "power3.out" })
      .from(".panel-top > *", { autoAlpha: 0, y: -10, duration: .5, stagger: .12 }, "-=.4")
      .from(rows, { autoAlpha: 0, x: -18, duration: .6, stagger: .09, ease: "power3.out" }, "-=.3")
      .addLabel("boot")
      .fromTo(scan, { y: -160 }, { y: () => H() + 60, duration: BOOT, ease: "none" }, "boot")
      .fromTo(spine, { scaleY: 0 }, { scaleY: 1, duration: BOOT, ease: "none" }, "boot");

  rows.forEach((row, i) => {
    const at = "boot+=" + (BOOT * (i + .55) / rows.length).toFixed(2);
    boot.call(ignite, [row], at);
    boot.to(row.querySelector(".lm-bar i"),
      { scaleX: 1, duration: .85, ease: "power2.out" }, at);
    boot.fromTo(row.querySelector(".lr-name"),
      { color: "#ffffff" }, { color: "#ffffff", duration: .01 }, at);
  });

  /* ② 啟動完成後：掃描線持續巡迴，經過的節點跟著閃一下 */
  boot.eventCallback("onComplete", () => {
    const SWEEP = 5.6;
    const loop = gsap.timeline({ repeat: -1, repeatDelay: 1.4 });
    loop.fromTo(scan, { y: -160 }, { y: () => H() + 60, duration: SWEEP, ease: "none" }, 0);
    rows.forEach((row, i) => {
      const at = SWEEP * (i + .55) / rows.length;
      const node = row.querySelector(".lr-node");
      loop.to(node, { scale: 1.65, duration: .22, ease: "power2.out" }, at)
          .to(node, { scale: 1, duration: .6, ease: "power2.in" }, at + .22);
    });
  });
}

/* ═══ 三階段橫排軌道：進場展開、滑動更新進度、箭頭引導 ═══ */
function stageRailSetup() {
  const rail = document.getElementById("stageRail");
  const hint = document.getElementById("railHint");
  if (!rail) return;
  const cards = [...rail.querySelectorAll(".stage-card")];
  const dots = [...document.querySelectorAll(".sp-dot")];
  const fills = [document.getElementById("spFill"), document.getElementById("spFill2")];

  /* 進場：三張卡由右依序展開 */
  if (!reduced) {
    gsap.fromTo(cards,
      { autoAlpha: 0, x: 70, scale: .94 },
      {
        autoAlpha: 1, x: 0, scale: 1,
        duration: .95, stagger: .13, ease: "power3.out",
        scrollTrigger: { trigger: rail, start: "top 84%" }
      });
  }

  /* 依水平捲動更新進度點與連接線 */
  let moved = false;   /* scroll-snap 載入時的自動對齊不算使用者滑動 */
  ["pointerdown", "touchstart", "wheel", "keydown"].forEach(ev =>
    rail.addEventListener(ev, () => { moved = true; }, { passive: true }));

  const update = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    const p = max > 0 ? rail.scrollLeft / max : 0;
    const idx = p > .66 ? 2 : p > .25 ? 1 : 0;
    dots.forEach((d, i) => d.classList.toggle("on", i <= idx));
    fills.forEach((f, i) => {
      if (f) f.style.transform = `scaleX(${Math.min(1, Math.max(0, p * 2 - i))})`;
    });
    if (hint && moved && rail.scrollLeft > 24) hint.classList.add("gone");
  };
  rail.addEventListener("scroll", update, { passive: true });
  rail.scrollLeft = 0;
  update();

  /* 點箭頭 → 捲到下一張 */
  if (hint) {
    hint.addEventListener("click", () => {
      moved = true;
      const step = cards[0].getBoundingClientRect().width + 16;
      rail.scrollBy({ left: step, behavior: "smooth" });
    });
  }
}

/* ═══ 置底 CTA：過了 hero 出現、進 final 收起 ═══ */
function stickyCtaSetup() {
  const bar = document.getElementById("stickyCta");
  const show = () => gsap.to(bar, { y: 0, yPercent: 0, duration: .55, ease: "power3.out", overwrite: true });
  const hide = () => gsap.to(bar, { yPercent: 110, duration: .45, ease: "power3.in", overwrite: true });

  ScrollTrigger.create({
    trigger: "#gifts", start: "top 70%",
    onEnter: show, onLeaveBack: hide
  });
  ScrollTrigger.create({
    trigger: "#final", start: "top 60%",
    onEnter: hide, onLeaveBack: show
  });

  signupSetup();
}

/* ═══ 報名表單：開關 modal、驗證、送出 ═══ */
function signupSetup() {
  const cfg = window.LP_CONFIG || {};
  const modal = document.getElementById("signupModal");
  const panel = document.getElementById("modalPanel");
  const form = document.getElementById("signupForm");
  const done = document.getElementById("modalDone");
  const btn = document.getElementById("formSubmit");
  const errBox = document.getElementById("formError");
  if (!modal || !form) return;

  /* 若設定了外連網址，CTA 直接開新分頁，不使用站內表單 */
  const ext = (cfg.SIGNUP_URL || "").trim();
  if (ext) {
    document.querySelectorAll(".js-cta").forEach(a => {
      a.setAttribute("href", ext);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    });
    return;
  }

  let lastFocus = null;
  let submitted = false;                       /* 送出過才對空欄位報錯 */
  const touch = window.matchMedia("(hover: none)").matches;
  const focusFirst = () => { if (!touch) document.getElementById("f-name").focus(); };

  const open = e => {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (reduced) {
      focusFirst();
    } else {
      gsap.fromTo(".modal-backdrop", { autoAlpha: 0 }, { autoAlpha: 1, duration: .3 });
      gsap.fromTo(panel,
        { yPercent: 12, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: .5, ease: "power3.out" });
      gsap.fromTo(".modal-head, .signup-form .field, .form-submit",
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: .45, stagger: .06, delay: .12, ease: "power3.out",
          onComplete: focusFirst });
    }
  };

  const close = () => {
    const finish = () => {
      modal.hidden = true;
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    };
    if (reduced) finish();
    else gsap.to(panel, { yPercent: 10, autoAlpha: 0, duration: .28, ease: "power2.in", onComplete: finish });
  };

  document.querySelectorAll(".js-cta").forEach(a => a.addEventListener("click", open));
  modal.querySelectorAll("[data-close]").forEach(el => el.addEventListener("click", close));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !modal.hidden) close();
  });

  /* 驗證 */
  const RULES = {
    name: v => v.trim().length >= 2 || "請輸入至少 2 個字的姓名",
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Email 格式看起來不正確",
    industry: v => !!v || "請選擇你的產業別"
  };
  const check = el => {
    const res = RULES[el.name] ? RULES[el.name](el.value) : true;
    const field = el.closest(".field");
    const msg = field.querySelector(".field-err");
    if (res === true) { field.classList.remove("invalid"); msg.textContent = ""; return true; }
    field.classList.add("invalid"); msg.textContent = res; return false;
  };
  form.querySelectorAll("input, select").forEach(el => {
    /* 尚未填寫且尚未送出過的欄位，離開時不報錯 */
    el.addEventListener("blur", () => {
      if (submitted || el.value.trim()) check(el);
    });
    el.addEventListener("input", () => {
      if (el.closest(".field").classList.contains("invalid")) check(el);
    });
    el.addEventListener("change", () => {
      if (el.value.trim()) check(el);
    });
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    submitted = true;
    errBox.classList.remove("on");

    const fields = [...form.querySelectorAll("input, select")];
    const bad = fields.filter(el => !check(el));
    if (bad.length) {
      bad[0].focus();
      if (!reduced) gsap.fromTo(bad[0].closest(".field"),
        { x: -7 }, { x: 0, duration: .45, ease: "elastic.out(1, .35)" });
      return;
    }

    const endpoint = (cfg.FORM_ENDPOINT || "").trim();
    if (!endpoint) {
      errBox.textContent = "表單尚未串接接收網址，請在 index.html 的設定區填入 FORM_ENDPOINT。";
      errBox.classList.add("on");
      return;
    }

    btn.disabled = true; btn.classList.add("loading");
    try {
      const fd = new FormData(form);          /* 用 FormData 送出，避免 CORS preflight */
      fd.append("source", "EXPERT TO ENTERPRISE LP");
      fd.append("submitted_at", new Date().toISOString());
      const res = await fetch(endpoint, { method: "POST", body: fd });
      if (!res.ok) throw new Error("HTTP " + res.status);

      form.hidden = true;
      document.querySelector(".modal-head").hidden = true;
      done.hidden = false;
      if (!reduced) gsap.fromTo(done,
        { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .5, ease: "power3.out" });
    } catch (err) {
      errBox.textContent = "送出失敗，請稍後再試，或直接來信與我們聯繫。";
      errBox.classList.add("on");
    } finally {
      btn.disabled = false; btn.classList.remove("loading");
    }
  });
}
