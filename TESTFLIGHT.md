# Shipping cycle vault to the iOS App Store via TestFlight (Capacitor)

A complete, ordered runbook for wrapping the existing **cycle vault** Vite/React PWA with
[Capacitor](https://capacitorjs.com) and shipping it to TestFlight, then the App Store, as a
**paid-upfront $3.99 app** (no IAP, no subscription, no purchase code).

> **App facts**
> - Privacy-first menstrual cycle tracker. React 19 + Vite + TypeScript + Tailwind v4. All data in `localStorage`, no backend, no accounts, no analytics.
> - Proposed bundle id: `com.yigitdurna.cyclevault` (you can change it; it must be registered as an App ID).
> - Display name: **cycle vault** (always lowercase, user-facing).
> - Monetization: **paid upfront, $3.99 one-time**. Price is set in App Store Connect via the price point. **No StoreKit / IAP code is required at all.**

> ✅ **AS BUILT (updated 2026-07-02).** The app IS on TestFlight — builds 1–6 uploaded; this document was
> the original plan and parts of it drifted from reality. What's actually true now:
> - **SPM, not CocoaPods** — the ios/ project uses Swift Package Manager; skip every `pod` step.
> - **Plugins actually installed:** app, filesystem, local-notifications, preferences, share.
>   (status-bar / splash-screen / haptics / biometric-auth were never added.)
> - **Everyday ship loop is fully CLI, no Xcode GUI** — see the "iOS / TestFlight" section of CLAUDE.md:
>   `npm run build:ios && npx cap sync ios`, bump `CURRENT_PROJECT_VERSION` in project.pbxproj,
>   `xcodebuild … archive` then `xcodebuild -exportArchive` (method app-store-connect, destination upload),
>   both with `GIT_CONFIG_GLOBAL=/dev/null` (a global SSH-insteadOf git rule breaks SPM clones otherwise).
> - **Export compliance** is declared in Info.plist (`ITSAppUsesNonExemptEncryption=NO`) — no per-build prompt.
> - **Build history:** 1–3 initial internal-testing builds · 4 period data-loss fix (notification opening a
>   second open cycle) · 5 broadened overlap guards + stale-notification cleanup · 6 working export via
>   share sheet + durable Preferences storage mirror (export confirmed working on device).

> ⚠️ **Version-sensitive note (verified June 2026):** Capacitor stable is **8.x** (`@capacitor/core@8.4.0`).
> Capacitor 8 **requires Node 22+ and Xcode 26.0+**. Capacitor 9 is in alpha — do **not** use it for a store
> submission. Pin to `^8`. Re-check `npm view @capacitor/core version` before you start, and confirm the Xcode
> requirement on the [support policy page](https://capacitorjs.com/docs/main/reference/support-policy).

---

## 0. The big picture

```
Vite build (base "/")  →  dist/  →  npx cap sync ios  →  Xcode archive  →  App Store Connect  →  TestFlight  →  App Store
```

Capacitor copies your built `dist/` into the native iOS project (`ios/App/App/public`) and loads it in a
`WKWebView`. The web app must therefore build with a **root base path** (`/`), not the GitHub Pages
`/cycle-vault/` base. See §3.

---

## 1. Prerequisites

| Tool | Required version | Check / install |
| --- | --- | --- |
| macOS | Recent (Sonoma/Sequoia or newer) | — |
| Xcode | **26.0+** (required by Capacitor 8 + 2026 SDK) | App Store → Xcode |
| Xcode Command Line Tools | matching Xcode | `xcode-select --install` |
| CocoaPods | latest | `sudo gem install cocoapods` then `pod --version` |
| Node.js | **22 LTS or newer** | `node -v` |
| npm | bundled with Node | `npm -v` |
| Apple Developer Program | enrolled (you are ✅) | [developer.apple.com](https://developer.apple.com) |

**One-time Xcode setup:**

1. Launch Xcode once and let it install additional components.
2. `sudo xcodebuild -license accept`
3. Sign in to your Apple ID: **Xcode → Settings → Accounts → +** → add your Apple ID (the one in the Developer Program).
4. Confirm your Team appears (it'll be your name / "Yigit Durna" personal team or org team).

**Signing identities** — for a real submission you need a **Distribution** signing setup. The simplest path is
**Automatic signing** (Xcode manages certificates + provisioning profiles for you). We use that below (§7). If you
prefer manual, create an *Apple Distribution* certificate and an *App Store* provisioning profile in the Developer
portal, but automatic is recommended for a solo developer.

---

## 2. Install Capacitor into the existing Vite project

From the repo root (`/Users/yigit/_dev/projects/cycle-vault`):

```bash
# Core runtime + CLI (dev) + iOS platform
npm install @capacitor/core@^8
npm install -D @capacitor/cli@^8
npm install @capacitor/ios@^8
```

Initialize Capacitor (interactive, or skip the prompts by passing args):

```bash
npx cap init "cycle vault" com.yigitdurna.cyclevault --web-dir dist
```

This creates `capacitor.config.ts`. Replace it with the following (TypeScript config is preferred for a TS project):

**`capacitor.config.ts`**
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yigitdurna.cyclevault',
  appName: 'cycle vault',
  webDir: 'dist',
  ios: {
    // Use the modern web content mode; keeps the webview from showing
    // a translucent/web-y bounce on overscroll.
    contentInset: 'always',
  },
  // Helps Capacitor surface JS errors during dev; harmless in release.
  loggingBehavior: 'none',
};

export default config;
```

> `webDir: 'dist'` must match Vite's output dir. cycle vault uses the default `dist/`.

**Build the web app first, then add the iOS platform** (the `cap add` step copies `dist/` in, so it must exist):

```bash
npm run build:ios      # see §3 — produces dist/ with base "/"
npx cap add ios        # creates the native ios/ Xcode project + runs pod install
npx cap sync ios       # copies web assets + installs/updates native plugins
```

`npx cap add ios` generates `ios/App/App.xcworkspace` (open the **`.xcworkspace`**, never the `.xcodeproj`).

**What `cap sync` does:** copies `dist/` → `ios/App/App/public`, updates the native plugin list, and runs
`pod install`. Run it after **every** web rebuild and after adding/removing any plugin.

Commit the generated `ios/` directory to git (it's part of the app). Add `ios/App/Pods/` and
`ios/App/App/public/` to `.gitignore` if you prefer to keep generated/vendored content out — but committing
`Pods/` is also fine for reproducibility.

---

## 3. The Vite base-path issue (GitHub Pages `/cycle-vault/` vs Capacitor `/`)

**Problem:** `vite.config.ts` sets `base: '/cycle-vault/'` so assets resolve correctly under
`https://yigitdurna.github.io/cycle-vault/`. Inside the Capacitor app, the web bundle is served from the
**app bundle root** (`capacitor://localhost/`), so a `/cycle-vault/` prefix produces broken asset URLs and a
blank white screen.

**Fix:** keep the GitHub Pages build on `/cycle-vault/` and give the Capacitor build a **`/` base** via a
separate build mode/env. Drive `base` from an environment variable.

**`vite.config.ts`** — change the `base` line:
```ts
export default defineConfig({
  // Capacitor build sets CAP_BUILD=1 → root base; GitHub Pages keeps /cycle-vault/
  base: process.env.CAP_BUILD ? '/' : '/cycle-vault/',
  // ...rest unchanged
});
```

> Also relevant: the `VitePWA` `manifest.start_url` is `/cycle-vault/`. The bundled service worker is **not
> needed inside Capacitor** (Capacitor serves assets natively and can conflict with an aggressive SW). It's
> harmless but you can skip registering it under Capacitor. The simplest safe choice is to leave PWA config as-is
> for the web build — it does not break the native build, since the native shell ignores `start_url`. If you see
> caching weirdness in the native app, disable SW registration when `CAP_BUILD` is set.

**`package.json`** — add a Capacitor build script:
```jsonc
{
  "scripts": {
    "build": "vite build",
    "build:ios": "CAP_BUILD=1 vite build && npx cap copy ios"
  }
}
```

Now:
- **GitHub Pages deploy** keeps using `npm run build` → base `/cycle-vault/` (unchanged; existing Action still works).
- **Capacitor** uses `npm run build:ios` → base `/` and copies into the native project.

> Sanity check after `npm run build:ios`: open `dist/index.html` and confirm asset URLs start with `/assets/…`,
> **not** `/cycle-vault/assets/…`.

---

## 4. Recommended Capacitor plugins (native features)

These native capabilities both make the app genuinely useful **and** satisfy Guideline 4.2 (§6). Install only what
you'll actually wire up — but local notifications + biometric lock are strongly recommended for this app.

Install all at once, then `cap sync`:

```bash
npm install @capacitor/local-notifications@^8 \
            @capacitor/status-bar@^8 \
            @capacitor/splash-screen@^8 \
            @capacitor/haptics@^8 \
            @aparajita/capacitor-biometric-auth
npx cap sync ios
```

| Feature | Plugin | Notes |
| --- | --- | --- |
| Period / fertile-window reminders | [`@capacitor/local-notifications`](https://capacitorjs.com/docs/apis/local-notifications) | Schedule local notifications on-device. **Requires a runtime permission request** before scheduling. No server needed — perfect for a no-backend app. |
| Biometric / passcode lock | [`@aparajita/capacitor-biometric-auth`](https://github.com/aparajita/capacitor-biometric-auth) (`@aparajita/capacitor-biometric-auth`) | Actively maintained, **requires Capacitor 8+**. Wraps Face ID / Touch ID / device passcode. Use it to gate app entry. |
| Status bar styling | [`@capacitor/status-bar`](https://capacitorjs.com/docs/apis/status-bar) | Match the dark `#0A0A0A` theme; set style to light content. |
| Splash screen | [`@capacitor/splash-screen`](https://capacitorjs.com/docs/apis/splash-screen) | Native launch screen; hide it from JS once React mounts. |
| Haptics | [`@capacitor/haptics`](https://capacitorjs.com/docs/apis/haptics) | Subtle feedback on logging actions — a clear "native tell" for review. |

> ⚠️ **Plugin version note:** Capacitor official plugins are versioned to match core — use `^8`. Third-party
> plugins (biometric) version independently; install the latest and confirm its README states Capacitor 8 support.
> Run `npm view @aparajita/capacitor-biometric-auth version` to see the current release.

### 4.1 Permissions & Info.plist usage-description keys

iOS **rejects** apps that use a sensitive API without a purpose string. Add these to
`ios/App/App/Info.plist` (Xcode → select `Info.plist` → add rows, or edit the XML):

| Key | Needed for | Example string |
| --- | --- | --- |
| `NSFaceIDUsageDescription` | Biometric plugin (Face ID) | `cycle vault uses Face ID to keep your health data private on this device.` |

```xml
<key>NSFaceIDUsageDescription</key>
<string>cycle vault uses Face ID to keep your health data private on this device.</string>
```

> **Local notifications do NOT need an Info.plist key** — they require a **runtime permission prompt**. Call
> `LocalNotifications.requestPermissions()` before scheduling, and `checkPermissions()` to see current status.
> Touch ID / device-passcode fallback does not need a key; only Face ID requires `NSFaceIDUsageDescription`.

**Local-notifications minimal flow (illustrative):**
```ts
import { LocalNotifications } from '@capacitor/local-notifications';

const { display } = await LocalNotifications.requestPermissions();
if (display === 'granted') {
  await LocalNotifications.schedule({
    notifications: [{
      id: 1,
      title: 'cycle vault',
      body: 'Your next period is predicted to start soon.',
      schedule: { at: nextPeriodDate },
    }],
  });
}
```

**Biometric lock minimal flow (illustrative):**
```ts
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';

const info = await BiometricAuth.checkBiometry();
if (info.isAvailable) {
  await BiometricAuth.authenticate({
    reason: 'Unlock cycle vault',
    iosFallbackTitle: 'Use passcode',
  });
}
```

---

## 5. App icons & splash screens

Use the official [`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) generator — it produces
every required iOS icon size and the splash assets from one source image.

```bash
npm install -D @capacitor/assets
```

Create an `assets/` directory at the repo root with **Easy Mode** source files:

```
assets/
├── icon.png         # ≥ 1024×1024 px, square, no transparency, no rounded corners
├── logo-dark.png    # optional dark-mode logo
└── splash.png       # ≥ 2732×2732 px (centered logo on solid background)
```

> Apple icons must be **1024×1024, opaque (no alpha), square** (Apple applies the rounded mask). Splash source
> should be **≥ 2732×2732** so it fills the largest device.

Generate, then sync:

```bash
npx capacitor-assets generate --ios
npx cap sync ios
```

This writes the iOS `AppIcon.appiconset` and splash storyboard assets into `ios/App/App/Assets.xcassets`.
The 1024×1024 **App Store marketing icon** is also generated — App Store Connect pulls it from the build.

---

## 6. Avoiding Guideline 4.2 rejection (minimum functionality)

Web-wrapped apps get rejected under **Guideline 4.2** when they're "just a repackaged website." cycle vault must
**feel native**. Checklist — verify each before submitting:

- [ ] **Native features present and working** (this is the strongest signal):
  - [ ] **Local notifications** for period reminders (a website cannot do this on iOS reliably).
  - [ ] **Biometric / passcode lock** on app entry.
  - [ ] **Haptics** on key interactions.
  - [ ] Native **status bar** styling and **splash screen**.
- [ ] **Fully offline** — the app has no backend and stores everything in `localStorage`, so it must work in
      Airplane Mode end-to-end. Test it. No "no internet connection" web errors should ever appear.
- [ ] **No web "tells":**
  - [ ] No browser chrome, URL bar, loading spinners that look like a page load, or pull-to-refresh that reloads a page.
  - [ ] No external links that bounce the user to Safari for core functionality.
  - [ ] Disable the WKWebView overscroll "bounce showing white/background" if it looks web-y (configure via `contentInset` / CSS `overscroll-behavior: none`).
  - [ ] No text like "website", "web app", or "open in browser" in the UI.
- [ ] **App-like navigation** — native-feeling bottom tab bar (Home / Calendar / History / Settings already exists; ensure it behaves like a tab bar, not web nav).
- [ ] **Follows the iOS Human Interface Guidelines** (safe-area insets respected, dark theme consistent, tap targets sized for touch).
- [ ] In **review notes** (§8), explicitly list the native features so the reviewer doesn't miss them.

---

## 7. Xcode project configuration

Open the workspace:

```bash
npx cap open ios     # opens ios/App/App.xcworkspace in Xcode
```

In Xcode, select the **App** target → **Signing & Capabilities** and **General** tabs:

### Signing & Capabilities
- [ ] **Automatically manage signing** ✅
- [ ] **Team:** select your Apple Developer Program team.
- [ ] **Bundle Identifier:** `com.yigitdurna.cyclevault` (must exactly match the App ID you register in §8).
- [ ] Add capabilities only as needed. For this app you generally need **none** beyond defaults
      (local notifications and Face ID do **not** require an entitlement/capability — they're permission-based).
      Do **not** add Push Notifications (that's remote APNs, which we don't use).

### General / Build Settings
- [ ] **Display Name:** `cycle vault`
- [ ] **Minimum Deployments / iOS Deployment Target:** set to what Capacitor 8 supports (Capacitor 8 targets a
      modern minimum — accept the default Xcode/Capacitor sets, typically **iOS 14.0+**; don't lower it).
- [ ] **Version** (CFBundleShortVersionString): your marketing version, e.g. `1.0` (or mirror `package.json` 7.0.0
      if you prefer — but App Store version numbering is independent; **`1.0` is the conventional first release**).
- [ ] **Build** (CFBundleVersion): `1`. **Must increase for every upload** to TestFlight/App Store
      (e.g. `1`, `2`, `3`…). Two uploads can never share the same build number for the same version.
- [ ] **Device Orientation:** check **Portrait** only (the PWA manifest is portrait-locked; match it). Uncheck
      Landscape Left/Right and Upside Down for iPhone.
- [ ] **Supported destinations:** iPhone (add iPad only if you've tested the layout on iPad — otherwise leave
      iPhone-only to avoid iPad-specific screenshot requirements and review of iPad layout).

> After any plugin or `Info.plist` change made outside Xcode, re-run `npx cap sync ios`.

---

## 8. App Store Connect setup

Go to [App Store Connect](https://appstoreconnect.apple.com).

### 8.1 Register the App ID (bundle id)
1. [Developer portal → Certificates, IDs & Profiles → Identifiers → +](https://developer.apple.com/account/resources/identifiers/list).
2. Choose **App IDs → App**.
3. **Bundle ID: Explicit** = `com.yigitdurna.cyclevault`. Description: `cycle vault`.
4. Leave all Capabilities **off** (none needed). Register.

> If you used Automatic signing in Xcode, Xcode may have already created the App ID — verify it exists and matches.

### 8.2 Accept the Paid Apps Agreement (required for a paid app)
- **App Store Connect → Business / Agreements, Tax, and Banking**: the Account Holder must **accept the Paid
  Applications Agreement** and complete **tax** and **banking** info. **Without this, you cannot sell a paid app.**

### 8.3 Create the app record
- **App Store Connect → Apps → + → New App**:
  - Platform: **iOS**
  - Name: **cycle vault** (must be unique on the App Store; if taken, append a qualifier)
  - Primary language: **English (U.S.)**
  - Bundle ID: select `com.yigitdurna.cyclevault`
  - SKU: any internal string, e.g. `cyclevault-ios`
  - User Access: Full Access

### 8.4 Set the $3.99 price
- **App → Distribution → Pricing and Availability** (a.k.a. *Monetization → Pricing*):
  - Click **Add Pricing** in Price Schedule.
  - Base country: **United States**.
  - Choose the **$3.99** price point. Apple auto-calculates equivalents for all other storefronts (review the
    Comparable Prices screen, then Confirm).
  - **No in-app purchase / subscription is created. There is zero StoreKit code.** The price point alone makes it
    a paid-upfront app.

### 8.5 App Privacy ("nutrition label") — Data Not Collected
- **App → App Privacy → Get Started / Edit**.
- Answer **"Do you or your third-party partners collect data from this app?" → No.**
- This yields the **"Data Not Collected"** label. This is accurate: all data is local, no backend, no analytics,
  no third-party SDKs that phone home.
- Double-check you haven't added any analytics/crash SDK that would invalidate this claim.

### 8.6 Age rating
- **App → Age Rating → Edit.** Answer the questionnaire truthfully. A cycle tracker with health/wellness content
  typically lands at **12+** (due to "Infrequent/Mild Medical/Treatment Information"). Do not overclaim. Let the
  questionnaire compute the rating.

### 8.7 Privacy policy URL (required)
- **App → App Information → Privacy Policy URL:** `https://yigitdurna.github.io/cycle-vault/privacy.html`
- Ensure that page actually exists and loads (publish `privacy.html` to the GitHub Pages site if not already).

### 8.8 Screenshots (required) — 2026 sizes
Upload under the version → **Previews and Screenshots**. As of 2026, the **required** set is the **6.9-inch
iPhone**:

| Display | Pixel size (portrait) | Required? |
| --- | --- | --- |
| **6.9-inch iPhone** (e.g. 17 Pro Max) | **1320 × 2868** | **Yes — primary required set** |
| 6.5-inch iPhone (fallback) | 1242 × 2688 / 1284 × 2778 | Only if you don't provide 6.9-inch |
| 13-inch iPad | 2064 × 2752 | Only if the app supports iPad |

- Provide **3–10** screenshots. Capture from a 6.9-inch simulator (or device) running the real app.
- ⚠️ **Exact pixel dimensions only** — a single pixel off gets rejected.
- If you set the app **iPhone-only** (§7), you do **not** need iPad screenshots.

### 8.9 Description, keywords, metadata
- **Promotional text / Description:** explain it's a **private, local-only** cycle tracker; no account, no
  cloud, no ads, no tracking. Lead with the privacy angle and the native features (reminders, Face ID lock).
- **Keywords** (100 chars, comma-separated, no spaces wasted): e.g.
  `period,cycle,menstrual,tracker,privacy,offline,reminder,fertility,health,calendar`
  (avoid trademarks and competitor names; don't repeat the app name).
- **Support URL:** a reachable page (your GitHub Pages site is fine).
- **Category:** Health & Fitness (primary).

### 8.10 Review notes (App Review Information)
Fill the **Notes** field so the reviewer can evaluate it without friction:

> cycle vault is a **local-only** menstrual cycle tracker. **No account or login is required** — all data is
> stored on-device in the app. To test: open the app, optionally enable Face ID lock in Settings, log a period
> from Home or the Calendar, and you'll see predictions, phase insights, and a history. Period-reminder local
> notifications can be enabled in Settings (the app will request notification permission). The app works fully
> **offline** (Airplane Mode). There is **no in-app purchase or subscription** — it's a paid-upfront app.

- **Sign-In required:** No. Leave demo account fields empty.
- **Contact info:** your email/phone for the reviewer.

---

## 8b. Health-app specifics (avoid medical-device / FDA territory)

Menstrual/fertility tracking can drift into **medical claims** that trigger stricter review (or imply an FDA
medical-device classification). Stay safely on the "wellness/informational" side:

- [ ] **Do NOT** market or describe the app as a **contraceptive** or birth-control method, or as preventing
      pregnancy. No "natural birth control", "contraception", "don't get pregnant" language anywhere
      (description, screenshots, in-app copy).
- [ ] **Do NOT** make diagnostic or treatment claims (e.g. "detects PCOS", "diagnoses", "treats").
- [ ] Frame predictions as **estimates/informational**, not medical advice.
- [ ] Include a **medical disclaimer** in-app (Settings/About) and in the description, e.g.:

> **Medical disclaimer:** cycle vault is for general informational and wellness tracking only. It is not a
> medical device and does not provide medical advice, diagnosis, treatment, or contraception. Predictions are
> estimates and may be inaccurate. Consult a qualified healthcare professional for medical concerns.

- [ ] Keep the age rating honest (§8.6) — health/medical info content affects it.

---

## 9. TestFlight flow

### 9.1 Archive in Xcode
1. In Xcode, set the build destination to **Any iOS Device (arm64)** (top toolbar) — not a simulator.
2. Confirm **Version** and **Build** (§7); bump **Build** if you've uploaded before.
3. Rebuild web + sync first: `npm run build:ios && npx cap sync ios`.
4. **Product → Archive.** Wait for the build; the **Organizer** window opens with the archive.

### 9.2 Upload to App Store Connect
1. In Organizer, select the archive → **Distribute App**.
2. Choose **App Store Connect → Upload**.
3. Accept the defaults (automatic signing, include symbols). Upload.
4. The build appears in **App Store Connect → your app → TestFlight** after processing (a few minutes to ~1 hour).
   You may get an email if there are entitlement/asset warnings.

> First upload often shows "Missing Compliance" — answer the **Export Compliance** question. cycle vault uses only
> standard HTTPS/OS encryption and no proprietary crypto, so you can typically answer that it's **exempt**
> (standard encryption). You can also pre-answer by adding `ITSAppUsesNonExemptEncryption = NO` to `Info.plist` to
> skip the prompt on every build.

### 9.3 Internal vs external testers
- **Internal testers** (up to 100): members of your App Store Connect team. **No beta review required** — they can
  install almost immediately after the build finishes processing. Best for your own devices.
- **External testers** (up to 10,000): anyone via email or a public link. The **first** external build requires
  **Beta App Review** (usually fast, often < 24h). Add testers/groups under **TestFlight → External Testing**, fill
  the **Test Information** (what to test, contact email, the beta description), and submit for beta review.

### 9.4 How testers install
1. Testers install the **TestFlight** app from the App Store.
2. They accept your email invite **or** open your public TestFlight link.
3. They tap **Install** in TestFlight and run the beta. Builds expire after **90 days**.

---

## 10. From TestFlight to App Store (final submission)

When the beta looks good:
1. **App Store Connect → your app → (version) → Build:** attach the uploaded build.
2. Confirm Pricing ($3.99), App Privacy (Data Not Collected), Age Rating, Privacy Policy URL, Screenshots,
   Description/Keywords, and Review Notes are all complete.
3. **Add for Review → Submit for Review.** Full App Review (separate from beta review) typically takes ~24–48h.
4. On approval, choose **Manual** or **Automatic** release.

---

## 11. Command cheat-sheet

```bash
# --- one-time setup ---
npm install @capacitor/core@^8 @capacitor/ios@^8
npm install -D @capacitor/cli@^8 @capacitor/assets
npx cap init "cycle vault" com.yigitdurna.cyclevault --web-dir dist

# plugins
npm install @capacitor/local-notifications@^8 @capacitor/status-bar@^8 \
            @capacitor/splash-screen@^8 @capacitor/haptics@^8 \
            @aparajita/capacitor-biometric-auth

# build web for Capacitor (root base "/") then add iOS platform
npm run build:ios          # = CAP_BUILD=1 vite build && npx cap copy ios
npx cap add ios            # first time only

# generate icons + splash from assets/icon.png & assets/splash.png
npx capacitor-assets generate --ios

# --- everyday loop ---
npm run build:ios          # rebuild web with base "/"
npx cap sync ios           # copy assets + sync native plugins + pod install
npx cap open ios           # open App.xcworkspace in Xcode

# in Xcode: select "Any iOS Device", bump Build number, Product → Archive → Distribute → Upload

# handy checks
npm view @capacitor/core version
npm view @aparajita/capacitor-biometric-auth version
node -v          # need 22+
pod --version
xcodebuild -version
```

---

## 12. Version-sensitive flags (re-verify before submitting)

- **Capacitor 8** is current stable (8.4.0, June 2026); requires **Node 22+** and **Xcode 26.0+**. Capacitor 9 is
  alpha — avoid. Pin `^8`.
- **Screenshot sizes:** the required iPhone slot in 2026 is **6.9-inch = 1320×2868**. Apple updates accepted sizes
  with new hardware — re-check the
  [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
- **Price points:** Apple's pricing is point-based (not the old "tiers"); pick the **$3.99** point under
  Pricing & Availability.
- **Biometric plugin** versions independently of Capacitor — confirm its README lists Capacitor 8 support before
  pinning.
- **App Store policies** change; re-read **Guideline 4.2** and **App Privacy** rules near submission time.

### Sources
- Capacitor versions & support policy: <https://capacitorjs.com/docs/main/reference/support-policy>, <https://www.npmjs.com/package/@capacitor/core>
- Capacitor splash/icons & assets: <https://capacitorjs.com/docs/guides/splash-screens-and-icons>, <https://github.com/ionic-team/capacitor-assets>
- Local Notifications API: <https://capacitorjs.com/docs/apis/local-notifications>
- Biometric plugin: <https://github.com/aparajita/capacitor-biometric-auth>
- Screenshot specs (2026): <https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/>
- Pricing: <https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price/>
- Guideline 4.2 / minimum functionality: <https://developer.apple.com/app-store/review/guidelines/#minimum-functionality>
