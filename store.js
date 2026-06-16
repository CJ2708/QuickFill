// store.js — shared state helpers (loaded by popup.html and background.js)
// State shape: { profiles: [{id, label, fields:{...}}], activeId, settings:{onlyEmpty} }

const QF_KEY = "qf_state";

const QF_DEFAULT_STATE = {
  profiles: [],
  activeId: null,
  settings: { onlyEmpty: false }
};

function qfUid() {
  return "p_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function qfEmptyFields() {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    fullName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    linkedin: "",
    github: "",
    portfolio: "",
    currentCompany: "",
    currentTitle: ""
  };
}

function qfNewProfile(label) {
  return { id: qfUid(), label: label || "New profile", fields: qfEmptyFields() };
}

async function qfGetState() {
  const r = await chrome.storage.local.get(QF_KEY);
  let s = r[QF_KEY];
  if (!s || typeof s !== "object") s = JSON.parse(JSON.stringify(QF_DEFAULT_STATE));
  if (!Array.isArray(s.profiles)) s.profiles = [];
  if (!s.settings || typeof s.settings !== "object") s.settings = { onlyEmpty: false };
  // make sure every profile has a complete fields object (handles future field additions)
  s.profiles.forEach((p) => {
    p.fields = Object.assign(qfEmptyFields(), p.fields || {});
    if (!p.id) p.id = qfUid();
    if (!p.label) p.label = "Profile";
  });
  // make sure activeId points at a real profile
  if (s.profiles.length && !s.profiles.some((p) => p.id === s.activeId)) {
    s.activeId = s.profiles[0].id;
  }
  return s;
}

async function qfSetState(s) {
  await chrome.storage.local.set({ [QF_KEY]: s });
  return s;
}

async function qfEnsureSeed() {
  const s = await qfGetState();
  if (s.profiles.length === 0) {
    const p = qfNewProfile("Profile 1");
    s.profiles.push(p);
    s.activeId = p.id;
    await qfSetState(s);
  }
  return s;
}
