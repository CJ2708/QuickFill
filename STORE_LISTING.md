# Chrome Web Store listing — QuickFill

Copy/paste material for the Web Store developer dashboard. (Brave installs from
the same Chrome Web Store listing — there is no separate Brave submission.)

---

## Basic info

- **Name:** QuickFill — Profile Autofill
- **Category:** Productivity
- **Language:** English
- **Privacy policy URL:** https://github.com/CJ2708/QuickFill/blob/main/PRIVACY.md

---

## Short description (≤ 132 characters)

Save multiple personal profiles and autofill job applications and sign-up forms
with one click. All data stays on your device.

---

## Detailed description

QuickFill fills out web forms for you. Save one or more profiles — your name,
email, phone, address, LinkedIn/GitHub/portfolio links, and current company and
title — then fill any application or sign-up form with a single click or the
Alt+Shift+F shortcut.

Features
- Multiple profiles: keep separate profiles (e.g. for yourself and a family
  member) and switch the active one anytime.
- One-click fill: matches common fields by label, name, placeholder, and
  autocomplete hints, including forms inside frames and open shadow DOM.
- "Only fill empty fields" mode: leaves anything you have already typed alone.
- Works with React, Vue, and Angular forms (values register correctly, not just
  visually).
- Keyboard shortcut: press Alt+Shift+F on any page to fill with the active
  profile.

Privacy
- All data is stored locally on your device using the browser's local storage.
- No account, no servers, no analytics, no tracking. Nothing is uploaded.
- Passwords, search boxes, and file inputs are never touched.

Works in Chrome, Brave, Edge, and other Chromium browsers.

---

## Permission justifications

Paste these into the matching fields under "Privacy practices" in the dashboard.

### `storage`
Used to save the user's autofill profiles and settings locally on their device
via chrome.storage.local. No data is transmitted anywhere.

### `scripting`
Used to insert the user's saved profile values into form fields on the current
page, but only when the user explicitly triggers a fill (toolbar button or
keyboard shortcut). The extension does not run automatically on page load.

### `activeTab`
Used to identify and act on the tab the user is currently viewing when they
trigger a fill.

### Host permissions (`<all_urls>`)
Job-application and sign-up forms can appear on any website, and many enterprise
job portals embed their forms in cross-origin frames. Broad host access is
required so the extension can fill these forms wherever the user encounters
them. The extension only reads or writes page content in response to an explicit
user action and never transmits page contents off the device.

### "Are you using remote code?"
No. All code is contained in the extension package. No remote scripts are
loaded or executed.

### Data usage disclosures (check these)
- "Personally identifiable information" — YES (name, address, email, phone are
  stored locally by the user).
- Data is NOT sold or transferred to third parties.
- Data is NOT used for purposes unrelated to the core functionality.
- Data is NOT used for creditworthiness / lending.

---

## Assets still needed before submitting

- [ ] At least one screenshot, 1280×800 or 640×400 (popup with a profile is fine).
- [ ] Optional: small promo tile 440×280.
- [ ] Store icon is taken from the 128×128 icon already in the package.
- [ ] $5 one-time developer registration fee paid.

---

## Pre-submission checklist

- [ ] Privacy policy URL is publicly reachable (merge this branch to `main` first
      so the link above resolves).
- [ ] Version in manifest.json bumped if resubmitting an update.
- [ ] Zip built from the extension files only (see build note below).

## Building the upload zip

From the project root:

    rm -f ../QuickFill-vX.Y.Z.zip
    zip -r ../QuickFill-vX.Y.Z.zip . -x '.git/*' '.DS_Store' '*/.DS_Store' '.gitignore' 'PRIVACY.md' 'STORE_LISTING.md'

(The PRIVACY.md and STORE_LISTING.md docs are for the repo/dashboard, not the
shipped extension, so they are excluded from the package.)
