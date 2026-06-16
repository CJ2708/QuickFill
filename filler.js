// filler.js — defines fillPage(), which is injected into the page by chrome.scripting.
// IMPORTANT: this function is serialized and run inside the web page, so ALL helpers
// must live INSIDE fillPage and it may only depend on its arguments + page globals.

function fillPage(profile, opts) {
  opts = opts || {};
  const onlyEmpty = !!opts.onlyEmpty;

  // ---------- normalise + derive name variants ----------
  const norm = (s) => (s == null ? "" : String(s)).trim();
  const p = {};
  Object.keys(profile || {}).forEach((k) => (p[k] = norm(profile[k])));

  if (!p.fullName && (p.firstName || p.lastName)) {
    p.fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
  }
  if (p.fullName) {
    const parts = p.fullName.split(/\s+/);
    if (!p.firstName) p.firstName = parts[0] || "";
    if (!p.lastName && parts.length > 1) p.lastName = parts.slice(1).join(" ");
  }

  const valueFor = (key) => p[key] || "";

  // ---------- autocomplete attribute -> field key ----------
  const acMap = {
    "given-name": "firstName",
    "additional-name": "middleName",
    "family-name": "lastName",
    name: "fullName",
    email: "email",
    tel: "phone",
    "tel-national": "phone",
    "tel-local": "phone",
    "street-address": "addressLine1",
    "address-line1": "addressLine1",
    "address-line2": "addressLine2",
    "address-level2": "city",
    "address-level1": "state",
    "postal-code": "zip",
    country: "country",
    "country-name": "country",
    organization: "currentCompany",
    "organization-title": "currentTitle",
    url: "portfolio"
  };

  // ---------- keyword rules, most specific first ----------
  // [key, matchRegex, negativeRegex?]
  const rules = [
    ["email", /e[\s\-_]?mail/i],
    ["firstName", /(first|given|fore)[\s\-_]?name|fname|^first$/i],
    ["middleName", /middle[\s\-_]?name|mname/i],
    ["lastName", /(last|family|sur)[\s\-_]?name|lname|surname|^last$/i],
    ["phone", /\b(phone|telephone|tel|mobile|cell|whatsapp)\b|contact[\s\-_]?(no|number)/i],
    ["linkedin", /linked[\s\-_]?in/i],
    ["github", /git[\s\-_]?hub/i],
    [
      "portfolio",
      /portfolio|personal[\s\-_]?(site|website)|\bwebsite\b|web[\s\-_]?site|^url$|home[\s\-_]?page/i,
      /linked|git|company|employer/i
    ],
    ["addressLine2", /address[\s\-_]?(line)?[\s\-_]?2|line[\s\-_]?2|\b(apartment|apt|suite|unit|floor)\b/i],
    ["addressLine1", /\bstreet\b|address[\s\-_]?(line)?[\s\-_]?1|^address$|^addr$|mailing[\s\-_]?address/i,
      /e[\s\-_]?mail|ip[\s\-_]?address|mac[\s\-_]?address|web/i],
    ["city", /\bcity\b|\btown\b|address[\s\-_]?level[\s\-_]?2|municipalit/i],
    ["state", /\bstate\b|province|region|county|address[\s\-_]?level[\s\-_]?1/i, /united\s?states|real\s?estate/i],
    ["zip", /\bzip\b|postal|post[\s\-_]?code|pin[\s\-_]?code|pincode|postcode/i],
    ["country", /\bcountry\b|nationalit/i],
    ["currentTitle", /job[\s\-_]?title|current[\s\-_]?(job|title|role)|designation|\bposition\b|\btitle\b|\brole\b/i],
    ["currentCompany", /\bcompany\b|\bemployer\b|organi[sz]ation|\bfirm\b|workplace/i],
    [
      "fullName",
      /full[\s\-_]?name|legal[\s\-_]?name|your[\s\-_]?name|applicant[\s\-_]?name|candidate[\s\-_]?name|^name$|\bname\b/i,
      /user|file|company|employer|organi|business|first|last|middle|display|nick|screen|brand|product|project|account|domain|host|event|pet|child|parent|mother|father|emergency|reference|contact[\s\-_]?name/i
    ]
  ];

  // ---------- build a text "signature" for a field ----------
  function safeAttr(el, name) {
    try { return el.getAttribute(name) || ""; } catch (e) { return ""; }
  }
  function labelText(el) {
    let t = "";
    try {
      if (el.id) {
        const lab = (el.getRootNode() || document).querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id) + '"]');
        if (lab) t += " " + lab.textContent;
      }
      const wrap = el.closest ? el.closest("label") : null;
      if (wrap) t += " " + wrap.textContent;
      const lb = safeAttr(el, "aria-labelledby");
      if (lb) lb.split(/\s+/).forEach((id) => { const n = document.getElementById(id); if (n) t += " " + n.textContent; });
    } catch (e) {}
    return t;
  }
  function signature(el) {
    return [
      el.name, el.id,
      safeAttr(el, "placeholder"), safeAttr(el, "aria-label"), safeAttr(el, "title"),
      safeAttr(el, "data-automation-id"), safeAttr(el, "data-test"), safeAttr(el, "data-testid"),
      safeAttr(el, "ng-reflect-name"),
      labelText(el)
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function keyForField(el) {
    const type = (safeAttr(el, "type") || el.type || "").toLowerCase();
    const ac = (safeAttr(el, "autocomplete") || "").toLowerCase().trim();
    if (ac && acMap[ac]) return acMap[ac];
    if (type === "email") return "email";
    if (type === "tel") return "phone";

    const sig = signature(el);
    if (!sig) return type === "url" ? "portfolio" : null;

    // never touch search / filter / query boxes
    if (/(^|[\s_\-])(search|query|filter|keyword)([\s_\-]|$)/.test(sig)) return null;

    for (const [key, re, neg] of rules) {
      if (re.test(sig)) {
        if (neg && neg.test(sig)) continue;
        return key;
      }
    }
    return type === "url" ? "portfolio" : null;
  }

  // ---------- fillability checks ----------
  const SKIP_TYPES = new Set([
    "password", "hidden", "submit", "button", "reset", "image",
    "file", "checkbox", "radio", "range", "color", "search"
  ]);

  function isVisible(el) {
    try {
      if (el.disabled || el.readOnly) return false;
      const st = window.getComputedStyle(el);
      if (!st) return true;
      if (st.display === "none" || st.visibility === "hidden" || st.visibility === "collapse" || st.opacity === "0") return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0 && el.offsetParent === null) return false;
    } catch (e) {}
    return true;
  }

  // ---------- value setters that frameworks (React/Vue/Angular) notice ----------
  function setInputValue(el, value) {
    let proto = HTMLInputElement.prototype;
    if (el.tagName === "TEXTAREA") proto = HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    try { el.focus({ preventScroll: true }); } catch (e) {}
    if (el._valueTracker && typeof el._valueTracker.setValue === "function") {
      try { el._valueTracker.setValue(""); } catch (e) {}
    }
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    try { el.dispatchEvent(new Event("blur", { bubbles: true })); } catch (e) {}
  }

  function setSelectValue(el, value) {
    if (!value) return false;
    const v = value.toLowerCase().trim();
    let matched = null;
    for (const opt of el.options) {
      if (opt.value.toLowerCase().trim() === v || opt.text.toLowerCase().trim() === v) { matched = opt; break; }
    }
    if (!matched) {
      for (const opt of el.options) {
        const ot = opt.text.toLowerCase().trim();
        if (ot.length < 2) continue;
        if (ot.includes(v) || v.includes(ot)) { matched = opt; break; }
      }
    }
    if (!matched) return false;
    el.value = matched.value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  // ---------- collect fields, including open shadow DOM ----------
  function collect(root, out, depth) {
    if (depth > 12) return;
    let nodes;
    try { nodes = root.querySelectorAll("input, textarea, select"); } catch (e) { return; }
    nodes.forEach((n) => out.push(n));
    let all;
    try { all = root.querySelectorAll("*"); } catch (e) { return; }
    all.forEach((el) => { if (el.shadowRoot) collect(el.shadowRoot, out, depth + 1); });
  }

  const fields = [];
  collect(document, fields, 0);

  let filled = 0;
  for (const el of fields) {
    try {
      const tag = el.tagName;
      const type = (safeAttr(el, "type") || el.type || "").toLowerCase();
      if (tag === "INPUT" && SKIP_TYPES.has(type)) continue;
      if (!isVisible(el)) continue;

      const key = keyForField(el);
      if (!key) continue;
      const value = valueFor(key);
      if (!value) continue;

      if (tag === "SELECT") {
        if (onlyEmpty && el.value) continue;
        if (setSelectValue(el, value)) filled++;
        continue;
      }

      const current = (el.value || "").trim();
      if (onlyEmpty && current) continue;
      if (current === value) continue;
      setInputValue(el, value);
      filled++;
    } catch (e) {
      // never let one weird field break the whole run
    }
  }

  return filled;
}
