# Chrome Web Store listing (copy and paste)

## Store listing tab

**Name** (from the manifest): Magic Theme for Phocas

**Summary** (from the manifest, 132 characters max):
A modern, Apple-inspired look for Phocas BI, with searchable pickers, data bars and reorderable columns. Unofficial.

**Category:** Productivity (the store now calls this "Workflow & Planning" under Productivity)

**Language:** English (United States)

**Description:**

Magic Theme for Phocas gives the Phocas BI web app a clean, modern design and adds small conveniences for people who live in it every day.

The look
- Frosted, macOS-style sidebar and toolbars, system fonts and a soft color canvas
- Dashboards as rounded cards, with bold, readable KPI tiles showing status at a glance
- Quieter, easier-to-scan grids with tabular numbers and clear hover and selection states
- Redesigned charts: donut pies, rounded bars, soft area fills and dashed comparison lines
- Conditional formatting shown as colored bars instead of heavy underlines

Faster to use
- Searchable Measures, Properties and other long pickers, with a selected count and keyboard control
- People search when sharing a dashboard or favorite
- Drag to reorder grid columns, and arrange dimensions in your own order (remembered per user)
- Inline data bars on the column you sort by, and a live total in Analytics

Private by design
- Everything happens in your browser. The extension collects nothing and sends nothing anywhere.
- Your column and dimension orders are saved locally.
- Click the toolbar icon to switch the theme off and on at any time.

Works on any *.phocassoftware.com site. Other addresses can be added on the Options page.

Unofficial: this is an independent project and isn't affiliated with or endorsed by Phocas Software. "Phocas" is a trademark of its owner and is used here only to describe what the extension works with.

**Homepage URL:** https://github.com/roach0123/phocas-magic

**Support URL:** https://github.com/roach0123/phocas-magic/issues

## Graphic assets

- Store icon, 128x128: `extension/icons/icon128.png`
- Screenshot, 1280x800: `store/private/screenshots/1-dashboard.png` (one is enough; every name and number is demo data)
- Promo tiles: skip (optional)

## Privacy practices tab

**Single purpose:**
Restyles the Phocas BI web app with a modern design and adds usability improvements (searchable menus, reorderable columns and dimensions) to its pages.

**Permission justifications:**

- `storage`: Saves the user's on/off preference and the list of extra sites they add on the Options page. Stored locally only.
- `scripting`: Registers the extension's own bundled CSS and scripts on extra Phocas addresses the user adds on the Options page (for companies that use a custom domain). No remote code.
- Host permission `https://*.phocassoftware.com/*`: The extension's only function is to restyle and enhance Phocas pages, which are served from this domain.
- Optional host permissions `https://*/*` and `http://*/*`: Never granted at install. Requested only when the user adds a specific site on the Options page (for example a self-hosted Phocas address), and only for that one site, through Chrome's permission prompt. Removing the site revokes it.

**Remote code:** No, I am not using remote code. All JavaScript and CSS is included in the package.

**Data usage:** Check none of the data types. The extension does not collect or transmit user data.

Tick all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://github.com/roach0123/phocas-magic/blob/main/PRIVACY.md

## Distribution tab

**Visibility:** Unlisted (only people with the link can find and install it)

**Regions:** All regions
