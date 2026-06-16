// background.js — service worker (classic). Handles first-run seeding,
// the keyboard shortcut, and shared inject logic.
importScripts("store.js", "filler.js");

// Pages the browser will not let any extension touch.
const BLOCKED = /^(chrome|edge|brave|opera|about|chrome-extension|moz-extension|view-source|devtools|data):/i;
const BLOCKED_HOSTS = /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore|microsoftedge\.microsoft\.com)/i;

function canInject(url) {
  if (!url) return false;
  if (BLOCKED.test(url)) return false;
  if (BLOCKED_HOSTS.test(url)) return false;
  return true;
}

async function flashBadge(text, color) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: color || "#5B4FE9" });
    await chrome.action.setBadgeText({ text: String(text) });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 2500);
  } catch (e) {}
}

// Inject the filler into every frame of a tab and return total fields filled.
async function fillTab(tabId, fields, settings) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: fillPage,
    args: [fields, { onlyEmpty: !!(settings && settings.onlyEmpty) }]
  });
  return results.reduce((sum, r) => sum + (r && typeof r.result === "number" ? r.result : 0), 0);
}

// First run: make sure there's at least one profile so the popup isn't empty.
chrome.runtime.onInstalled.addListener(() => {
  qfEnsureSeed().catch(() => {});
});

// Keyboard shortcut (Alt+Shift+F by default).
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "fill-active-profile") return;
  try {
    const s = await qfGetState();
    const profile = s.profiles.find((x) => x.id === s.activeId) || s.profiles[0];
    if (!profile) { flashBadge("0"); return; }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !canInject(tab.url)) { flashBadge("x", "#c2410c"); return; }

    const count = await fillTab(tab.id, profile.fields, s.settings);
    flashBadge(count > 0 ? String(count) : "0", count > 0 ? "#16a34a" : "#6b7280");
  } catch (e) {
    flashBadge("x", "#c2410c");
  }
});
