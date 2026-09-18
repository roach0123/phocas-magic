// Phocas Magic: content script. Turns the theme on (html.pm-on), tags pages
// and dashboard sections so CSS can target them, and listens for the toolbar
// toggle. Runs at document_start in every frame.
(() => {
  // Excluded area: never touch Phocas administration pages (/Admin/...)
  if (/^\/admin(istration)?(\/|$)/i.test(location.pathname)) return;
  if (window.__phocasMagic) return;
  window.__phocasMagic = true;

  const root = document.documentElement;
  // Default on immediately (no flash of the old theme); storage may turn it off.
  root.classList.add("pm-on");

  const apply = (on) => {
    root.classList.toggle("pm-on", on);
    // Grids and dashboards size themselves from the DOM: let them re-measure.
    window.dispatchEvent(new Event("resize"));
  };

  try {
    chrome.storage.local.get({ enabled: true }, (v) => {
      if (v.enabled === false) apply(false);
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.enabled) apply(changes.enabled.newValue !== false);
    });
  } catch (e) {
    /* running outside the extension (live injection): stay on */
  }

  // ---------- Page type ----------
  const pageType = () => {
    const p = location.pathname.toLowerCase();
    if (p.startsWith("/dashboard")) return "dashboard";
    if (p.startsWith("/query")) return "analytics";
    if (p === "/" || p.startsWith("/home")) return "home";
    return p.split("/")[1] || "home";
  };
  let lastPath = "";
  const tagPage = () => {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    root.dataset.pmPage = pageType();
    if (/^\/admin(istration)?(\/|$)/i.test(location.pathname)) root.classList.remove("pm-on");
    delete root.dataset.pmScrolled;
  };

  // ---------- Dashboard sections without a title ----------
  const tagSections = () => {
    for (const line of document.querySelectorAll(".dashboard-line")) {
      const nd = line.querySelector(":scope > .line-header .name-and-description");
      const untitled = !nd || nd.textContent.trim() === "";
      if (line.classList.contains("pm-untitled") !== untitled) line.classList.toggle("pm-untitled", untitled);
    }
  };

  // ---------- Card cascade index (CSS staggers the arrival fade) ----------
  const tagWidgets = () => {
    let i = 0;
    for (const li of document.querySelectorAll(".dashboard-widget")) {
      if (!li.style.getPropertyValue("--pm-i")) li.style.setProperty("--pm-i", String(Math.min(i, 12)));
      i++;
    }
  };

  // ---------- Scroll-driven states ----------
  // Dashboard header gets a material + hairline once content is under it;
  // grids get .pm-scrolled-x while scrolled sideways (frozen column shadow).
  document.addEventListener("scroll", (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.id === "dashboard-body") {
      const on = t.scrollTop > 2;
      if (("pmScrolled" in root.dataset) !== on) on ? (root.dataset.pmScrolled = "") : delete root.dataset.pmScrolled;
    } else if (t.classList.contains("js-grid-main-body-right")) {
      const grid = t.closest(".js-grid");
      if (grid) grid.classList.toggle("pm-scrolled-x", t.scrollLeft > 0);
    }
  }, { capture: true, passive: true });

  // ---------- Small UX touches ----------
  const touchUp = () => {
    // Widget filter fields had no hint
    for (const inp of document.querySelectorAll(".local-query-control input.form-control:not([placeholder])")) {
      inp.placeholder = "Filter";
    }
    // Cards whose filter box is actually shown reserve room for it in the title row
    for (const w of document.querySelectorAll(".dashboard-widget")) {
      const f = w.querySelector(".local-query-control");
      const visible = !!(f && f.getClientRects().length && getComputedStyle(f).visibility !== "hidden");
      if (w.classList.contains("pm-has-filter") !== visible) w.classList.toggle("pm-has-filter", visible);
    }
    // KPI (single value) widgets: Phocas draws the status as an 18px bottom
    // border in a per-widget color. Tag the card and expose that color.
    for (const view of document.querySelectorAll(".dashboard-widget .widget-query-view.chart")) {
      const box = view.querySelector(":scope > div > div > div");
      const w = view.closest(".dashboard-widget");
      if (!box || !w || view.querySelector(".highcharts-container")) continue;
      const cs = getComputedStyle(box);
      const bw = parseFloat(cs.borderBottomWidth) || 0;
      // read the color only while the stripe is still Phocas' own (our CSS
      // makes it transparent afterwards); re-read if Phocas swaps the class
      const sig = box.className;
      let color = w.dataset.pmKpiSig === sig ? w.style.getPropertyValue("--pm-kpi") : "";
      if (!color && bw >= 6 && !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.borderBottomColor)) {
        color = cs.borderBottomColor;
        w.dataset.pmKpiSig = sig;
      }
      if (!color) {
        // our class already made it transparent: peek without it
        box.classList.remove("pm-kpi-box");
        const c2 = getComputedStyle(box).borderBottomColor;
        box.classList.add("pm-kpi-box");
        if (!/rgba\(0, 0, 0, 0\)|transparent/.test(c2) && bw >= 6) { color = c2; w.dataset.pmKpiSig = sig; }
      }
      if (!color) continue;
      if (!w.classList.contains("pm-kpi")) { w.classList.add("pm-kpi"); box.classList.add("pm-kpi-box"); }
      if (w.style.getPropertyValue("--pm-kpi") !== color) w.style.setProperty("--pm-kpi", color);
    }
    // Conditional formatting: lift the rule color from Phocas' 3px underline
    // element onto its cell (CSS turns it into a soft tint + colored value)
    for (const el of document.querySelectorAll(".conditional-formatting-element")) {
      const td = el.closest("td");
      if (!td) continue;
      const color = el.style.backgroundColor || el.style.background || "";
      if (!color) continue;
      if (td.dataset.pmCf !== color) {
        td.dataset.pmCf = color;
        td.style.setProperty("--pm-cf", color);
        td.classList.add("pm-cf");
      }
    }
    // Column titles: say that a click sorts
    for (const td of document.querySelectorAll(".js-grid-main-title td.sortable:not([data-pm-tip])")) {
      td.dataset.pmTip = "1";
      if (!td.title) td.title = "Click to sort";
    }
  };

  // "/" jumps to the page's search field (like most modern apps)
  const searchField = () =>
    document.querySelector(".query-toolbar input.form-control:not([disabled])") ||
    document.querySelector("#vite-app-root input[placeholder*='Filter' i]") ||
    document.querySelector(".local-query-control input.form-control:not([disabled])");
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const f = searchField();
    if (!f) return;
    e.preventDefault();
    f.focus();
    f.select && f.select();
  });

  let queued = false;
  const tick = () => {
    queued = false;
    tagPage();
    tagSections();
    tagWidgets();
    touchUp();
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(tick);
  };

  const start = () => {
    tick();
    new MutationObserver(queue).observe(document.body || root, { childList: true, subtree: true });
    // One re-measure after our layout tweaks are in place
    setTimeout(() => window.dispatchEvent(new Event("resize")), 400);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
