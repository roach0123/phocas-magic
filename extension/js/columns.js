// Phocas Magic: drag to reorder grid columns.
// Phocas has no per-view column order, so this is a personal, remembered
// layout: hovering a column title reveals a grip; drag it left/right and drop.
// Every <td> carries its own inline width, so moving whole columns (title,
// summary, body, footer rows together) keeps the frozen/scrolling tables
// aligned. Cells keep their data-index, so sorting, selection, Focus and
// paging still address the right data. Order is saved per page + widget in
// localStorage and re-applied after every Phocas redraw.
(() => {
  if (window.__phocasMagicColumns) return;
  window.__phocasMagicColumns = true;

  const PREFIX = "pm-colorder:";
  const RIGHT = [".js-grid-main-title-right", ".js-grid-main-header-right", ".js-grid-main-body-right", ".js-grid-main-footer-right"];
  const label = (td) => (td.textContent || "").replace(/\s+/g, " ").trim();

  const titleRow = (grid) => {
    const t = grid.querySelector(".js-grid-main-title-right table");
    if (!t || t.rows.length !== 1) return null; // grouped (two-row) headers: leave alone
    return t.rows[0];
  };
  const dataCells = (tr) => [...tr.cells].filter((c) => c.dataset.index != null && c.dataset.index !== "" && +c.dataset.index >= 0);

  const gridKey = (grid) => {
    const widget = grid.closest(".dashboard-widget");
    const name = widget ? label(widget.querySelector(".widget-name-line") || widget) .slice(0, 80) : "query";
    return PREFIX + location.pathname.toLowerCase() + "::" + name;
  };
  const load = (grid) => {
    try { return JSON.parse(localStorage.getItem(gridKey(grid)) || "null"); } catch (e) { return null; }
  };
  const save = (grid, order) => {
    try {
      if (order) localStorage.setItem(gridKey(grid), JSON.stringify(order));
      else localStorage.removeItem(gridKey(grid));
    } catch (e) { /* storage blocked: order just won't persist */ }
  };

  // Current title order as [{index, label}]
  const currentOrder = (grid) => {
    const tr = titleRow(grid);
    return tr ? dataCells(tr).map((td) => ({ index: td.dataset.index, label: label(td) })) : [];
  };

  // Move cells in every right-side row so data-index order == indexOrder
  const applyIndexOrder = (grid, indexOrder) => {
    for (const sel of RIGHT) {
      const table = grid.querySelector(sel + " table");
      if (!table) continue;
      for (const tr of table.rows) {
        const cells = dataCells(tr);
        if (cells.length < 2) continue;
        const byIndex = new Map(cells.map((c) => [c.dataset.index, c]));
        if (!indexOrder.every((i) => byIndex.has(i))) continue;
        const now = cells.map((c) => c.dataset.index);
        if (now.join("|") === indexOrder.join("|")) continue;
        // Insert in order right before the first non-data trailing cell (scroll spacer)
        const anchor = [...tr.cells].find((c) => !cells.includes(c) && c.compareDocumentPosition(cells[cells.length - 1]) & Node.DOCUMENT_POSITION_PRECEDING) || null;
        for (const i of indexOrder) tr.insertBefore(byIndex.get(i), anchor);
      }
    }
  };

  // Saved order is by label (data-index can change when measures change)
  const reapply = (grid) => {
    const saved = load(grid);
    if (!saved || !saved.length) return;
    const cur = currentOrder(grid);
    if (cur.length < 2) return;
    const labels = cur.map((c) => c.label);
    const known = saved.filter((l) => labels.includes(l));
    const rest = labels.filter((l) => !known.includes(l));
    const wanted = [...known, ...rest];
    if (wanted.join("|") === labels.join("|")) return;
    const idxByLabel = new Map(cur.map((c) => [c.label, c.index]));
    applyIndexOrder(grid, wanted.map((l) => idxByLabel.get(l)));
    grid.classList.add("pm-cols-custom");
  };

  // ---------- Grip + drag ----------
  let drag = null;

  const addGrips = (grid) => {
    const tr = titleRow(grid);
    if (!tr) return;
    const cells = dataCells(tr);
    if (cells.length < 2) return;
    for (const td of cells) {
      if (td.querySelector(":scope > .pm-grip")) continue;
      const g = document.createElement("span");
      g.className = "pm-grip";
      g.title = "Drag to move column";
      g.setAttribute("aria-hidden", "true");
      td.prepend(g);
    }
    if (load(grid)) grid.classList.add("pm-cols-custom");
    ensureReset(grid);
  };

  const ensureReset = (grid) => {
    const footer = grid.querySelector(".js-grid-footer");
    if (!footer || footer.querySelector(".pm-cols-reset")) return;
    const b = document.createElement("a");
    b.className = "pm-cols-reset";
    b.textContent = "Reset columns";
    b.title = "Restore Phocas' column order";
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      save(grid, null);
      grid.classList.remove("pm-cols-custom");
      const cur = currentOrder(grid);
      const natural = cur.map((c) => c.index).sort((a, b) => +a - +b);
      applyIndexOrder(grid, natural);
    });
    footer.appendChild(b);
  };

  const onDown = (e) => {
    const grip = e.target.closest && e.target.closest(".pm-grip");
    if (!grip || e.button !== 0) return;
    const td = grip.closest("td");
    const grid = td && td.closest(".js-grid");
    if (!grid) return;
    // Own this gesture: suppress Phocas' mousedown (jQuery UI drag) and the sort click
    e.preventDefault();
    e.stopPropagation();
    const tr = titleRow(grid);
    const cells = dataCells(tr);
    const scroller = grid.querySelector(".js-grid-main-title-right");
    drag = {
      grid, td, tr, cells, scroller,
      startX: e.clientX,
      started: false,
      ghost: null,
      marker: null,
      target: null,
      pointerId: e.pointerId,
    };
    try { grip.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or lost pointer */ }
  };

  const startVisuals = () => {
    const r = drag.td.getBoundingClientRect();
    const ghost = document.createElement("div");
    ghost.className = "pm-col-ghost";
    ghost.textContent = label(drag.td);
    ghost.style.width = Math.max(80, Math.min(240, r.width)) + "px";
    ghost.style.top = r.top + "px";
    ghost.style.left = r.left + "px";
    document.body.appendChild(ghost);
    const marker = document.createElement("div");
    marker.className = "pm-col-marker";
    document.body.appendChild(marker);
    drag.ghost = ghost;
    drag.marker = marker;
    drag.offset = drag.startX - r.left;
    drag.grid.classList.add("pm-col-dragging");
    drag.td.classList.add("pm-col-source");
  };

  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.started) {
      if (Math.abs(e.clientX - drag.startX) < 6) return; // hysteresis
      drag.started = true;
      startVisuals();
    }
    drag.ghost.style.left = e.clientX - drag.offset + "px";
    // Drop slot: nearest boundary between visible title cells
    let best = null;
    for (let i = 0; i <= drag.cells.length; i++) {
      const ref = drag.cells[Math.min(i, drag.cells.length - 1)].getBoundingClientRect();
      const x = i < drag.cells.length ? ref.left : ref.right;
      const d = Math.abs(e.clientX - x);
      if (!best || d < best.d) best = { i, x, d };
    }
    drag.target = best.i;
    const gr = drag.grid.querySelector(".js-grid-main").getBoundingClientRect();
    const sr = drag.scroller.getBoundingClientRect();
    const x = Math.max(sr.left, Math.min(sr.right, best.x));
    drag.marker.style.left = x - 1 + "px";
    drag.marker.style.top = gr.top + "px";
    drag.marker.style.height = gr.height + "px";
    // Auto-scroll the grid when dragging near its edges
    const body = drag.grid.querySelector(".js-grid-main-body-right");
    if (body) {
      if (e.clientX > sr.right - 30) body.scrollLeft += 12;
      else if (e.clientX < sr.left + 30) body.scrollLeft -= 12;
    }
  };

  const finish = (e) => {
    if (!drag || (e && e.pointerId !== drag.pointerId)) return;
    const d = drag;
    drag = null;
    if (d.ghost) d.ghost.remove();
    if (d.marker) d.marker.remove();
    d.grid.classList.remove("pm-col-dragging");
    d.td.classList.remove("pm-col-source");
    if (!d.started || d.target == null) return;
    const order = d.cells.map((c) => c.dataset.index);
    const from = order.indexOf(d.td.dataset.index);
    let to = d.target;
    if (to > from) to -= 1;
    if (to === from) return;
    order.splice(from, 1);
    order.splice(to, 0, d.td.dataset.index);
    applyIndexOrder(d.grid, order);
    const labels = currentOrder(d.grid).map((c) => c.label);
    save(d.grid, labels);
    d.grid.classList.add("pm-cols-custom");
    // brief settle highlight on the moved column
    const moved = d.grid.querySelectorAll(`td[data-index="${d.td.dataset.index}"]`);
    moved.forEach((c) => c.classList.add("pm-col-moved"));
    setTimeout(() => moved.forEach((c) => c.classList.remove("pm-col-moved")), 700);
  };

  // Clicks on the grip must never sort
  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest(".pm-grip")) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  document.addEventListener("pointerdown", onDown, true);
  document.addEventListener("pointermove", onMove, true);
  document.addEventListener("pointerup", finish, true);
  document.addEventListener("pointercancel", finish, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drag) {
      drag.target = null;
      finish();
    }
  });

  // ---------- Keep grips + saved order after every Phocas redraw ----------
  let queued = false;
  const run = () => {
    queued = false;
    if (drag) return;
    for (const grid of document.querySelectorAll(".js-grid")) {
      try {
        reapply(grid);
        addGrips(grid);
      } catch (err) { /* never break the grid */ }
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    setTimeout(() => requestAnimationFrame(run), 60);
  };
  const start = () => {
    run();
    new MutationObserver((muts) => {
      // our own moves are childList changes too; run() is idempotent so this settles
      queue();
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
