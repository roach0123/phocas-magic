// Phocas Magic: content script. Turns the theme on (html.pm-on), tags pages
// and dashboard sections so CSS can target them, and listens for the toolbar
// toggle. Runs at document_start in every frame.
(() => {
  // Excluded areas: never touch Phocas administration (/Admin/...) or designer pages
  if (/^\/admin(istration)?(\/|$)|(^|\/)designer(\/|$)/i.test(location.pathname)) return;
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
    if (/^\/admin(istration)?(\/|$)|(^|\/)designer(\/|$)/i.test(location.pathname)) root.classList.remove("pm-on");
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

  // ---------- KPI face ----------
  // Our own typographic layer inside a KPI card: a status pill named from the
  // color, the value split into prefix / number / unit, and a ring for
  // percentages. Phocas' value stays in the DOM (CSS hides it) so React keeps
  // owning it; we mirror it and re-sync whenever it changes. Nothing is
  // invented: the label is the color, the ring is the percentage out of 100.
  const KPI_LABEL = { good: "On track", warn: "Watch", bad: "Needs attention" };
  const kpiTone = (color) => {
    const m = color.match(/\d+(?:\.\d+)?/g);
    if (!m || m.length < 3) return "";
    const [r, g, b] = m.slice(0, 3).map((n) => parseFloat(n) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d < 0.08) return "";
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    if (h < 22 || h >= 330) return "bad";
    if (h < 70) return "warn";
    if (h < 170) return "good";
    return "";
  };
  const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const dressKpi = (w, box, color) => {
    const card = w.querySelector(":scope > .widget-fullscreen");
    const row = box.querySelector(":scope > div");
    if (!card || !row) return;
    const raw = (row.textContent || "").replace(/\s+/g, " ").trim();
    if (!raw) { w.classList.remove("pm-kpi-faced"); return; }
    const m = raw.match(/^([^\d]*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/);
    const pre = m ? m[1].trim() : "";
    const num = m ? m[2] : raw;
    const unit = m ? m[3].trim() : "";
    const tone = kpiTone(color);
    let pct = NaN;
    if (m && /%/.test(unit)) pct = parseFloat(num.replace(/,/g, ""));
    const ring = Number.isFinite(pct) && pct >= 0 && pct <= 100;
    let face = card.querySelector(":scope > .pm-kpi-face");
    if (!face) {
      face = document.createElement("div");
      face.className = "pm-kpi-face";
      face.setAttribute("aria-hidden", "true");
      card.appendChild(face);
    }
    const sig = [tone, raw, color].join("|");
    if (face.dataset.pmSig !== sig) {
      face.dataset.pmSig = sig;
      let html = "";
      if (tone) html += `<span class="pm-kpi-pill">${KPI_LABEL[tone]}</span>`;
      html += '<div class="pm-kpi-value">' +
        (pre ? `<span class="pm-kpi-pre">${escapeHtml(pre)}</span>` : "") +
        `<span class="pm-kpi-num">${escapeHtml(num)}</span>` +
        (unit ? `<span class="pm-kpi-unit">${escapeHtml(unit)}</span>` : "") +
        "</div>";
      if (ring) {
        html += `<svg class="pm-kpi-ring" viewBox="0 0 36 36" style="--pm-kpi-pct:${pct}">` +
          '<circle class="pm-kpi-track" cx="18" cy="18" r="16" pathLength="100"></circle>' +
          '<circle class="pm-kpi-arc" cx="18" cy="18" r="16" pathLength="100"></circle></svg>';
      }
      face.innerHTML = html;
      w.dataset.pmKpiTone = tone || "none";
    }
    w.classList.add("pm-kpi-faced");
  };

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
      dressKpi(w, box, color);
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
    // characterData too: a KPI value that updates in place re-syncs its face
    new MutationObserver(queue).observe(document.body || root, { childList: true, subtree: true, characterData: true });
    // One re-measure after our layout tweaks are in place
    setTimeout(() => window.dispatchEvent(new Event("resize")), 400);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
