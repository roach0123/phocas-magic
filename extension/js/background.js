// Phocas Magic: service worker.
// 1. Toolbar icon toggles the theme on/off for every Phocas tab.
// 2. Extra domains from the Options page get the same content scripts,
//    registered dynamically (the manifest only covers *.phocassoftware.com).

const SCRIPT_ID = "pm-custom-domains";

const setBadge = (on) => {
  chrome.action.setBadgeText({ text: on ? "" : "OFF" });
  chrome.action.setBadgeBackgroundColor({ color: "#64748b" });
  chrome.action.setTitle({ title: on ? "Phocas Magic: on (click to turn off)" : "Phocas Magic: off (click to turn on)" });
};

// Same files, in the same order, as the manifest's static content script
const contentFiles = () => {
  const cs = chrome.runtime.getManifest().content_scripts[0];
  return { css: cs.css, js: cs.js };
};

// Register content scripts for every saved domain we hold permission for
const syncDomains = async () => {
  const { domains = [] } = await chrome.storage.local.get({ domains: [] });
  const granted = [];
  for (const pattern of domains) {
    try {
      if (await chrome.permissions.contains({ origins: [pattern] })) granted.push(pattern);
    } catch (e) { /* malformed pattern: skip */ }
  }
  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
    if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  } catch (e) { /* none registered */ }
  if (!granted.length) return;
  const { css, js } = contentFiles();
  await chrome.scripting.registerContentScripts([{
    id: SCRIPT_ID,
    matches: granted,
    excludeMatches: granted.flatMap((g) => {
      const origin = g.replace(/\/\*$/, "");
      return ["/admin", "/Admin", "/ADMIN", "/administration", "/Administration", "/ADMINISTRATION"]
        .flatMap((x) => [origin + x, origin + x + "/*", origin + x + "?*"]);
    }),
    css,
    js,
    runAt: "document_start",
    allFrames: true,
    persistAcrossSessions: true,
  }]);
};

const init = () => {
  chrome.storage.local.get({ enabled: true }, (v) => setBadge(v.enabled !== false));
  syncDomains();
};
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.domains) syncDomains();
  if (changes.enabled) setBadge(changes.enabled.newValue !== false);
});
chrome.permissions.onAdded.addListener(syncDomains);
chrome.permissions.onRemoved.addListener(syncDomains);

chrome.action.onClicked.addListener(() => {
  chrome.storage.local.get({ enabled: true }, (v) => {
    const on = !(v.enabled !== false);
    chrome.storage.local.set({ enabled: on });
    setBadge(on);
  });
});
