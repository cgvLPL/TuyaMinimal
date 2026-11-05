# Home: a minimal PWA for Tuya devices

A clean, fast web app for your Tuya smart home, installable on phones and tablets.
It talks to Tuya's official Cloud API through a small proxy that runs on Vercel,
so your API secret never reaches the browser.

- Phone layout with bottom tabs, tablet layout with a side rail and a controls panel
- Lights (on/off, brightness, warm/neutral/cool), plugs and switches, air conditioners
  and thermostats, curtains, fans, sensors (door, motion, leak, smoke, temperature/humidity)
- Tap-to-run scenes and on/off switches for automations
- Light and dark mode, offline app shell, installable from Chrome or Safari
- Demo mode with sample devices: open `/?demo`

Not included: pairing new devices (keep using the Tuya app for that) and camera live view.

## Project layout

```
public/            the PWA (index.html, app.js, app.css, manifest, service worker, icons)
api/               Vercel serverless functions (the proxy)
  _lib/tuya.js     Tuya Cloud client: request signing and token handling
  _lib/http.js     password check, validation, errors
  state.js         GET  /api/state       homes, rooms, devices, scenes, automations
  command.js       POST /api/command     send commands to one device
  spec.js          GET  /api/spec        value ranges for a device's controls
  scene.js         POST /api/scene       run a scene
  automation.js    POST /api/automation  enable or disable an automation
```

No dependencies and no build step. Node 18 or newer (Vercel's default is fine).

## 1. Create a Tuya cloud project

1. Sign up at the Tuya Developer Platform (iot.tuya.com) with any email.
2. Go to **Cloud → Development → Create Cloud Project**.
   - Industry: Smart Home. Development method: Smart Home.
   - **Data center:** pick the same region your Tuya app account uses. If you are unsure,
     the Tuya app shows your region under Me → Settings → Account and Security.
3. Accept the API services it suggests during creation (IoT Core and Authorization are required).
4. Open the project's **Overview** tab and note the **Access ID/Client ID** and **Access Secret**.

## 2. Link your Tuya app account

1. In the project, open **Devices → Link App Account → Add App Account**. A QR code appears.
2. In the Tuya app on your phone, tap the scan icon (top right of the Home or Me tab) and scan it.
3. Your devices now appear under the project's **Devices** tab.
4. Find your **UID**: it's shown next to the linked account in the Link App Account list.

## 3. Deploy to Vercel

1. Put this folder in a GitHub repository (keep it private if you like), then on vercel.com
   choose **Add New → Project** and import it. Leave the build settings as they are;
   `vercel.json` already tells Vercel to serve `public/` and run `api/`.
   (Or, with the Vercel CLI installed: run `vercel` in this folder.)
2. In **Project → Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `TUYA_CLIENT_ID` | Access ID/Client ID from step 1 |
| `TUYA_CLIENT_SECRET` | Access Secret from step 1 |
| `TUYA_UID` | UID from step 2 |
| `TUYA_REGION` | `us` (Western America), `us-e` (Eastern America), `eu` (Central Europe), `eu-w` (Western Europe), `cn`, or `in` |
| `APP_PASSWORD` | A long passphrase you choose. The app asks for it on each new device. |

3. Redeploy (Deployments → ⋯ → Redeploy) so the variables take effect.
4. Open your `https://<project>.vercel.app` URL and enter your app password.

## 4. Install it

- **Android (Chrome):** menu → **Install app**, or Me → Install app inside Home.
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**.
- **Optional APK:** paste your Vercel URL into PWABuilder (pwabuilder.com) and download the
  Android package. It wraps the same web app, so updates you deploy show up automatically.

## Troubleshooting

- **"Finish setting up your server"**: an environment variable is missing or `TUYA_REGION`
  is misspelled. Fix it in Vercel, then redeploy.
- **"Tuya rejected the API credentials"**: the ID or secret is wrong, or the data center
  doesn't match `TUYA_REGION`.
- **No devices**: the app account isn't linked (step 2), or it was linked in a different data center.
- **Me → Needs attention shows "permission deny"**: the project lacks an API service for that
  section (often scenes or automations). In your cloud project open **Service API → Go to Authorize**
  and add the service that covers homes, scenes and automations, then refresh.
- **Everything stopped working after a month or so**: Tuya's free IoT Core plan has to be
  extended periodically. Check **Cloud → Cloud Services → IoT Core** and renew the trial.
- **A temperature looks 10× off**: open that device once so the app loads its exact scale.

## Security notes

- The Access Secret only lives in Vercel's environment variables. Never put it in `public/`.
- Every API call requires `APP_PASSWORD`. Anyone with your URL **and** that password can control
  your devices, so make it long and don't reuse it. Lock the app from Me on shared devices.
- The proxy only exposes the five endpoints above, validates every ID and command, and never
  forwards device local keys or IP addresses to the browser.

## Local development

```
cp .env.example .env.local   # fill in your values
npx vercel dev               # serves the app and the API on http://localhost:3000
```

To work on the interface without credentials, open `public/index.html` through any static
server and add `?demo` to the URL.
