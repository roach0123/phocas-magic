// Phocas Magic: smarter picker menus. Any Bootstrap .js-menu dropdown with a
// long list (Measures, Properties, Stream, filters ...) gets a pinned search
// field, a selected count, a two column layout and keyboard control. Nothing
// is reordered or re-created, so Phocas' own click handlers keep working.
(() => {
  if (window.__phocasMagicMenus) return;
  window.__phocasMagicMenus = true;

  const LONG = 5; // items before a menu counts as "long"

  const itemsOf = (menu) =>
    [...menu.children].filter((li) => li.tagName === "LI" && !li.classList.contains("pm-menu-search"));
  const isChoice = (li) => !li.classList.contains("divider") && !li.classList.contains("dropdown-header");
  const isMeta = (li) => (li.dataset.key || "").startsWith("phocas:"); // All / None
  const labelOf = (li) => (li.textContent || "").replace(/\s+/g, " ").trim();
  const checkedCount = (menu) => menu.querySelectorAll("li:not(.pm-menu-search) input[type=checkbox]:checked").length;
  const hasCheckboxes = (menu) => !!menu.querySelector("li input[type=checkbox]");

  const stop = (e) => e.stopPropagation();

  const updateCount = (menu, countEl) => {
    if (!countEl) return;
    const n = checkedCount(menu);
    countEl.textContent = n ? `${n} selected` : "";
  };

  const filter = (menu, q) => {
    const needle = q.trim().toLowerCase();
    let shown = 0;
    for (const li of itemsOf(menu)) {
      if (!needle) {
        li.classList.remove("pm-hide");
        continue;
      }
      const hit = isChoice(li) && !isMeta(li) && labelOf(li).toLowerCase().includes(needle);
      li.classList.toggle("pm-hide", !hit);
      if (hit) shown++;
    }
    // Ring the item Enter will toggle
    const top = needle ? visibleChoices(menu)[0] : null;
    for (const x of menu.querySelectorAll(":scope > li.pm-top")) if (x !== top) x.classList.remove("pm-top");
    if (top) top.classList.add("pm-top");
    menu.classList.toggle("pm-filtering", !!needle);
    menu.classList.toggle("pm-no-results", !!needle && shown === 0);
    return shown;
  };

  const visibleChoices = (menu) =>
    itemsOf(menu).filter((li) => isChoice(li) && !li.classList.contains("pm-hide") && !isMeta(li));

  const focusItem = (li) => {
    const a = li && li.querySelector("a");
    if (a) a.focus();
  };

  // Build (or rebuild) the search row. Phocas re-renders a menu's <li>s when
  // it opens, which drops our row, so this is safe to call repeatedly.
  const ensureSearch = (menu) => {
    const items = itemsOf(menu).filter(isChoice);
    if (items.length < LONG) return null;
    menu.classList.add("pm-picker");
    menu.classList.toggle("pm-picker-wide", items.length >= 24);
    let li = menu.querySelector(":scope > li.pm-menu-search");
    if (li) {
      if (menu.firstElementChild !== li) menu.insertBefore(li, menu.firstChild);
      return li;
    }
    li = document.createElement("li");
    li.className = "pm-menu-search";
    li.innerHTML =
      '<div class="pm-search-wrap">' +
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.5 3a5.5 5.5 0 0 1 4.38 8.83l3.65 3.64a.75.75 0 1 1-1.06 1.06l-3.64-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/></svg>' +
      '<input type="text" placeholder="Search" autocomplete="off" spellcheck="false">' +
      '<span class="pm-count"></span>' +
      "</div>" +
      '<div class="pm-empty">No matches</div>' +
      '<div class="pm-hint">Enter toggles the highlighted match · Esc clears</div>';
    menu.insertBefore(li, menu.firstChild);

    const input = li.querySelector("input");
    const countEl = () => (hasCheckboxes(menu) ? li.querySelector(".pm-count") : null);
    updateCount(menu, countEl());

    // Keep Bootstrap from treating clicks/keys in the field as menu actions
    for (const ev of ["click", "mousedown", "mouseup", "keydown", "keyup", "keypress"]) li.addEventListener(ev, stop);

    input.addEventListener("input", () => filter(menu, input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusItem(visibleChoices(menu)[0]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const first = visibleChoices(menu)[0];
        const target = first && (first.querySelector("input[type=checkbox]") || first.querySelector("a"));
        if (target) target.click();
        updateCount(menu, countEl());
      } else if (e.key === "Escape") {
        if (input.value) {
          e.preventDefault();
          input.value = "";
          filter(menu, "");
        } else {
          const toggle = menu.parentElement && menu.parentElement.querySelector(".dropdown-toggle");
          if (toggle) toggle.click();
        }
      }
    });
    return li;
  };

  const wire = (menu) => {
    if (menu.dataset.pmWired) return;
    menu.dataset.pmWired = "1";

    // Arrow keys move between visible items; typing jumps back to the field
    menu.addEventListener("keydown", (e) => {
      const input = menu.querySelector(".pm-menu-search input");
      if (!input || e.target === input) return;
      const vis = visibleChoices(menu);
      const cur = vis.findIndex((x) => x.contains(document.activeElement));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        const next = e.key === "ArrowDown" ? cur + 1 : cur - 1;
        if (next < 0) input.focus();
        else focusItem(vis[Math.min(next, vis.length - 1)]);
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        input.focus();
      }
    }, true);

    const refreshCount = () => updateCount(menu, hasCheckboxes(menu) ? menu.querySelector(".pm-count") : null);
    menu.addEventListener("change", refreshCount);
    menu.addEventListener("click", () => setTimeout(refreshCount, 0));

    // Re-add the search row whenever Phocas re-renders the list
    new MutationObserver(() => {
      if (!menu.querySelector(":scope > li.pm-menu-search") && menu.parentElement && menu.parentElement.classList.contains("open")) {
        const li = ensureSearch(menu);
        const input = li && li.querySelector("input");
        if (input && document.activeElement !== input) input.focus({ preventScroll: true });
      }
    }).observe(menu, { childList: true });
  };

  const onOpen = (group) => {
    const menu = group.querySelector(":scope > .dropdown-menu");
    if (!menu) return;
    wire(menu);
    const li = ensureSearch(menu);
    const input = li && li.querySelector("input");
    if (input) {
      input.value = "";
      filter(menu, "");
      updateCount(menu, hasCheckboxes(menu) ? menu.querySelector(".pm-count") : null);
      setTimeout(() => input.focus({ preventScroll: true }), 30);
    }
  };

  // Watch for dropdown groups gaining .open
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      const el = m.target;
      if (m.type === "attributes" && el.classList && el.classList.contains("open") && !(m.oldValue || "").includes("open")) {
        onOpen(el);
      }
    }
  });

  const start = () => {
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"], attributeOldValue: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
