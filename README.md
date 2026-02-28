# 🌱 EcoVerse

EcoVerse is a mobile application that helps users track eco-friendly activities, calculate their CO₂ savings, and stay motivated through gamified rewards. Users log physical activities (walking, running, cycling) and household utility savings (electricity, water), earn EcoTokens, and track their environmental impact over time.

Developed as a **Final Year Project (FYP)** using **React Native** and **Expo**.

---

## 🎯 Project Objectives

- Allow users to log eco-friendly activities manually with CO₂ and token calculations, including backdating forgotten entries
- Import activities from Android Health Connect with duplicate prevention - both exercise sessions and daily pedometer step summaries
- Provide real-time progress tracking across a dashboard, stats, and profile
- Motivate sustained behaviour change through streaks, weekly goals, and a global celebration system
- Offer AI-powered personalised eco-tips powered by Google Gemini
- Enable bill scanning (OCR) to auto-populate electricity and water usage from utility bills
- Translate cumulative CO₂ savings into relatable real-world equivalents
- Sync all data to the cloud with Firebase for cross-session persistence
- Apply modern mobile development practices using Expo, Expo Router, and TypeScript

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (Managed Workflow) |
| Navigation | Expo Router (file-based, typed routes) |
| Language | TypeScript |
| State | Zustand + AsyncStorage (persist middleware) |
| Auth | Firebase Auth (email/password + Google Sign-In) |
| Database | Cloud Firestore (real-time sync) |
| Image hosting | Cloudinary |
| Charts | Victory Native v41 (Skia-based) |
| Health data | Android Health Connect (`expo-health-connect` config plugin + `react-native-health-connect`) |
| AI tips | Google Gemini API (24h cached, data-aware prompts) |
| OCR | Expo Camera + Google ML Kit / Vision API |
| Primary platform | Android (minSdkVersion 26 / Android 8.0) |

---

## 📂 Project Structure

```
app/
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator — global celebration banner, confetti
│   ├── index.tsx        # Dashboard — EcoScore hero + zone-coloured SVG ring, CO₂ card with real-world equivalent, quick stats, recent activity, ai eco-tips
│   ├── activity.tsx     # Activity log — category filters, weekly grouping, accent cards
│   ├── stats.tsx        # Stats — swipeable chart rows, CO₂ breakdown, weekly trend
│   └── profile.tsx      # Profile — gradient hero, streak calendar, weekly goal progress
│
├── activity/
    ├── _layout.tsx      # Activity screens navigator
│   ├── add.tsx          # Add activity — category grid, date picker (backdating), Health Connect auto-fill banner, OCR
│   ├── details.tsx      # Activity details — shows source (manual / app name via hcSource / Health Connect)
│   └── edit.tsx         # Edit activity — recalculates impact diff, preserves source field, date picker
│
├── onboarding/
│   ├── index.tsx        # Onboarding orchestrator — 7 steps, writes hasFinishedOnboarding
│   ├── _onboardingWrapper.tsx  # PagerView wrapper with animated dots, theme-aware
│   ├── 1.tsx – 7.tsx    # Welcome, how it works, category preview, tokens/streaks,
│                        # permissions, region selection, ready screen
│
├── health-connect-setup.tsx   # HC permission flow with per-app instructions
├── health-connect-sync.tsx    # Bulk sync review screen — checklist, batch import
├── login.tsx            # Auth screen — email + Google Sign-In, inline error messages
├── settings.tsx         # Settings — theme, region, HC status, cloud sync timestamp
│                        #   Terms of Service, Privacy Policy, feedback link
├── edit-profile.tsx     # Edit name, weekly target, avatar
└── _layout.tsx          # Root layout — auth state, Firestore listeners, freshLogin ref

src/
├── store/
│   ├── activityStore.ts # Zustand store — activities, userProfile, celebration, hydration
│   └── themeStore.ts    # Zustand store — persisted theme mode (light/dark/system)
│
├── services/
│   ├── healthConnect.ts      # HC permission flow, polling, session fetch, daily pedometer summaries
│   ├── healthSyncService.ts  # Bulk sync — merges sessions + pedometer days, commitSync
│   ├── aiSuggestions.ts      # Gemini API calls, 24h cache keyed to activity data hash
│   ├── billOCR.ts            # Camera capture + OCR for electricity and water bills
│   └── billService.ts        # Bill data extraction and L & kWh calculation
│
├── content/
│   ├── termsOfService.ts     # Terms of Service text (shown in-app modal)
│   └── privacyPolicy.ts      # Privacy Policy text (shown in-app modal)
│
└── utils/
    ├── ecoLogic.ts           # CO₂ calculations, token formulas, streak logic, CATEGORY_COLORS
    ├── co2Equivalents.ts     # Real-world CO₂ equivalent lookup and formatter
    └── dateUtils.ts           # isToday, isThisWeek, localMidnightToday, localEndOfDay

components/
├── ai-suggestions-card.tsx   # AI tips card with force-refresh, rate-limit badge
├── health-connect-banner.tsx # Auto-fill banner on add screen when HC data available
├── streak-calendar-sheet.tsx # Bottom sheet streak calendar
└── ocr-candidate-picker.tsx  # OCR result picker for bill scanning

constants/
└── theme.ts             # Light/dark colour tokens

hooks/
└── useAppTheme.ts       # Resolves system/light/dark scheme from themeStore

firebase/
└── config.ts            # Firebase setup
```

---

## 🧮 Calculations

### Token Rewards

| Activity | Rate |
|----------|------|
| Walking | 1 token per 100 steps (estimated from distance if steps unavailable) |
| Running | 15 tokens per km |
| Cycling | 10 tokens per km |
| Electricity | 5 tokens per kWh saved |
| Water | 1 token per 10 L saved |

**Streak multiplier:** +10% per 5-day streak, capped at +50%. Applied at save time via `calculateFinalTokens()`.

**Weekly target:** 500 tokens default, adjustable per user in Edit Profile.

### CO₂ Savings

| Activity | Factor |
|----------|--------|
| Walking | 0.192 kg CO₂ per km |
| Running | 0.192 kg CO₂ per km |
| Cycling | 0.186 kg CO₂ per km |
| Electricity | Regional grid intensity × kWh saved |
| Water | 0.003 kg CO₂ per litre saved |

**Regional electricity intensity (kg CO₂ per kWh):**
US 0.386 · UK 0.193 · EU 0.276 · India 0.713 · China 0.581 · Global avg 0.475

### EcoScore

Weekly rolling score (resets every Sunday). Designed to reflect current-week effort rather than all-time history.

```
baseScore        = min((weeklyTokens / weeklyTarget) × 70, 70)
consistencyBonus = (activeDaysThisWeek / 7) × 20
varietyBonus     = (uniqueCategories / 3) × 10
EcoScore         = round(baseScore + consistencyBonus + varietyBonus)   // max 100
```

The EcoScore ring on the dashboard uses colour zones: red (<50), amber (50–74), green (≥75).

### CO₂ Equivalents

Cumulative CO₂ savings are translated into a relatable real-world comparison displayed on the dashboard CO₂ card. The equivalent is selected automatically to produce the most readable quantity (targeting 5–500 units). Sources are published and citable in the thesis.

| Equivalent | kg CO₂ per unit | Source |
|------------|----------------|--------|
| Smartphone charge | 0.008 | IEA / Carbon Trust |
| Kettle boil | 0.027 | DESNZ 2023 |
| Load of laundry | 0.185 | Carbon Trust |
| km not driven | 0.192 | DESNZ GHG factors 2023 |
| Plastic bottle | 0.083 | Franklin Associates |
| Cup of coffee | 0.021 | Carbon Trust |
| Hour of streaming | 0.036 | IEA 2023 |
| Balloon of CO₂ | 0.00196 | STP calculation |
| km of flying | 0.255 | ICAO per-passenger-km |
| Hour of AC | 0.580 | 1.5kW × global grid avg |
| Beef burger | 2.500 | Poore & Nemecek 2018 |

---

## 🧭 Navigation Flow

```
Login ──▶ Onboarding (7 steps, new users only) ──▶ Tabs
           ├── Step 1: Welcome
           ├── Step 2: How it works
           ├── Step 3: Category preview
           ├── Step 4: Tokens & streaks
           ├── Step 5: Permissions (Health Connect, Camera)
           ├── Step 6: Region selection           ├── Dashboard
           └── Step 7: Ready                      ├── Activity Log ──▶ Add / Details / Edit
                                                  ├── Stats
                                                  └── Profile ──▶ Edit Profile
                                                             └── Settings
                                                                    ├── HC Setup
                                                                    └── HC Sync (bulk import)
```

---

## 🔥 Firebase Architecture

- **Auth:** Email/password and Google Sign-In. Inline error messages with 10+ mapped Firebase error codes. Password reset via `sendPasswordResetEmail`.
- **Firestore structure:**
  ```
  users/{uid}
    ├── displayName, email, photoURL
    ├── region, weeklyTarget
    ├── tokens, totalCarbonSaved
    ├── hasFinishedOnboarding
    ├── lastLogin
    ├── activities/{activityId}
    │     ├── category, date, source ('manual' | 'health_connect')
    │     ├── hcId (HC session ID or 'steps-YYYY-MM-DD' for pedometer days — prevents re-import)
    │     ├── hcSource (original app package name, e.g. 'com.strava' — enables "via Strava" display)
    │     └── steps / distance / duration / kwhSaved / litersSaved / billId
    └── meta/healthSync
          ├── lastSyncedAt (ISO timestamp)
          └── importedIds   (array of HC session IDs + pedometer day IDs to prevent re-import)
  ```
- **Real-time listeners** in root `_layout.tsx` keep the Zustand store in sync. Activities always come from Firestore.
- **Three-flag loading guard** (`authResolved` + `userDocReady` + `activitiesReady`) eliminates skeleton flash before login. A `freshLogin` ref skips the data-loading skeleton entirely for new sign-ins, routing directly after `userDocReady`.
- **Firestore security rules:** A wildcard `match /{subcollection}/{document=**}` under `users/{userId}` covers all sub-collections including `meta/healthSync`, `activities`, and `bills`. No additional rules needed.
- **Account deletion:** `deleteUser` (Auth) is called first. Only if that succeeds is `deleteDoc` (Firestore) called. This prevents a half-deleted state where the Auth account is gone but Firestore data remains. Failure at either step shows an actionable error and leaves the user signed in.

---

## 💚 Health Connect Integration

EcoVerse integrates with Android Health Connect to import steps, distance, and exercise sessions from third-party fitness apps (Google Fit, Samsung Health, Strava, Garmin Connect, etc.).

### Permission Flow
- `expo-health-connect` config plugin adds the required `activity-alias` and `VIEW_PERMISSION_USAGE` intent filter to the manifest during prebuild
- `requestHealthPermissions()` polls `checkHealthPermissions()` up to 10 times after the dialog closes to handle HC's permission propagation delay (1–6 seconds on some devices)
- `AppState` listeners on the onboarding and settings screens update permission badges when the user returns from the HC permissions dialog

### Auto-fill Banner
- When HC permissions are granted, the Add Activity screen shows a banner with pre-filled step/distance data from the most recent HC session
- The banner is dismissible and shows data confidence (exact steps from HC vs. estimated from distance)
- All date comparisons use **local midnight** (not UTC midnight) to avoid yesterday's evening sessions appearing as today's data on devices in UTC+1 or later (e.g. Cyprus UTC+2/+3)

### Backdating Activities
- The Add Activity screen includes a date picker (shown below the category grid) that defaults to Today
- Users can select any past date to log activities they forgot to record
- Backdated activities contribute to the streak and weekly stats for their selected date, not the current day

### Bulk Sync — "Sync Activities"

- Accessible from Settings → Sync Activities. Merges **two data sources** that HC exposes separately:

**1. Exercise Sessions** — recorded by Strava, Samsung Health, Google Fit etc. These are structured workout records with start/end times, exercise type, and linked step/distance data. The originating app's package name (`hca.source`) is saved to Firestore as `hcSource`, so `details.tsx` can display "via Strava" or "via Samsung Health" rather than the generic "Health Connect".

**2. Daily Step Summaries** — all `Steps` records written to HC by any app (Samsung Health, Google Fit, the phone's OS step counter) are aggregated per local calendar day. This captures steps from users who walk with their phone but don't start a tracked workout. `fetchDailyStepSummaries()` produces one importable walking entry per day.

> **Note on step counts:** The step total shown in HC may be lower than what Samsung Health's own app displays. Samsung Health applies its own sensor-fusion algorithm on top of the raw HC records; what it writes to HC is the raw count from the OS step counter, which is typically lower. This is a platform limitation — EcoVerse reads whatever Samsung Health has written to HC and cannot access the higher internal count.

**Deduplication logic:**
- Exercise sessions: filtered by `importedIds` (session ID) + ±2h temporal cross-check against existing manual activities of the same type
- Step summary days: filtered by `importedIds` (keyed `steps-YYYY-MM-DD`) + skipped if any HC walking session (new **or previously imported**) covers the same date — this prevents the day from re-appearing on every subsequent sync after the session was imported
- Manual walking entries on the same date also suppress the step summary day
- `importedIds` in `meta/healthSync` stores both session IDs and pedometer day IDs

**Import flow:**
- Review screen shows a selectable checklist of sessions and step-summary days, labelled by source ("via Strava", "via Samsung Health", "via Health Connect")
- `commitSync()` uses a Firestore `writeBatch` to atomically write all selected activities (including `hcSource` field), update user totals, and update sync state

---

## 🤖 AI-Powered Tips (Gemini)

The dashboard features a personalised eco-tip card powered by Google Gemini.

- **Data-aware prompts:** The tip request includes a summary of the user's recent activities, categories, total carbon saved, and streak — so tips are specific to their behaviour, not generic
- **New user handling:** If no activities have been logged yet, curated placeholder tips are shown immediately without calling the API
- **24h cache:** Tips are cached in AsyncStorage keyed to a hash of the activity summary. The cache is only invalidated when the underlying activity data changes materially
- **Rate-limit handling:** If the Gemini quota is exceeded, the card shows cached tips with a "Quota reached — showing cached tips" badge
- **Force refresh:** A reload button bypasses the cache and requests fresh tips
- **Fallback tips:** Three data-aware hand-crafted tips are shown if the API is unavailable and no cache exists — they reference the user's actual top category and missing categories
- **Load timing fix:** The tip card re-fetches when `activities.length` changes from 0 to N (first Firestore data arrives), preventing placeholder tips being shown to existing users on first load

---

## 📷 OCR Bill Scanning

The Electricity and Water category on the Add Activity screen supports scanning utility bills:
- Camera capture via Expo Camera
- OCR processing extracts kWh and L readings
- `ocr-candidate-picker.tsx` presents multiple candidate values with confidence scores when OCR returns ambiguous results
- Selected value auto-populates the kWh or L input field

---

## 🎮 Gamification System

### Weekly Goal & Celebration
- Users set a personal weekly EcoToken target (default: 500)
- Progress tracked via a live bar on Dashboard and Profile
- When the goal is reached, a slide-in banner fires from the top of the screen with confetti — visible on any tab via `(tabs)/_layout.tsx`
- Celebration state keyed to the current week (`celebratedWeek`) and auto-resets each Sunday
- If tokens drop below target (e.g. activity deleted), `celebrated` resets so reaching the target again re-triggers the celebration
- Celebration fires 400ms after navigation to ensure the animation completes before the banner appears
- When target is raised and progress < 100%, `celebrated` resets so the new target can be celebrated

### Streak System
- Consecutive active days tracked via `calculateStreak()` in `ecoLogic.ts`
- Visual dot calendar on Profile (bottom sheet) shows this week's active days with checkmarks
- Streak multiplier applied to token rewards: +10% per 5-day streak, capped at +50%
- Grace period: if today has no activity yet, streak counts from yesterday — prevents losing streaks due to late-day logging

### EcoScore Ring
- SVG arc rendered around the EcoScore circle on the dashboard
- Colour zones: red (<50), amber (50–74), green (≥75)
- Both the ring arc and the inner circle border/background use the zone colour, reinforcing the current score band visually
- Uses `<G transform="rotate(-90, cx, cy)">` — avoids deprecated `rotation` and `origin` props

### Category Colour System

| Category | Colour |
|----------|--------|
| Walking | `#4CAF50` Green |
| Running | `#FF7043` Orange-red |
| Cycling | `#29B6F6` Sky blue |
| Electricity | `#FFC107` Amber |
| Water | `#26C6DA` Cyan |

---

## 🎨 UI Design

- **Theme:** Full light/dark mode with system-follow option, persisted via `themeStore`. All onboarding screens are fully theme-aware with distinct light and dark palettes
- **Login:** Light mode uses a soft green gradient (`#E8F5E9`); dark mode uses deep forest green. Inline error messages instead of Alert popups
- **Dashboard:** Personalised greeting, EcoScore hero with zone-coloured SVG ring (inner circle border and background also adopt zone colour) and weekly progress bar, CO₂ card (weekly CO₂ saved + week-on-week % comparison as the two main stats; a slim "All-time —" line below shows a real-world equivalent of the cumulative total), quick stats row, most recent activity sorted by date, AI tips card. All-time totals live on Profile (hero card) and Stats screen; the dashboard is intentionally weekly-focused
- **Activity screen:** Category colour accent bars, coloured filter chips, weekly grouping, empty state with CTA
- **Profile:** 3-stop gradient hero card, bottom-sheet streak calendar, gradient progress bar
- **Settings:** iOS-style uppercase section headers, coloured icon rows, live cloud sync timestamp, HC connection status, in-app Terms of Service and Privacy Policy modals
- **Onboarding:** 7-step pager with animated transitions, theme-aware backgrounds (dark forest / light mint), branded motion on each step

---

## 🔐 Auth & Security

- **Inline errors** — Firebase error codes mapped to user-friendly messages (invalid credential, email in use, weak password, rate limiting, no network, disabled account)
- **Forgot password** — pre-filled from email field, confirmation dialog, sends Firebase password reset email
- **Delete account** — `deleteUser` (Auth) runs first; `deleteDoc` (Firestore) runs only on success; both must succeed before navigating away; failure shows an actionable error and leaves the user signed in
- **Gemini API key** — currently in `.env`. For production, should be moved to a Firebase Cloud Function (key would not be bundled in the APK)
- **Firebase Dynamic Links** — not used; not affected by their deprecation

---

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Start dev server
npx expo start

# Run on Android device/emulator (required for Victory Native + Health Connect)
npx expo run:android
```

> **Note:** Victory Native v41 uses Skia and requires a native dev build. Health Connect requires Android 8.0+ (API 26). Both require `npx expo run:android` — Expo Go is not supported.

> **After a clean prebuild:** `npx expo prebuild --clean` resets `android/gradle.properties`. Re-add `minSdkVersion=26` after running it.

---

## 📋 Pre-Shipping Checklist

- [ ] Terms of Service and Privacy Policy (required for Play Store)
- [ ] Configure Firebase Auth email templates (verification, password reset)
- [ ] Move Gemini API key to Firebase Cloud Function
- [ ] Replace `FEEDBACK_FORM_URL` in `settings.tsx` with actual Google Form / Typeform link
- [ ] Test on 360dp-wide emulator (Pixel 3a size)
- [ ] Remove remaining debug `console.warn` statements in `aiSuggestions.ts`
- [ ] Play Store listing — icon, screenshots, description, Privacy Policy URL
- [ ] © 2026 Amirah Yahaya. All rights reserved. to About section in Settings

---

## 👩🏽‍💻 Author

**Amirah Yahaya**
Final Year Computer Science Student
© 2026 All rights reserved.