# Phocas Magic

A Chrome extension that gives any Phocas site (`*.phocassoftware.com`) a modern look: a modern BI tool styled like a macOS app. It only changes the look and adds a few conveniences. Every Phocas feature keeps working the same way.

## What it changes

- **Shell:** a light frosted sidebar with a blue active item, a translucent title bar, the system font (SF Pro), and a soft gradient canvas behind everything.
- **Dashboards:** section titles sit directly on the canvas and every widget is its own glass card. Untitled sections no longer leave empty gaps, and the widget filter fields are rounded with a "Filter" hint.
- **Analytics:** the property ribbon (Mode, Measures, Stream, Period, and the rest) is a row of pill pickers. The dimension column is a source list, and the grid sits in a card.
- **Grids:** quieter lines and tabular numbers, with clear hover, selected and highlight states and visible sort and drag cursors.
- **Picker menus:** every long menu (Measures has 47 items) gets a pinned search field, a "N selected" count, a two-column layout, a height cap with scrolling, and keyboard control. Arrow keys move, Enter toggles the top match, and Esc clears the search or closes the menu.
- **Overlays:** rounded dialogs, modals, menus and tooltips with blur and depth.
- **Color:** Phocas's cyan brand shades become the blue accent everywhere, including shades hard-coded into its stylesheets, which `js/recolor.js` rewrites.
- **Charts:** a redesign of the drawn SVG, since Highcharts is bundled privately and has no global to configure (`js/charts.js` + `css/45-charts.css`). Pies become donuts, and columns and bars get rounded ends. The primary line gets a gradient area, comparison series (Previous, Budget) turn into a dashed slate line, and point dots only show on hover. Gridlines are dotted, legend dots are round, and tooltips are glass.
- **Data bars:** the column you sort by gets slim inline bars showing each value's size (`js/bars.js`).
- **Column reorder:** hover a column title to reveal a grip, then drag it to a new spot (`js/columns.js`). Each person's order is saved in their own browser per page and widget, and "Reset columns" in the grid footer undoes it. Sorting, Focus and paging keep working. Exports still use Phocas's order.
- **Flex Modes Analytics (`/analytics/...`):** the newer React app gets the same design (`css/65-flex.css`): a glass control bar, a pill Focus/Reset, a source-list dimension panel, a card grid with quiet headers, and a segmented Grid/Transaction switch.
- **Dimension order:** "Arrange" above the dimension list, in both Analytics apps (`js/dimorder.js`). Drag rows into your own order, then click Done. It's saved per database in this browser; "Reset order" restores Phocas's groups. It uses CSS `order` only, so React and jQuery never see their DOM moved.
- **Searchable Properties and other pickers:** classic menus with 5+ items (`js/menus.js`) and Flex popup menus with 4+ options (`js/muimenus.js`) get the pinned search, the selected count and Enter/Esc keys.
- **People search when sharing:** long checkbox lists (like the Users list when sharing a dashboard or favorite) get a search field, a live selected count and a "Selected only" toggle (`js/listsearch.js`).
- **Live total:** Analytics shows the headline total and row count to the right of the Focus row (`js/total.js`).
- **`/` shortcut:** jumps to the page's search field.
- **Accessibility:** respects reduced motion and reduced transparency, and shows visible keyboard focus.

## Using it on your own Phocas

It runs on any `https://*.phocassoftware.com/*` site out of the box. To use it on another domain (a custom or self-hosted Phocas address), right-click the toolbar icon, choose **Options**, and add the site. Chrome asks you to allow the extension there, and the theme applies after a refresh. Removing a site also revokes that permission. It only changes what you see in your own browser: nothing is sent anywhere, and your Phocas data, views and settings on the server are untouched. Your personal column and dimension orders stay in your browser's local storage.

This is an unofficial, personal project. It isn't affiliated with or endorsed by Phocas Software. Phocas can change its markup at any time, which may break parts of the styling until the selectors are updated.

**Excluded area:** nothing runs on the administration pages (`/Admin/...`, and `/administration`). The manifest's `exclude_matches` keeps the CSS and scripts from loading there, and each script also checks the path, in case the app navigates there without a page load.

## Install / update

The extension is loaded unpacked from `extension/`.

- First install: open `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and pick `extension/`.
- After editing files: click the reload icon on the Phocas Magic card, then refresh Phocas.

## Turning it off

Click the Phocas Magic toolbar icon (under the puzzle-piece menu unless you pin it). The badge shows OFF. Refresh the page to fully restore Phocas's original cyan colors, because the color rewrite stays in place until the page reloads.

## Layout

```
extension/
  manifest.json
  css/00-tokens.css      design tokens (colors, radii, shadows) + Phocas palette overrides
  css/10-base.css        font, canvas, scrollbars, focus, arrival fade
  css/20-shell.css       sidebar + title bar
  css/30-controls.css    buttons, inputs, dropdown menus, MUI controls
  css/40-grid.css        js-grid (colors only; see note below) + pager
  css/45-charts.css      Highcharts chrome, palette, dashed comparison series
  css/50-dashboard.css   dashboard sections + widget cards
  css/60-analytics.css   classic Analytics: ribbon, dimension list, grid card
  css/65-flex.css        Flex Modes Analytics (React app)
  css/70-apps.css        React sub apps (Home, Insights ...)
  css/80-overlays.css    dialogs, modals, popovers, tooltips, tabs
  css/90-enhance.css     styles for elements the scripts add
  css/95-signature.css   the bolder signature layer (canvas, glass toolbars, titles)
  js/pm.js               theme on/off, page tagging, hints, "/" shortcut
  js/recolor.js          rewrites hard-coded cyan in stylesheets to the accent
  js/menus.js            searchable picker menus (classic)
  js/muimenus.js         searchable picker menus (Flex Modes)
  js/bars.js             inline data bars on the sorted column
  js/columns.js          drag to reorder grid columns (per user)
  js/dimorder.js         Arrange: personal dimension order
  js/charts.js           chart redesign on the rendered SVG
  js/total.js            live headline total in Analytics
  js/listsearch.js       search + "Selected only" for long checkbox lists (sharing)
  js/background.js       toolbar toggle + registers scripts for extra sites
  options.html           settings page: theme on/off, extra sites
  js/options.js          settings logic (permission request per site)
```

All CSS is scoped under `html.pm-on`, so the toggle removes every style rule at once.

## Rules for editing

- Inside `.js-grid`, change only colors, type, radius and border color. Never change padding, height or border width. Phocas's JavaScript sizes the frozen left and right tables separately, and they must stay the same size.
- Dashboard widget cards get their inset from padding on the widget `<li>` (border-box), so the widths Phocas computes stay valid.
- Phocas rebuilds the items in a picker menu each time it opens. `menus.js` puts its search row back after every rebuild; don't assume the row persists.
- Phocas has no per-view column order: measure order is set per database, for everyone. `columns.js` therefore reorders only on screen and remembers the order per person in localStorage, moving whole cells, which carry their own widths. The frozen and scrolling tables stay aligned.
