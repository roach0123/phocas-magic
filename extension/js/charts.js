// Phocas Magic: chart redesign on the rendered SVG. Highcharts is bundled
// privately inside Phocas (no global to configure), so this works on the drawn
// output: rounded bars, gradient area under the primary line, donut pies,
// hover-only markers. Every change is additive and re-applied after
// Highcharts redraws (resize, hover state, animation), so the chart's own
// behaviour (tooltips, clicks, drilldown) is untouched.
(() => {
  // Excluded area: never touch Phocas administration pages (/Admin/...)
  if (/^\/admin(istration)?(\/|$)/i.test(location.pathname)) return;
  if (window.__phocasMagicCharts) return;
  window.__phocasMagicCharts = true;

  const SVGNS = "http://www.w3.org/2000/svg";
  const on = () => document.documentElement.classList.contains("pm-on");
  const PRIMARY = ["#07b8d6", "#3a56e8"]; // Phocas cyan (and our remap of it)
  let gradSeq = 0;

  // ---------- helpers ----------
  const nums = (d) => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  const roundedRect = (x, y, w, h, r) => {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    if (r < 0.5) return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
    return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
  };

  // ---------- rounded columns / bars ----------
  const roundBars = (svg) => {
    for (const p of svg.querySelectorAll(".highcharts-column-series path.highcharts-point, .highcharts-bar-series path.highcharts-point")) {
      if (p.closest(".highcharts-legend")) continue;
      const d = p.getAttribute("d") || "";
      if (p.dataset.pmD === d) continue; // already ours
      let bb;
      try { bb = p.getBBox(); } catch (e) { continue; }
      if (!bb || bb.width < 1 || bb.height < 1) continue;
      const r = Math.min(6, Math.min(bb.width, bb.height) * 0.35);
      const nd = roundedRect(bb.x, bb.y, bb.width, bb.height, r);
      p.dataset.pmD = nd;
      p.setAttribute("d", nd);
    }
  };

  // ---------- gradient area under the primary line ----------
  const ensureGradient = (svg, color) => {
    let defs = svg.querySelector("defs");
    if (!defs) { defs = document.createElementNS(SVGNS, "defs"); svg.prepend(defs); }
    const id = "pm-area-" + (++gradSeq);
    const g = document.createElementNS(SVGNS, "linearGradient");
    g.setAttribute("id", id);
    g.setAttribute("x1", "0"); g.setAttribute("y1", "0"); g.setAttribute("x2", "0"); g.setAttribute("y2", "1");
    g.innerHTML = `<stop offset="0" stop-color="${color}" stop-opacity="0.22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>`;
    defs.appendChild(g);
    return id;
  };

  const plotHeight = (svg) => {
    const bg = svg.querySelector(".highcharts-plot-background, .highcharts-plot-border");
    if (bg) { try { return bg.getBBox().height; } catch (e) { /* fall through */ } }
    // fall back to the x axis line position relative to the series group
    return null;
  };

  const areaUnderLines = (svg) => {
    const ph = plotHeight(svg);
    for (const graph of svg.querySelectorAll(".highcharts-line-series .highcharts-graph, .highcharts-spline-series .highcharts-graph")) {
      if (graph.closest(".highcharts-legend")) continue; // legend line symbols
      const stroke = (graph.getAttribute("stroke") || "").toLowerCase();
      if (!PRIMARY.includes(stroke)) continue;
      const series = graph.parentNode;
      const d = graph.getAttribute("d") || "";
      let area = series.querySelector(":scope > path.pm-area");
      if (area && area.dataset.src === d) continue;
      const n = nums(d);
      if (n.length < 4) continue;
      const firstX = n[0];
      const lastX = n[n.length - 2];
      let bottom = ph;
      if (bottom == null) {
        try { const bb = series.getBBox(); bottom = bb.y + bb.height; } catch (e) { continue; }
      }
      if (!area) {
        area = document.createElementNS(SVGNS, "path");
        area.setAttribute("class", "pm-area");
        area.setAttribute("fill", `url(#${ensureGradient(svg, "#3a56e8")})`);
        area.setAttribute("stroke", "none");
        area.style.pointerEvents = "none";
        series.insertBefore(area, graph);
      }
      area.dataset.src = d;
      area.setAttribute("d", `${d} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`);
    }
  };

  // ---------- donut pies ----------
  const donuts = (svg) => {
    for (const s of svg.querySelectorAll(".highcharts-pie-series")) {
      const slices = s.querySelectorAll("path.highcharts-point");
      if (!slices.length) continue;
      let bb;
      try { bb = s.getBBox(); } catch (e) { continue; }
      // union bbox of slices only (labels live elsewhere)
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      for (const p of slices) {
        try {
          const b = p.getBBox();
          x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
          x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
        } catch (e) { /* skip */ }
      }
      if (!isFinite(x1)) continue;
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, r = Math.min(x2 - x1, y2 - y1) / 2;
      if (r < 20) continue;
      let hole = s.querySelector(":scope > circle.pm-hole");
      if (!hole) {
        hole = document.createElementNS(SVGNS, "circle");
        hole.setAttribute("class", "pm-hole");
        hole.style.pointerEvents = "none";
        s.appendChild(hole);
      }
      const hr = (r * 0.58).toFixed(1);
      if (hole.getAttribute("r") !== hr) {
        hole.setAttribute("cx", cx.toFixed(1));
        hole.setAttribute("cy", cy.toFixed(1));
        hole.setAttribute("r", hr);
      }
      s.classList.add("pm-donut");
    }
  };

  // ---------- hover-only markers on busy lines ----------
  const quietMarkers = (svg) => {
    for (const m of svg.querySelectorAll(".highcharts-markers")) {
      m.classList.toggle("pm-many", m.querySelectorAll(".highcharts-point").length > 4);
    }
  };

  const decorate = (container) => {
    if (!on()) return;
    const svg = container.querySelector("svg.highcharts-root");
    if (!svg) return;
    try { roundBars(svg); } catch (e) { /* keep going */ }
    try { areaUnderLines(svg); } catch (e) { /* keep going */ }
    try { donuts(svg); } catch (e) { /* keep going */ }
    try { quietMarkers(svg); } catch (e) { /* keep going */ }
  };

  // ---------- scheduling ----------
  const pending = new Set();
  let timer = null;
  const schedule = (c) => {
    pending.add(c);
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      requestAnimationFrame(() => {
        for (const x of pending) if (x.isConnected) decorate(x);
        pending.clear();
      });
    }, 90);
  };

  const watched = new WeakSet();
  const watch = (c) => {
    if (watched.has(c)) return;
    watched.add(c);
    schedule(c);
    // Highcharts rewrites "d" while animating and on redraw: follow it
    new MutationObserver(() => schedule(c)).observe(c, { subtree: true, childList: true, attributes: true, attributeFilter: ["d"] });
  };

  const scan = () => document.querySelectorAll(".highcharts-container").forEach(watch);

  const start = () => {
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", () => document.querySelectorAll(".highcharts-container").forEach(schedule));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
