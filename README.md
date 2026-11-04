# CEPRO Immobilier — Lead Generation Form

Bilingual (FR / AR) 3-step lead form for **Résidence Prestige** and **Résidence Signature**.
HTML5 + CSS3 + vanilla JavaScript — no framework, no build step.

```
cepro-form/
├── index.html
├── style.css
├── script.js
├── README.md
└── assets/
    ├── cepro-logo.png               (original logo, white background removed)
    ├── cepro-logo-white.png         (same logo in white, for dark backgrounds)
    ├── residence-prestige.jpg       (1400 px)  + residence-prestige-sm.jpg  (720 px)
    └── residence-signature.jpg      (1400 px)  + residence-signature-sm.jpg (720 px)
```

---

## 1. What works locally vs. what needs configuration

| Works as soon as you open `index.html` | Requires real configuration |
|---|---|
| 3-step navigation, progress bar, transitions | `CONFIG.API_ENDPOINT` — backend that stores leads |
| FR / AR switch, LTR / RTL, no reload | `CONFIG.META_PIXEL_ID` — Meta Pixel |
| Residence → apartment types (reset on change) | `CONFIG.PRIVACY_POLICY_URL` — privacy policy link |
| Inline validation in the selected language | |
| Algerian mobile validation + normalization | |
| Loading state, duplicate-submit protection | |

All three settings are at the top of `script.js`, in the `CONFIG` object.

**No fake submission:** while `API_ENDPOINT` is still the placeholder, clicking
"Envoyer ma demande" shows an explicit "not connected to the server — no data was sent" message.
The success screen and the Meta `Lead` event only happen after the backend returns **HTTP 2xx**.
The privacy policy link stays hidden until a real URL is configured.

---

## 2. Run locally

Double-click `index.html` (or drag it into Chrome / Firefox / Safari / Edge). That's it.

Optional — to test with a real backend (browsers block some requests from `file://`):

```bash
cd cepro-form
python3 -m http.server 8080
# open http://localhost:8080
```

Useful URL parameters:
- `?lang=ar` opens the form directly in Arabic (handy for Arabic ad sets).
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`
  are captured and sent with the lead (non-personal attribution data).

---

## 3. Backend integration

### 3.1 Set the endpoint
In `script.js`:
```js
API_ENDPOINT: 'https://YOUR-REAL-BACKEND/leads',
```

### 3.2 Request sent by the form
`POST` · `Content-Type: application/json` · `credentials: 'omit'` · 15 s timeout

```json
{
  "last_name": "Benali",
  "first_name": "Amine",
  "phone": "+213555123456",
  "residence": "signature",
  "apartment_type": "F5 Attique",
  "preferred_contact_time": "afternoon",
  "language": "fr",
  "consent": true,
  "event_id": "1238bdf1-6fab-4673-b520-b3a6a3cdcc26",
  "submitted_at": "2026-11-04T08:27:17.456Z",
  "tracking": { "utm_source": "facebook", "page_url": "https://…/index.html" }
}
```

| Field | Values |
|---|---|
| `phone` | Always normalized to E.164: `+2135XXXXXXXX`, `+2136…`, `+2137…` |
| `residence` | `prestige` · `signature` |
| `apartment_type` | Prestige: `F4`, `F5 Duplex` — Signature: `F2`, `F3`, `F4`, `F5 Attique` |
| `preferred_contact_time` | `morning` (09–12h) · `afternoon` (12–16h) · `evening` (16–18h) |
| `language` | `fr` · `ar` |
| `event_id` | Unique per submission — use it to deduplicate with the Meta Conversions API |

### 3.3 Expected responses
| Response | Form behaviour |
|---|---|
| `2xx` (any body, or `{"success": true}`) | Success screen + Meta `Lead` event |
| `2xx` with `{"success": false}` | "Request could not be validated" message |
| `400–499` | "Request could not be validated" message |
| `429` | "Too many attempts" message |
| `5xx` | "Technical error, not saved" message |
| Network error / timeout | Connection / timeout message, user can retry |

### 3.4 Backend checklist
- **Re-validate everything server-side** (required fields, phone regex `^\+213[567]\d{8}$`,
  allowed residence/apartment combinations, `consent === true`). Never trust the browser.
- **CORS:** if the form and API are on different domains, answer the `OPTIONS` preflight with
  `Access-Control-Allow-Origin: https://your-form-domain`,
  `Access-Control-Allow-Methods: POST, OPTIONS`,
  `Access-Control-Allow-Headers: Content-Type, Accept`.
- Add **rate limiting** (per IP) and, if spam appears, a CAPTCHA such as Cloudflare Turnstile.
- Store leads in your CRM / database / Google Sheet, and notify the sales team.
- Record the consent and timestamp (proof of consent).
- Optional: forward the lead to the **Meta Conversions API** with the same `event_id`
  so Meta deduplicates browser + server events.

The form never writes personal data to `localStorage` and never logs it to the console.
Only the language preference (`cepro_lang`) is remembered.

---

## 4. Meta Pixel integration

1. In Meta Events Manager, copy your numeric Pixel ID.
2. In `script.js`: `META_PIXEL_ID: '123456789012345',` (your real ID).
3. Deploy. The script then loads the official Pixel code and fires:
   - `PageView` — on page load;
   - `Lead` — **only** after a 2xx backend response, with
     `content_name` (residence), `content_category` (apartment type) and `eventID` (dedup).
4. `Lead` is never fired on validation errors, unconfigured backend, server errors or timeouts.
   No name or phone number is ever sent to Meta by the browser.
5. Optional `<noscript>` fallback: see the commented block in `index.html`'s `<head>`.
6. Verify with the **Meta Pixel Helper** extension and the **Test Events** tab in Events Manager.
7. In your campaign, optimize for the **Lead** conversion event on the website.

Note: Meta requires the page to be served over **HTTPS** on a domain you have verified
in Business Manager (Brand Safety → Domains).

---

## 5. Hosting & deployment

The project is fully static — upload the folder as-is (keep `assets/` next to `index.html`).

- **Netlify / Vercel / Cloudflare Pages:** drag-and-drop the folder or connect a Git repo;
  HTTPS is automatic. Add your custom domain (e.g. `offres.cepro-immobilier.dz`).
- **Existing web host (cPanel, OVH, etc.):** upload the files via FTP into a folder or subdomain
  and enable a free Let's Encrypt SSL certificate.
- After deployment:
  1. set `API_ENDPOINT`, `META_PIXEL_ID`, `PRIVACY_POLICY_URL` in `script.js`;
  2. update `og:url`/`og:image` in `index.html` with absolute HTTPS URLs if you want rich link previews;
  3. submit one real test lead and confirm it arrives in your backend and in Meta Test Events.

---

## 6. Customization quick reference

- **Texts / translations:** `I18N.fr` and `I18N.ar` in `script.js`.
- **Apartment types per residence:** `RESIDENCES` in `script.js`.
- **Colors / fonts / radius:** CSS variables at the top of `style.css`.
- **Images:** replace the files in `assets/` keeping the same names.

Fonts (Jost + Cairo) load from Google Fonts; without internet, system fonts are used.
