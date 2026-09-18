// Phocas Magic: live headline total in Analytics. Reads the grid's summary
// (TOTAL) row, or the single row in Total mode, and shows the first measures
// as big numbers at the right of the Focus / Reset / Matrix row. It is placed
// outside #query-view, whose size drives the grid.
(() => {
  // Excluded area: never touch Phocas administration pages (/Admin/...)
  if (/^\/admin(istration)?(\/|$)/i.test(location.pathname)) return;
  if (window.__phocasMagicTotal) return;
  window.__phocasMagicTotal = true;

  const MAX = 3;
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : "");

  const read = () => {
    const grid = document.querySelector("#query-view .js-grid");
    if (!grid) return null;
    const titles = [...grid.querySelectorAll(".js-grid-main-title td.number[data-index]")];
    if (!titles.length) return null;

    // Prefer the summary header row; fall back to a single body row (Total mode)
    const headerCells = grid.querySelectorAll(".js-grid-main-header td.number[data-index]");
    const bodyRows = [...grid.querySelectorAll(".js-grid-main-body-right tr")].filter((tr) => tr.offsetParent !== null);
    const source = headerCells.length && [...headerCells].some((td) => txt(td))
      ? grid.querySelector(".js-grid-main-header")
      : bodyRows.length === 1 ? bodyRows[0] : null;
    if (!source) return null;

    const items = [];
    for (const t of titles) {
      if (items.length >= MAX) break;
      const cell = source.querySelector(`td[data-index="${t.dataset.index}"]`);
      const value = txt(cell);
      const label = txt(t);
      // Skip identifier columns (e.g. Code shows "TOTAL") and anything non-numeric
      if (value && label && /\d/.test(value) && !/^code$/i.test(label)) items.push({ label, value });
    }
    const count = txt(grid.querySelector(".js-grid-count"));
    return items.length ? { items, count } : null;
  };

  let last = "";
  const render = () => {
    const bar = document.querySelector(".selections-toolbar");
    if (!bar) return;
    const data = read();
    let box = bar.querySelector(":scope > .pm-total");
    if (!data) {
      if (box) box.remove();
      last = "";
      return;
    }
    const key = JSON.stringify(data);
    if (key === last && box) return;
    last = key;
    if (!box) {
      box = document.createElement("div");
      box.className = "pm-total";
      bar.appendChild(box);
    }
    box.innerHTML = "";
    for (const it of data.items) {
      const d = document.createElement("div");
      d.className = "pm-total-item";
      const l = document.createElement("span");
      l.className = "pm-total-label";
      l.textContent = it.label;
      const v = document.createElement("span");
      v.className = "pm-total-value";
      v.textContent = it.value;
      d.append(l, v);
      box.appendChild(d);
    }
    if (data.count && /\d/.test(data.count)) {
      const c = document.createElement("div");
      c.className = "pm-total-item pm-total-count";
      c.innerHTML = '<span class="pm-total-label">Rows</span>';
      const v = document.createElement("span");
      v.className = "pm-total-value";
      v.textContent = data.count;
      c.appendChild(v);
      box.appendChild(c);
    }
    box.classList.remove("pm-total-flash");
    void box.offsetWidth;
    box.classList.add("pm-total-flash");
  };

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    setTimeout(() => { queued = false; try { render(); } catch (e) { /* ignore */ } }, 200);
  };

  const start = () => {
    if (!location.pathname.toLowerCase().startsWith("/query")) {
      // SPA navigation can still bring us here later
    }
    queue();
    new MutationObserver((muts) => {
      // ignore our own writes
      if (muts.every((m) => m.target.closest && m.target.closest(".pm-total"))) return;
      if (location.pathname.toLowerCase().startsWith("/query")) queue();
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
