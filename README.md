# Moraine State Park Bluebird Trail Monitoring System

An offline-first, mobile Progressive Web App (PWA) for Moraine State Park volunteers to monitor Eastern Bluebird nesting boxes in the field, designed specifically to solve cellular dead zones with automatic offline storage and background Google Sheets synchronization.

---

## 🌟 Key Features

1. **100% Offline Capability (Service Worker + Cache):**
   - Works seamlessly with zero cellular or Wi-Fi signal in the park.
   - Volunteers can install it directly to their iPhone or Android home screen with 1 tap (*"Add to Home Screen"*).
2. **Instant QR Code Scanning:**
   - Scan box QR codes with the phone's native camera or using the built-in in-app camera scanner.
   - Pre-fills Box Number and Trail Zone instantly.
3. **Optimized for Field Use:**
   - Large tap targets and +/- stepper buttons for rapid logging with one thumb.
   - Auto-remembers volunteer name so they never have to re-type it.
   - 1-tap GPS coordinates capture.
4. **Zero-Loss Data Queue & Auto-Sync:**
   - Every inspection is saved locally first.
   - When the phone reconnects to cell service or home Wi-Fi, it automatically syncs all pending checks to your Google Sheet under `dugslade@gmail.com`.
5. **Offline CSV Backup:**
   - Volunteers or coordinators can download a full `.csv` backup of all checks directly from their phone anytime.
6. **Printable QR Code Generator (`qr-generator.html`):**
   - Built-in generator to print weatherproof QR code stickers/labels for all Moraine boxes.
7. **Species & Nest Identification Guide:**
   - In-app guide for Eastern Bluebirds, Tree Swallows, House Wrens, Chickadees, and invasive House Sparrows.

---

## 📁 Project Structure

```
DougBlueBirdProject/
├── index.html                  # Main PWA mobile app interface
├── styles.css                  # Responsive field-optimized styling
├── app.js                      # Core offline storage, sync, & scanner logic
├── sw.js                       # Service Worker for offline caching
├── manifest.json               # Web App Manifest for mobile installation
├── qr-generator.html           # Tool to generate & print box QR labels
├── icons/                      # App icons for iOS & Android
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── lib/                        # Offline standalone JavaScript libraries
│   ├── html5-qrcode.min.js     # Live camera QR scanner engine
│   └── qrcode.min.js           # QR code generator library
└── google-apps-script/
    └── Code.gs                 # Webhook backend script for dugslade@gmail.com
```

---

## 🚀 Setup Guide (Connecting to `dugslade@gmail.com`)

### Step 1: Set Up Your Master Google Sheet

1. Open [Google Sheets](https://sheets.google.com) signed in as **`dugslade@gmail.com`**.
2. Create a new blank spreadsheet and name it:
   **`Moraine State Park - Bluebird Trail Monitoring`**
3. In the top menu, click **Extensions → Apps Script**.
4. In the Apps Script editor:
   - Delete any placeholder code.
   - Copy and paste the entire contents of [`DougBlueBirdProject/google-apps-script/Code.gs`](google-apps-script/Code.gs).
   - Click the **Save** (💾) icon.

### Step 2: Deploy the Webhook

1. In the top-right of Apps Script, click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure the settings:
   - **Description:** `Moraine Bluebird Sync`
   - **Execute as:** `Me (dugslade@gmail.com)`
   - **Who has access:** `Anyone` *(allows volunteers' phones to submit without needing a Google login)*
4. Click **Deploy**.
5. Click **Authorize access** and select your `dugslade@gmail.com` account. *(Click "Advanced" → "Go to Untitled project (unsafe)" if prompted by Google)*.
6. Copy the **Web App URL** (it looks like: `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 3: Link Webhook to the App

1. Open the Moraine Bluebird Web App.
2. Tap the **⚙️ Settings** tab.
3. Paste your Web App URL into the **Google Apps Script Webhook URL** field.
4. Click **🧪 Test Connection** and then **💾 Save Settings**.
5. Check your Google Sheet — you will see the **Inspections** sheet automatically created with styled forest-green headers!

---

## 🌐 Free Hosting Options for Volunteers

To allow volunteers to access the app URL on their phones:

### Option A: GitHub Pages (Recommended — 2 minutes)
1. Push this folder to a GitHub repository under your account.
2. Go to **Settings → Pages**.
3. Set Source to `main` branch `/ (root)` and click **Save**.
4. GitHub gives you a free HTTPS URL: `https://dugslade.github.io/DougBlueBirdProject/`.

### Option B: Cloudflare Pages / Netlify / Vercel
- Drag and drop the `DougBlueBirdProject` folder into [Netlify Drop](https://app.netlify.com/drop) or Cloudflare Pages for instant free HTTPS hosting.

---

## 🖨️ Printing Box QR Codes

1. Open [`DougBlueBirdProject/qr-generator.html`](qr-generator.html) in your browser.
2. Enter your live PWA URL (e.g. `https://dugslade.github.io/DougBlueBirdProject/`).
3. Set your Trail Name (e.g., `North Shore Trail`) and box numbers (e.g., `Box 1` to `Box 30`).
4. Click **Generate Labels** and then **Print Labels**.
5. Affix the weatherproof/laminated labels to the side or front of each box.

---

## 📱 How Volunteers Use It

1. **One-Time Installation:**
   - Volunteer opens the link on Safari (iOS) or Chrome (Android).
   - Taps **Share / Menu → Add to Home Screen**.
   - The app now lives on their phone like any native app and opens instantly without internet.
2. **At the Bird Box:**
   - Volunteer points their phone camera at the QR code on the box.
   - The app opens with Box Number and Trail already filled in.
   - Volunteer logs:
     - Species & Box Status
     - Egg count & Chick count (using `+` / `-` buttons)
     - Chick stage (Hatchling / Pin Feathers / Feathered)
     - Maintenance notes / comments
   - Taps **Save Inspection Check**.
3. **Automatic Sync:**
   - If offline: Data is saved safely into phone storage.
   - When signal is restored: Data automatically syncs into your master Google Sheet under `dugslade@gmail.com`.
