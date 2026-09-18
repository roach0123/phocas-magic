// Phocas Magic: options page. Manages extra sites (stored as match patterns)
// and the on/off switch. Each site needs Chrome's permission, requested from
// the click that adds it; the service worker registers the content scripts.

const $ = (id) => document.getElementById(id);

// "phocas.acme.com", "https://phocas.acme.com/x", "*.acme.com" -> match pattern
const toPattern = (raw) => {
  let s = (raw || "").trim().toLowerCase();
  if (!s) return null;
  let scheme = "https";
  const m = s.match(/^(https?):\/\//);
  if (m) { scheme = m[1]; s = s.slice(m[0].length); }
  s = s.split(/[/?#]/)[0];
  if (!/^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?$/.test(s) && !/^localhost(:\d+)?$/.test(s)) return null;
  s = s.replace(/:\d+$/, ""); // match patterns cannot carry ports
  return `${scheme}://${s}/*`;
};

const getDomains = async () => (await chrome.storage.local.get({ domains: [] })).domains;
const setDomains = (domains) => chrome.storage.local.set({ domains });

const render = async () => {
  const domains = await getDomains();
  const list = $("list");
  list.innerHTML = "";
  if (!domains.length) {
    const p = document.createElement("div");
    p.className = "empty";
    p.textContent = "No extra sites yet.";
    list.appendChild(p);
  }
  for (const pattern of domains) {
    const granted = await chrome.permissions.contains({ origins: [pattern] }).catch(() => false);
    const row = document.createElement("div");
    row.className = "row";
    const code = document.createElement("code");
    code.textContent = pattern;
    const right = document.createElement("div");
    if (!granted) {
      const w = document.createElement("span");
      w.className = "warn";
      w.textContent = "Not allowed ";
      right.appendChild(w);
    }
    const rm = document.createElement("button");
    rm.className = "ghost";
    rm.textContent = "Remove";
    rm.addEventListener("click", async () => {
      await setDomains((await getDomains()).filter((d) => d !== pattern));
      try { await chrome.permissions.remove({ origins: [pattern] }); } catch (e) { /* not granted */ }
      render();
    });
    right.appendChild(rm);
    row.append(code, right);
    list.appendChild(row);
  }
};

$("add").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("msg").textContent = "";
  const pattern = toPattern($("domain").value);
  if (!pattern) { $("msg").textContent = "That doesn't look like a site address."; return; }
  if (pattern.endsWith(".phocassoftware.com/*")) { $("msg").textContent = "Phocas cloud sites are already built in."; return; }
  // Must be called directly from the click: Chrome shows its own prompt
  const ok = await chrome.permissions.request({ origins: [pattern] }).catch(() => false);
  if (!ok) { $("msg").textContent = "Chrome permission was not granted, so the site was not added."; return; }
  const domains = await getDomains();
  if (!domains.includes(pattern)) await setDomains([...domains, pattern]);
  $("domain").value = "";
  render();
});

chrome.storage.local.get({ enabled: true }, (v) => { $("enabled").checked = v.enabled !== false; });
$("enabled").addEventListener("change", (e) => chrome.storage.local.set({ enabled: e.target.checked }));

render();
