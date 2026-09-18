// Phocas Magic: personal dimension order for both Analytics apps.
// "Arrange" puts the dimension list into an edit mode (like iOS/macOS lists):
// drag rows by their grip to reorder, "Done" saves. The order is stored per
// database in this browser (localStorage) and re-applied on every visit.
// Reordering uses CSS `order` on the flex list, so neither React (Flex Modes)
// nor jQuery (classic Analytics) sees its DOM moved.
(() => {
  // Excluded area: never touch Phocas administration pages
  if (/^\/administration(\/|$)/i.test(location.pathname)) return;
  if (window.__phocasMagicDimOrder) return;
  window.__phocasMagicDimOrder = true;

  const APPS = [
    {
      // Flex Modes: /analytics/database/<id>/...
      id: "flex",
      list: () => document.querySelector('[class*="-dimensionsList"]'),
      items: (list) => [...list.children].filter((el) => el.matches('[data-testid="base-dimension-item-button"]')),
      separators: (list) => [...list.children].filter((el) => el.matches('[data-testid="group-separator"]')),
      label: (el) => el.getAttribute("aria-label") || el.textContent.trim(),
      toolbarHost: () => document.querySelector('[class*="-searchBoxContainer"]'),
      db: () => (location.pathname.match(/\/analytics\/database\/(\d+)/i) || [])[1],
    },
    {
      // Classic Analytics: /query/database/<id>
      id: "query",
      list: () => document.querySelector("#dimensions"),
      items: (list) => [...list.children].filter((el) => el.matches("div.btn-group[data-dimension]:not([data-company])")),
      separators: () => [],
      label: (el) => el.getAttribute("data-dimension"),
      toolbarHost: () => document.querySelector("#dimensions [data-company]"),
      db: () => (location.pathname.match(/\/query\/database\/(\d+)/i) || [])[1],
    },
  ];

  const key = (app) => `pm-dimorder:${app.id}:${app.db()}`;
  const load = (app) => { try { return JSON.parse(localStorage.getItem(key(app)) || "null"); } catch (e) { return null; } };
  const save = (app, order) => {
    try { order ? localStorage.setItem(key(app), JSON.stringify(order)) : localStorage.removeItem(key(app)); } catch (e) { /* ignore */ }
  };

  let arranging = null; // { app, list }
  let drag = null;

  // Visual order: saved names first (in saved order), anything new keeps its
  // natural position after them.
  const apply = (app, list) => {
    const saved = load(app);
    const items = app.items(list);
    list.classList.toggle("pm-dim-custom", !!saved);
    if (!saved) {
      for (const el of items) el.style.removeProperty("order");
      return;
    }
    const pos = new Map(saved.map((n, i) => [n, i]));
    items.forEach((el, i) => {
      const p = pos.has(app.label(el)) ? pos.get(app.label(el)) : saved.length + i;
      if (el.style.order !== String(p)) el.style.order = String(p);
    });
  };

  const currentOrder = (app, list) =>
    app.items(list)
      .map((el) => ({ el, o: +(el.style.order || 0), i: 0 }))
      .map((x, i) => ({ ...x, i }))
      .sort((a, b) => (a.o - b.o) || (a.i - b.i))
      .map((x) => x.el);

  // ---------- toolbar (Arrange / Done / Reset) ----------
  const ensureToolbar = (app, list) => {
    const host = app.toolbarHost();
    if (!host || host.parentElement.querySelector(":scope > .pm-dim-bar")) return;
    const bar = document.createElement("div");
    bar.className = "pm-dim-bar";
    bar.innerHTML =
      '<button type="button" class="pm-dim-btn pm-dim-arrange" title="Change the order of the dimensions">Arrange</button>' +
      '<button type="button" class="pm-dim-btn pm-dim-reset" title="Back to the default order">Reset order</button>' +
      '<button type="button" class="pm-dim-btn pm-dim-done">Done</button>';
    host.insertAdjacentElement("afterend", bar);
    const stop = (e) => { e.stopPropagation(); };
    bar.addEventListener("mousedown", stop);
    bar.addEventListener("pointerdown", stop);
    bar.querySelector(".pm-dim-arrange").addEventListener("click", (e) => { stop(e); startArrange(app); });
    bar.querySelector(".pm-dim-done").addEventListener("click", (e) => { stop(e); endArrange(true); });
    bar.querySelector(".pm-dim-reset").addEventListener("click", (e) => {
      stop(e);
      save(app, null);
      const l = app.list();
      if (l) apply(app, l);
      endArrange(false);
    });
  };

  const startArrange = (app) => {
    const list = app.list();
    if (!list) return;
    // make the current visual order explicit so dragging has stable numbers
    currentOrder(app, list).forEach((el, i) => { el.style.order = String(i); });
    arranging = { app, list };
    document.documentElement.classList.add("pm-arranging");
    list.classList.add("pm-dim-custom");
  };

  const endArrange = (commit) => {
    if (!arranging) return;
    const { app, list } = arranging;
    if (commit) save(app, currentOrder(app, list).map((el) => app.label(el)));
    arranging = null;
    document.documentElement.classList.remove("pm-arranging");
    apply(app, list);
  };

  // ---------- drag while arranging ----------
  // While arranging, a press anywhere on a row drags it (clicks are
  // swallowed so the dimension isn't opened).
  const rowFor = (target) => {
    if (!arranging) return null;
    const { app, list } = arranging;
    return app.items(list).find((el) => el.contains(target)) || null;
  };

  document.addEventListener("pointerdown", (e) => {
    const row = rowFor(e.target);
    if (!row || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const rows = currentOrder(arranging.app, arranging.list);
    drag = { row, rows, startY: e.clientY, started: false, pointerId: e.pointerId };
  }, true);

  document.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.started) {
      if (Math.abs(e.clientY - drag.startY) < 4) return;
      drag.started = true;
      drag.row.classList.add("pm-dim-lifted");
    }
    // Target slot = number of other rows whose middle is above the pointer
    const others = drag.rows.filter((r) => r !== drag.row);
    let slot = 0;
    for (const r of others) {
      const b = r.getBoundingClientRect();
      if (e.clientY > b.top + b.height / 2) slot++;
    }
    const next = [...others];
    next.splice(slot, 0, drag.row);
    next.forEach((el, i) => { if (el.style.order !== String(i)) el.style.order = String(i); });
    drag.rows = next;
    // keep the list scrolling while dragging near its edges
    const sc = drag.row.closest('[class*="-dimensionsScrollableContainer"], #dimensions');
    if (sc) {
      const b = sc.getBoundingClientRect();
      if (e.clientY < b.top + 24) sc.scrollTop -= 10;
      else if (e.clientY > b.bottom - 24) sc.scrollTop += 10;
    }
  }, true);

  const drop = (e) => {
    if (!drag || (e && e.pointerId !== drag.pointerId)) return;
    drag.row.classList.remove("pm-dim-lifted");
    drag = null;
  };
  document.addEventListener("pointerup", drop, true);
  document.addEventListener("pointercancel", drop, true);
  // swallow clicks/mousedowns on rows while arranging (no navigation, no Phocas drag)
  for (const t of ["click", "mousedown", "dragstart"]) {
    document.addEventListener(t, (e) => {
      if (rowFor(e.target)) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && arranging) endArrange(false); });

  // ---------- keep applied through re-renders ----------
  let queued = false;
  const run = () => {
    queued = false;
    for (const app of APPS) {
      if (!app.db()) continue;
      const list = app.list();
      if (!list) continue;
      ensureToolbar(app, list);
      if (!arranging || arranging.list !== list) apply(app, list);
    }
  };
  const queue = () => { if (!queued) { queued = true; setTimeout(() => requestAnimationFrame(run), 80); } };
  const start = () => {
    run();
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
