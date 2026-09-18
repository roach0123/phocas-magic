// Phocas Magic: search for the MUI pickers in the new Analytics app
// (Properties, Measure, Stream, ...). Adds a pinned field above the list with
// a selected count; typing filters options, Enter toggles the first match,
// Esc clears then closes. Options are only hidden/shown with a class, never
// moved, so React keeps full ownership of the list.
(() => {
  if (window.__phocasMagicMuiMenus) return;
  window.__phocasMagicMuiMenus = true;

  const MIN = 4; // Properties lists can be short but should still be searchable
  const isOption = (el) => el.getAttribute("role") === "option" && !el.matches("hr");
  const isMeta = (el) => !!el.querySelector('[data-testid="select-all-button"], [data-testid="select-none-button"]');
  const labelOf = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();

  const options = (ul) => [...ul.children].filter((el) => isOption(el) && !isMeta(el));
  const selectedCount = (ul) =>
    options(ul).filter((el) => el.getAttribute("aria-selected") === "true" || el.querySelector('input[type="checkbox"]:checked, .Mui-checked')).length;

  const filter = (ul, q, box) => {
    const needle = q.trim().toLowerCase();
    let shown = 0;
    let first = null;
    for (const el of ul.children) {
      if (!needle) { el.classList.remove("pm-hide", "pm-top"); continue; }
      if (isOption(el) && !isMeta(el)) {
        const hit = labelOf(el).toLowerCase().includes(needle);
        el.classList.toggle("pm-hide", !hit);
        el.classList.remove("pm-top");
        if (hit) { shown++; if (!first) first = el; }
      } else {
        el.classList.add("pm-hide"); // subheaders, dividers, all/none while filtering
      }
    }
    if (first) first.classList.add("pm-top");
    box.classList.toggle("pm-filtering", !!needle);
    box.classList.toggle("pm-no-results", !!needle && shown === 0);
  };

  const enhance = (ul) => {
    const paper = ul.parentElement;
    if (!paper || paper.querySelector(":scope > .pm-mui-search")) return;
    if (options(ul).length < MIN) return;

    const box = document.createElement("div");
    box.className = "pm-mui-search";
    box.innerHTML =
      '<div class="pm-search-wrap">' +
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 3a5.5 5.5 0 0 1 4.38 8.83l3.65 3.64a.75.75 0 1 1-1.06 1.06l-3.64-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/></svg>' +
      '<input type="text" placeholder="Search" autocomplete="off" spellcheck="false">' +
      '<span class="pm-count"></span>' +
      "</div>" +
      '<div class="pm-empty">No matches</div>';
    paper.insertBefore(box, ul);
    paper.classList.add("pm-mui-picker");

    const input = box.querySelector("input");
    const count = box.querySelector(".pm-count");
    const refresh = () => {
      const n = selectedCount(ul);
      count.textContent = n ? `${n} selected` : "";
    };
    refresh();

    // MUI's MenuList does type-ahead on keydown: keep keys inside the field
    for (const ev of ["keydown", "keyup", "keypress"]) {
      input.addEventListener(ev, (e) => {
        if (ev === "keydown") {
          if (e.key === "Escape") {
            if (input.value) { e.preventDefault(); input.value = ""; filter(ul, "", box); e.stopPropagation(); }
            return; // empty: let MUI close the menu
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const top = ul.querySelector(":scope > .pm-top");
            const hit = top && (top.querySelector("li") || top);
            if (hit) hit.click();
            setTimeout(refresh, 60);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            const first = [...ul.children].find((el) => isOption(el) && !el.classList.contains("pm-hide"));
            const li = first && (first.querySelector("li") || first);
            if (li) li.focus();
          }
        }
        e.stopPropagation();
      });
    }
    input.addEventListener("input", () => filter(ul, input.value, box));
    ul.addEventListener("click", () => setTimeout(refresh, 60));
    // Only React's own changes matter here (selection, re-rendered options);
    // our pm-hide/pm-top class writes are not observed, so this cannot loop.
    let pending = false;
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        refresh();
        if (input.value) filter(ul, input.value, box);
      });
    }).observe(ul, { subtree: true, attributes: true, attributeFilter: ["aria-selected"], childList: true });

    setTimeout(() => input.focus({ preventScroll: true }), 60);
  };

  const scan = () => {
    for (const ul of document.querySelectorAll('#root.analytics-app ~ * [class*="MuiMenu-list"], body > [class*="MuiPopover-root"] [class*="MuiMenu-list"], [class*="MuiMenu-paper"] > ul')) {
      try { enhance(ul); } catch (e) { /* ignore */ }
    }
  };
  let queued = false;
  const start = () => {
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; scan(); });
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
