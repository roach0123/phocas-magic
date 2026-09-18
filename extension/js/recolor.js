// Phocas Magic: remaps Phocas' hard-coded cyan brand shades to the blue accent
// by rewriting readable stylesheet rules in place. New rules (emotion/MUI inject
// them at runtime) are picked up by a cheap length check on each sheet.
(() => {
  // Excluded areas: never touch Phocas administration (/Admin/...) or designer pages
  if (/^\/admin(istration)?(\/|$)|(^|\/)designer(\/|$)/i.test(location.pathname)) return;
  if (window.__phocasMagicRecolor) return;
  window.__phocasMagicRecolor = true;

  // "r,g,b" of the original shade -> replacement "r, g, b"
  const MAP = {
    "7,184,214": "58, 86, 232",    // cyan-500 #07b8d6
    "78,198,224": "125, 147, 255", // cyan-400 #4ec6e0 (kept light: black text sits on it in charts)
    "56,191,220": "58, 86, 232",   // btn-primary border
    "9,162,190": "47, 69, 196",    // cyan-600
    "0,124,150": "36, 52, 143",    // cyan-700
    "0,80,100": "27, 38, 107",     // cyan-800
    "133,214,233": "174, 189, 255",// cyan-300
    "186,232,243": "208, 217, 255",// cyan-200
    "221,244,249": "232, 236, 255",// cyan-100
    "165,226,239": "221, 228, 255",// grid highlight
    "143,219,235": "199, 210, 255",// context-menu active
    "230,247,251": "238, 242, 255",// row hover
    "208,240,247": "229, 234, 255",// zero cell
  };

  const hexToKey = (h) => {
    h = h.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
  };
  const RGB_RE = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)/g;
  const HEX_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

  // Fills of the main brand cyan get a lighter blue: Phocas puts black text on
  // cyan fills in charts, and white text on the lighter blue still reads.
  const FILL_MAP = { "7,184,214": "91, 124, 255" };
  const isFillProp = (p) => p === "background-color" || p === "background" || p === "fill" || p.startsWith("--palette");

  const recolorValue = (v, prop = "") => {
    const fill = isFillProp(prop);
    let changed = false;
    const pick = (key) => (fill && FILL_MAP[key]) || MAP[key];
    let out = v.replace(RGB_RE, (m, r, g, b, a) => {
      const rep = pick(`${r},${g},${b}`);
      if (!rep) return m;
      changed = true;
      return a ? `rgba(${rep}${a})` : `rgb(${rep})`;
    });
    out = out.replace(HEX_RE, (m, h) => {
      const rep = pick(hexToKey(h));
      if (!rep) return m;
      changed = true;
      return `rgb(${rep})`;
    });
    return changed ? out : null;
  };

  const processRule = (rule) => {
    if (rule.cssRules) {
      for (const r of rule.cssRules) processRule(r);
    }
    const st = rule.style;
    if (!st) return;
    for (let i = 0; i < st.length; i++) {
      const prop = st[i];
      if (prop.startsWith("--pm")) continue;
      const val = st.getPropertyValue(prop);
      if (!val || !(val.includes("rgb") || val.includes("#"))) continue;
      const nv = recolorValue(val, prop);
      if (nv) st.setProperty(prop, nv, st.getPropertyPriority(prop));
    }
  };

  const seen = new WeakMap(); // sheet -> rules already processed
  const scan = () => {
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; } // cross-origin
      if (!rules) continue;
      const done = seen.get(sheet) || 0;
      if (rules.length === done) continue;
      // emotion appends; if the sheet shrank or was rewritten, redo it all
      const start = rules.length > done ? done : 0;
      for (let i = start; i < rules.length; i++) {
        try { processRule(rules[i]); } catch (e) { /* ignore odd rules */ }
      }
      seen.set(sheet, rules.length);
    }
  };

  // Inline styles set by React on a few MUI chips/links
  const recolorInline = (root) => {
    const els = root.querySelectorAll ? root.querySelectorAll("[style*='rgb'],[style*='#']") : [];
    for (const el of els) {
      const nv = recolorValue(el.getAttribute("style") || "");
      if (nv) el.setAttribute("style", nv);
    }
  };

  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      scan();
    });
  };

  const start = () => {
    scan();
    recolorInline(document);
    new MutationObserver((muts) => {
      schedule();
      for (const m of muts) {
        for (const n of m.addedNodes) if (n.nodeType === 1) recolorInline(n);
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
    // insertRule does not fire mutations; a light poll catches those
    setInterval(scan, 1500);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
