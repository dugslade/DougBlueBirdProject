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
3. **Zero Configuration for Volunteers:**
   - The master Google Apps Script webhook URL is embedded directly into the app. Volunteers never need to configure settings.
4. **Optimized for Field Use:**
   - Large tap targets and +/- stepper buttons for rapid logging with one thumb.
   - Auto-remembers volunteer name so they never have to re-type it.
   - 1-tap GPS coordinates capture.
5. **Zero-Loss Data Queue & Auto-Sync:**
   - Every inspection is saved locally on the device first.
   - When the phone reconnects to cell service or home Wi-Fi, it automatically syncs all pending checks to your Google Sheet under `dugslade@gmail.com`.
6. **Offline CSV Backup:**
   - Volunteers or coordinators can download a full `.csv` backup of all checks directly from their phone anytime.
7. **Printable QR Code Generator (`qr-generator.html`):**
   - Built-in generator to print weatherproof QR code stickers/labels for all Moraine boxes.
8. **Species & Nest Identification Guide:**
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

## 📱 How New Volunteers Access & Prep the App

Because web browsers need to download the app files at least once while online to store them in the phone's offline cache, here are the 3 best ways to prepare volunteers:

### 1. Pre-Season Email / Text (Recommended)
Send volunteers a quick message before they head out for the season:

> *"Hi Team! Before heading out to Moraine State Park, please open this link on your phone while connected to Wi-Fi:*  
> 👉 **`https://dugslade.github.io/DougBlueBirdProject/`**  
> *Tap **Share → Add to Home Screen** (iPhone) or **Install App** (Android). The app will now work anywhere in the park, even without cell service!"*

### 2. Trailhead / Parking Lot "Start Here" QR Code
Most park parking lots and boat launches (e.g. McDanels Launch, Pleasant Valley) have at least basic cell signal, whereas deep wooded trails do not.
- Place a **"Welcome / Start Here" QR code** on the trailhead bulletin board or parking kiosk.
- Volunteers scan it once at their car before walking the trail. That 2-second scan downloads and locks the app into their phone's offline cache.

### 3. Automatic Caching on First Box Scan
If a new volunteer forgets to prep ahead of time, the moment they scan **any box** where they have even 1 bar of signal:
- The app loads.
- The **Service Worker silently saves the entire app into phone storage** in the background.
- As they walk deeper into the woods where signal drops to zero, all subsequent box scans will automatically load from their local cache instantly!

---

## 📲 How to Install on Phone (5 Seconds)

| **iPhone (Safari)** | **Android (Chrome)** |
| :--- | :--- |
| 1. Open the URL in Safari | 1. Open the URL in Chrome |
| 2. Tap the **Share** button (box with up arrow ⎋) | 2. Tap the **3 dots** (⋮) in top right |
| 3. Tap **"Add to Home Screen"** | 3. Tap **"Install App"** or **"Add to Home screen"** |

**Benefits after installing:**
- Bluebird app icon appears on their home screen.
- Launches full-screen like a native app (no browser search bar).
- Opens **instantly without internet**.
- Scanning any box QR code opens directly into the app.

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

The URL is already baked into `app.js` as the default. To verify or override:
1. Open the Moraine Bluebird Web App.
2. Tap the **⚙️ Settings** tab.
3. Your Web App URL should be pre-populated.
4. Click **🧪 Test Connection** and then **💾 Save Settings**.
5. Check your Google Sheet — you will see the **Inspections** sheet automatically created with styled forest-green headers!

---

## 🌐 Free HTTPS Hosting via GitHub Pages

To allow volunteers to access the app URL on their phones:

1. Go to your repository on GitHub:
   [https://github.com/dugslade/DougBlueBirdProject/settings/pages](https://github.com/dugslade/DougBlueBirdProject/settings/pages)
2. Under **Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** Select `main` and folder `/ (root)`
3. Click **Save**.
4. GitHub provides your permanent free HTTPS URL:
   👉 **`https://dugslade.github.io/DougBlueBirdProject/`**

---

## 🖨️ Printing Box QR Codes

1. Open [`DougBlueBirdProject/qr-generator.html`](qr-generator.html) in your browser.
2. Enter your live PWA URL (e.g. `https://dugslade.github.io/DougBlueBirdProject/`).
3. Set your Trail Name (e.g., `North Shore Trail`) and box numbers (e.g., `Box 1` to `Box 30`).
4. Click **Generate Labels** and then **Print Labels**.
5. Affix the weatherproof/laminated labels to the side or front of each box.

---

## 📝 Volunteer Field Inspection Workflow

1. **At the Bird Box:**
   - Volunteer points their phone camera at the QR code on the box.
   - The app opens with Box Number and Trail already filled in.
   - Volunteer logs:
     - Species & Box Status
     - Egg count & Chick count (using `+` / `-` buttons)
     - Chick stage (Hatchling / Pin Feathers / Feathered)
     - Maintenance notes / comments
   - Taps **Save Inspection Check**.
2. **Automatic Sync:**
   - If offline: Data is saved safely into phone storage with a yellow badge.
   - When signal is restored: Data automatically syncs into your master Google Sheet under `dugslade@gmail.com`.
