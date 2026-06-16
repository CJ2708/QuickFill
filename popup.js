// popup.js — UI logic. Loaded after store.js (state helpers) and filler.js (fillPage).

const BLOCKED = /^(chrome|edge|brave|opera|about|chrome-extension|moz-extension|view-source|devtools|data):/i;
const BLOCKED_HOSTS = /^https:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore|microsoftedge\.microsoft\.com)/i;
function canInject(url) {
  return !!url && !BLOCKED.test(url) && !BLOCKED_HOSTS.test(url);
}

// Editor field layout. Pairs render side-by-side.
const FIELD_GROUPS = [
  { title: "Personal", rows: [["firstName", "lastName"], ["middleName"], ["fullName"], ["dateOfBirth"]] },
  { title: "Contact", rows: [["email"], ["phone"]] },
  { title: "Address", rows: [["addressLine1"], ["addressLine2"], ["city", "state"], ["zip", "country"]] },
  { title: "Links", rows: [["linkedin"], ["github"], ["portfolio"]] },
  { title: "Work", rows: [["currentCompany"], ["currentTitle"]] },
  { title: "Application", rows: [["summary"], ["coverLetter"]] }
];
const FIELD_LABELS = {
  firstName: "First name", middleName: "Middle name (optional)", lastName: "Last name",
  fullName: "Full name (auto if blank)", dateOfBirth: "Date of birth", email: "Email", phone: "Phone",
  addressLine1: "Street address", addressLine2: "Apt / Suite (optional)",
  city: "City", state: "State / Province", zip: "ZIP / Postal code", country: "Country",
  linkedin: "LinkedIn URL", github: "GitHub URL", portfolio: "Website / Portfolio URL",
  currentCompany: "Current company", currentTitle: "Current job title",
  summary: "Professional summary / headline", coverLetter: "Cover letter / personal statement"
};
// Fields that render as a multi-line <textarea> instead of a single-line input.
const TEXTAREA_FIELDS = new Set(["summary", "coverLetter"]);
// Non-default input types for single-line fields.
const FIELD_INPUT_TYPE = { email: "email", dateOfBirth: "date" };

let state = null;
const ui = { view: "fill", editingId: null, tab: null };

// ---------- tiny DOM helper (safe with user values) ----------
function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  if (props) {
    for (const k in props) {
      const v = props[k];
      if (v == null) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "value") n.value = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") n.addEventListener(k.slice(2).toLowerCase(), v);
      else n.setAttribute(k, v);
    }
  }
  kids.flat().forEach((c) => { if (c != null) n.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return n;
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
const saveSoon = debounce(() => qfSetState(state), 250);

function activeProfile() {
  return state.profiles.find((p) => p.id === state.activeId) || null;
}

// ================= rendering =================
function setTab(view) {
  ui.view = view;
  document.getElementById("tab-fill").classList.toggle("is-active", view === "fill");
  document.getElementById("tab-profiles").classList.toggle("is-active", view === "profiles");
  document.getElementById("view-fill").classList.toggle("hidden", view !== "fill");
  document.getElementById("view-profiles").classList.toggle("hidden", view !== "profiles");
  if (view === "fill") renderFill();
  else renderProfiles();
}

function setStatus(msg, kind) {
  const s = document.getElementById("status");
  s.textContent = msg || "";
  s.className = "status" + (kind ? " " + kind : "");
}

function renderFill() {
  const sel = document.getElementById("active-select");
  sel.innerHTML = "";
  if (state.profiles.length === 0) {
    sel.append(el("option", { value: "", text: "No profiles yet" }));
    sel.disabled = true;
    document.getElementById("fill-btn").disabled = true;
    setStatus("Add a profile in the Profiles tab first.", "muted");
  } else {
    sel.disabled = false;
    document.getElementById("fill-btn").disabled = false;
    state.profiles.forEach((p) => {
      sel.append(el("option", { value: p.id, text: p.label }));
    });
    sel.value = state.activeId;
  }
  document.getElementById("only-empty").checked = !!state.settings.onlyEmpty;
}

function renderProfiles() {
  const list = document.getElementById("profile-list");
  list.innerHTML = "";

  if (state.profiles.length === 0) {
    list.append(el("p", { class: "empty-note", text: "No profiles yet. Add one below." }));
  }

  state.profiles.forEach((p) => {
    const isActive = p.id === state.activeId;
    const row = el(
      "div",
      { class: "profile-row" + (isActive ? " active" : "") },
      el("span", { class: "profile-name", text: p.label }),
      isActive ? el("span", { class: "badge", text: "Active" }) : null,
      !isActive
        ? el("button", { class: "icon-btn", text: "Use", onclick: () => { state.activeId = p.id; qfSetState(state); renderProfiles(); } })
        : null,
      el("button", { class: "icon-btn", text: "Edit", onclick: () => { ui.editingId = p.id; renderProfiles(); } }),
      el("button", { class: "icon-btn", text: "Copy", onclick: () => duplicateProfile(p.id) }),
      el("button", { class: "icon-btn danger", text: "Delete", onclick: () => deleteProfile(p.id) })
    );
    list.append(row);
  });

  renderEditor();
}

function renderEditor() {
  const box = document.getElementById("editor");
  box.innerHTML = "";
  const profile = state.profiles.find((p) => p.id === ui.editingId);
  if (!profile) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");

  // profile name
  const nameInput = el("input", {
    type: "text", value: profile.label, placeholder: "e.g. Mine, or a friend's name",
    oninput: (e) => { profile.label = e.target.value; saveSoon(); }
  });
  box.append(el("h3", { text: "Edit profile" }), el("div", { class: "fld" }, el("label", { text: "Profile name" }), nameInput));

  // grouped fields
  FIELD_GROUPS.forEach((g) => {
    box.append(el("div", { class: "group-title", text: g.title }));
    g.rows.forEach((row) => {
      const inputs = row.map((key) => {
        const control = TEXTAREA_FIELDS.has(key)
          ? el("textarea", {
              rows: "4", value: profile.fields[key] || "",
              oninput: (e) => { profile.fields[key] = e.target.value; saveSoon(); }
            })
          : el("input", {
              type: FIELD_INPUT_TYPE[key] || "text",
              value: profile.fields[key] || "",
              oninput: (e) => { profile.fields[key] = e.target.value; saveSoon(); }
            });
        return el("div", { class: "fld" }, el("label", { text: FIELD_LABELS[key] }), control);
      });
      box.append(row.length === 2 ? el("div", { class: "grid-2" }, ...inputs) : inputs[0]);
    });
  });

  // actions
  box.append(
    el("div", { class: "editor-actions" },
      el("button", { class: "btn btn-primary btn-sm", text: "Done", onclick: () => { qfSetState(state); ui.editingId = null; renderProfiles(); } }),
      el("button", { class: "btn btn-ghost btn-sm", text: "Delete", onclick: () => deleteProfile(profile.id) })
    )
  );
}

// ================= profile actions =================
function duplicateProfile(id) {
  const src = state.profiles.find((p) => p.id === id);
  if (!src) return;
  const copy = { id: qfUid(), label: src.label + " (copy)", fields: Object.assign({}, src.fields) };
  const idx = state.profiles.findIndex((p) => p.id === id);
  state.profiles.splice(idx + 1, 0, copy);
  qfSetState(state);
  renderProfiles();
}

function deleteProfile(id) {
  state.profiles = state.profiles.filter((p) => p.id !== id);
  if (ui.editingId === id) ui.editingId = null;
  if (state.activeId === id) state.activeId = state.profiles.length ? state.profiles[0].id : null;
  qfSetState(state);
  renderProfiles();
}

function addProfile() {
  const p = qfNewProfile("Profile " + (state.profiles.length + 1));
  state.profiles.push(p);
  if (!state.activeId) state.activeId = p.id;
  ui.editingId = p.id;
  qfSetState(state);
  renderProfiles();
}

// ================= import / export =================
function ioStatus(msg, kind) {
  const s = document.getElementById("io-status");
  s.textContent = msg || "";
  s.className = "status" + (kind ? " " + kind : "");
}

function exportProfiles() {
  if (!state.profiles.length) { ioStatus("No profiles to export.", "muted"); return; }
  const payload = { app: "QuickFill", version: 1, profiles: state.profiles };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = el("a", { href: url, download: "quickfill-profiles.json" });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  ioStatus("Exported " + state.profiles.length + " profile" + (state.profiles.length === 1 ? "" : "s") + ".", "ok");
}

function importProfilesFromText(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { ioStatus("That file isn't valid JSON.", "warn"); return; }
  const incoming = Array.isArray(data) ? data : (data && Array.isArray(data.profiles) ? data.profiles : null);
  if (!incoming) { ioStatus("No profiles found in that file.", "warn"); return; }

  let added = 0;
  incoming.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const clean = {
      id: qfUid(), // always assign a fresh id so imports never collide with existing ones
      label: (typeof raw.label === "string" && raw.label.trim()) ? raw.label.trim() : "Imported profile",
      fields: Object.assign(qfEmptyFields(), (raw.fields && typeof raw.fields === "object") ? raw.fields : {})
    };
    state.profiles.push(clean);
    added++;
  });

  if (!added) { ioStatus("No valid profiles to import.", "warn"); return; }
  if (!state.activeId) state.activeId = state.profiles[0].id;
  qfSetState(state);
  renderProfiles();
  ioStatus("Imported " + added + " profile" + (added === 1 ? "" : "s") + ".", "ok");
}

// ================= fill action =================
async function doFill() {
  const profile = activeProfile();
  if (!profile) { setStatus("Select a profile first.", "warn"); return; }
  if (!ui.tab || !canInject(ui.tab.url)) {
    setStatus("Can't autofill here — this is a browser system page.", "warn");
    return;
  }
  const btn = document.getElementById("fill-btn");
  btn.disabled = true;
  setStatus("Filling…", "muted");
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: ui.tab.id, allFrames: true },
      func: fillPage,
      args: [profile.fields, { onlyEmpty: !!state.settings.onlyEmpty }]
    });
    const count = results.reduce((s, r) => s + (r && typeof r.result === "number" ? r.result : 0), 0);
    if (count > 0) setStatus("Filled " + count + " field" + (count === 1 ? "" : "s") + ".", "ok");
    else setStatus("No matching fields found on this page.", "muted");
  } catch (e) {
    setStatus("Couldn't run on this page. Try reloading it, then fill again.", "warn");
  } finally {
    btn.disabled = false;
  }
}

// ================= init =================
async function init() {
  state = await qfEnsureSeed();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    ui.tab = tab || null;
  } catch (e) { ui.tab = null; }

  document.getElementById("tab-fill").addEventListener("click", () => setTab("fill"));
  document.getElementById("tab-profiles").addEventListener("click", () => setTab("profiles"));
  document.getElementById("fill-btn").addEventListener("click", doFill);
  document.getElementById("add-profile").addEventListener("click", addProfile);

  document.getElementById("export-btn").addEventListener("click", exportProfiles);
  const importFile = document.getElementById("import-file");
  document.getElementById("import-btn").addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importProfilesFromText(String(reader.result || ""));
    reader.onerror = () => ioStatus("Couldn't read that file.", "warn");
    reader.readAsText(file);
    e.target.value = ""; // allow re-importing the same file
  });

  document.getElementById("active-select").addEventListener("change", (e) => {
    state.activeId = e.target.value;
    qfSetState(state);
    setStatus("", "");
  });
  document.getElementById("only-empty").addEventListener("change", (e) => {
    state.settings.onlyEmpty = e.target.checked;
    qfSetState(state);
  });

  setTab("fill");
}

document.addEventListener("DOMContentLoaded", init);
