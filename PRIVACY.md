# Privacy Policy — QuickFill — Profile Autofill

**Effective date:** June 17, 2026

QuickFill ("the extension") is a browser extension that saves personal profiles
locally and fills web form fields on your command. This policy explains exactly
what the extension does and does not do with your data.

## Summary

- All profile data stays **on your own device**, in your browser's local storage.
- The extension makes **no network requests** and contacts **no servers**.
- There is **no account, no sign-in, no analytics, and no tracking**.
- Your data is **never sold, shared, or transmitted** to anyone, including the
  developer.

## What data the extension stores

You can create one or more profiles. Each profile may contain information you
choose to enter, such as:

- Name (first, middle, last, full)
- Email address and phone number
- Postal address (street, city, state/province, ZIP/postal code, country)
- Professional links (LinkedIn, GitHub, portfolio/website)
- Current company and job title
- A label you give the profile

You enter this information yourself. The extension does not collect anything you
do not type in.

## Where the data is stored

All profiles and settings are saved using the browser's
[`chrome.storage.local`](https://developer.chrome.com/docs/extensions/reference/api/storage)
API. This data:

- Lives only in the browser profile on the device where you entered it.
- Is **not** synced to any cloud or to the developer.
- Is removed if you uninstall the extension or clear its storage.

## How the data is used

Profile data is used for one purpose only: when you click **"Fill this page"**
or press the keyboard shortcut, the extension reads the active profile and types
the matching values into form fields on the current page. This happens entirely
within your browser.

The extension never reads or transmits the contents of pages you visit. It only
writes your saved values into form fields when you explicitly trigger a fill.

## Permissions and why they are needed

- **`storage`** — to save your profiles locally on your device.
- **`scripting`** + **host access (`<all_urls>`)** — to insert your saved values
  into form fields on the page you are on when you trigger a fill. Broad host
  access is required because job-application and sign-up forms can appear on any
  website, including forms embedded in cross-origin frames.
- **`activeTab`** — to identify and act on the tab you are currently using.

The extension runs its fill logic **only when you ask it to** (button click or
keyboard shortcut). It does not run automatically in the background on the pages
you browse.

## Sensitive fields

The extension never touches password fields, search boxes, file inputs, or
hidden fields.

## Data sharing

None. No data leaves your device. There are no third parties, no remote code,
and no external services involved.

## Children's privacy

The extension is a general-purpose form-filling tool and is not directed at
children. It collects no data beyond what you choose to store locally.

## Changes to this policy

If this policy changes, the updated version will be published in this repository
with a new effective date.

## Contact

For questions about this policy, open an issue at:
https://github.com/CJ2708/QuickFill/issues
