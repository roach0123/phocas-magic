// Phocas Magic: content script. Turns the theme on (html.pm-on), tags pages
// and dashboard sections so CSS can target them, and listens for the toolbar
// toggle. Runs at document_start in every frame.
(() => {
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
