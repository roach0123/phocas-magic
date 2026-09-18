// Phocas Magic: inline data bars. In every js-grid, the sorted numeric column
// gets a faint bar behind
// each value, scaled to the largest value on the page. Only a class and a CSS
// variable are set on the <td>; nothing about cell size changes.
(() => {
  if (window.__phocasMagicBars) return;
  window.__phocasMagicBars = true;

  const parse = (text) => {
    let t = (text || "").trim();
    if (!t) return null;
    const neg = /^\(.*\)$/.test(t) || /^-/.test(t) || /-$/.test(t);
    t = t.replace(/[^0-9.]/g, "");
    if (!t || t === ".") return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? (neg ? -n : n) : null;
  };

  const pickColumn = (grid) => {
    const title = grid.querySelector(".js-grid-main-title");
    if (!title) return null;
    // Restraint: bars follow the sorted measure only. Sorting is the user saying
    // "rank by this", which is exactly when a magnitude bar helps.
    const td = title.querySelector("td.number.ascending, td.number.descending");
    return td ? td.dataset.index : null;
  };

  const unbar = (td) => {
    td.classList.remove("pm-bar", "pm-bar-neg");
    td.style.removeProperty("--pm-bar");
  };

  const cellsFor = (grid, idx) =>
    [...grid.querySelectorAll(`.js-grid-main-body tr:not(.summary):not(.summary-row) td.number[data-index="${idx}"]`)]
      .filter((td) => td.offsetParent !== null); // current page only (other pages are display:none)

  const paintColumn = (grid, idx) => {
    const cells = cellsFor(grid, idx);
    if (cells.length < 3) { cells.forEach(unbar); return; }
    const vals = cells.map((td) => parse(td.textContent));
    const abs = vals.filter((v) => v != null).map(Math.abs);
    const max = Math.max(...abs);
    const min = Math.min(...abs);
    // A column where everything is the same (e.g. lead time 14) says nothing as bars
    if (!(max > 0) || max === min) { cells.forEach(unbar); return; }
    cells.forEach((td, i) => {
      const v = vals[i];
      if (v == null || v === 0) { unbar(td); return; }
      const val = Math.max(2, Math.round((Math.abs(v) / max) * 1000) / 10) + "%";
      if (td.style.getPropertyValue("--pm-bar") !== val) td.style.setProperty("--pm-bar", val);
      td.classList.add("pm-bar");
      td.classList.toggle("pm-bar-neg", v < 0);
    });
  };

  // Bars go on the sorted measure, plus every column that has Phocas
  // conditional formatting (drawn in the rule's color there)
  const paint = (grid) => {
    const want = new Set();
    const sorted = pickColumn(grid);
    if (sorted != null && sorted !== "-1") want.add(sorted);
    for (const el of grid.querySelectorAll(".js-grid-main-body .conditional-formatting-element")) {
      const td = el.closest("td[data-index]");
      if (td) want.add(td.dataset.index);
    }
    for (const td of grid.querySelectorAll(".js-grid-main-body td.pm-bar")) {
      if (!want.has(td.dataset.index)) unbar(td);
    }
    for (const idx of want) paintColumn(grid, idx);
  };

  let queued = false;
  const run = () => {
    queued = false;
    for (const grid of document.querySelectorAll(".js-grid")) {
      try { paint(grid); } catch (e) { /* never break the page */ }
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    setTimeout(() => requestAnimationFrame(run), 120);
  };

  const start = () => {
    run();
    // childList only: our own class/style writes do not retrigger this
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
    // sorting flips classes on title cells without adding nodes
    document.addEventListener("click", (e) => {
      if (e.target.closest && e.target.closest(".js-grid-main-title")) queue();
    }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
