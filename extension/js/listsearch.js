// Phocas Magic: search for long checkbox lists (sharing a dashboard or a
// favourite with users, and any other .checkbox-list). Adds a field above the
// list that filters by name, a live "N selected" count, and a "Selected only"
// toggle. Rows are only hidden/shown; checkboxes and their handlers are
// untouched, so saving works exactly as before.
(() => {
  if (window.__phocasMagicListSearch) return;
  window.__phocasMagicListSearch = true;

  const MIN = 10;
  const rowsOf = (list) => [...list.children].filter((el) => el.querySelector('input[type="checkbox"]'));
  const labelOf = (row) => (row.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

  const enhance = (list) => {
    if (list.dataset.pmSearch) return;
    const rows = rowsOf(list);
    if (rows.length < MIN) return;
    list.dataset.pmSearch = "1";

    const bar = document.createElement("div");
    bar.className = "pm-list-search";
    bar.innerHTML =
      '<div class="pm-search-wrap">' +
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 3a5.5 5.5 0 0 1 4.38 8.83l3.65 3.64a.75.75 0 1 1-1.06 1.06l-3.64-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/></svg>' +
      '<input type="text" placeholder="Search people" autocomplete="off" spellcheck="false">' +
      "</div>" +
      '<button type="button" class="pm-list-only" aria-pressed="false">Selected only</button>' +
      '<span class="pm-list-count"></span>';
    list.parentElement.insertBefore(bar, list);
    const empty = document.createElement("div");
    empty.className = "pm-list-empty";
    empty.textContent = "No matches";
    list.insertAdjacentElement("afterend", empty);

    const input = bar.querySelector("input");
    const only = bar.querySelector(".pm-list-only");
    const count = bar.querySelector(".pm-list-count");
    let selectedOnly = false;

    const apply = () => {
      const q = input.value.trim().toLowerCase();
      let shown = 0;
      let checked = 0;
      for (const row of rowsOf(list)) {
        const cb = row.querySelector('input[type="checkbox"]');
        if (cb.checked) checked++;
        const hit = (!q || labelOf(row).includes(q)) && (!selectedOnly || cb.checked);
        row.classList.toggle("pm-hide", !hit);
        if (hit) shown++;
      }
      count.textContent = `${checked} selected`;
      empty.style.display = shown ? "none" : "block";
    };

    // Keep keys inside the field (dialogs bind Enter/Esc to Save/Close)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && input.value) { e.preventDefault(); input.value = ""; apply(); }
      if (e.key === "Enter") e.preventDefault();
      e.stopPropagation();
    });
    input.addEventListener("input", apply);
    only.addEventListener("click", (e) => {
      e.preventDefault();
      selectedOnly = !selectedOnly;
      only.setAttribute("aria-pressed", String(selectedOnly));
      apply();
    });
    list.addEventListener("change", apply);
    apply();
  };

  const scan = () => document.querySelectorAll(".checkbox-list").forEach((l) => { try { enhance(l); } catch (e) { /* ignore */ } });
  let queued = false;
  const start = () => {
    scan();
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; scan(); });
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
