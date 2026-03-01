# 🌱 EcoVerse

EcoVerse is a mobile application that helps users track eco-friendly activities, calculate their CO₂ savings, and stay motivated through gamified rewards. Users log physical activities (walking, running, cycling) and household utility savings (electricity, water), earn EcoTokens, and track their environmental impact over time.

Developed as a **Final Year Project (FYP)** using **React Native** and **Expo**.

---

## 🎯 Project Objectives

- Allow users to log eco-friendly activities manually with CO₂ and token calculations, including backdating forgotten entries
- Import activities from Android Health Connect with duplicate prevention — both exercise sessions and daily pedometer step summaries
- Provide real-time progress tracking across a dashboard, stats, and profile
- Motivate sustained behaviour change through streaks, weekly goals, a global celebration system, and a leveling system
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
| Charts | Victory Native v41 (Skia-based) + react-native-svg (donut chart) |
| Date picker | `@react-native-community/datetimepicker` (native platform picker — Android Material calendar dialog) |
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
│   ├── index.tsx        # Dashboard — EcoScore hero + zone-coloured SVG ring, CO₂ card with
│   │                    #   real-world equivalent, quick stats, recent activity, AI eco-tips
│   ├── activity.tsx     # Activity log — category filters, weekly grouping, accent cards,
│   │                    #   long-press action sheet (duplicate / delete with haptic feedback)
│   ├── stats.tsx        # Stats — 3 swipeable rows: Overview, Breakdown, Monthly & Trends
│   │                    #   Row 1: All-Time grid | This Week vs Last Week (tokens, activity
│   │                    #     count, CO₂ dual bars by category)
│   │                    #   Row 2: Activity Distribution donut chart | CO₂ Impact Breakdown
│   │                    #   Row 3: Monthly Activity comparison | Monthly Utilities | 8-Week chart
│   └── profile.tsx      # Profile — gradient hero, streak calendar, weekly goal progress,
│                        #   level badge and level-up modal with confetti
│
├── activity/
│   ├── _layout.tsx      # Activity screens navigator
│   ├── add.tsx          # Add activity — category grid, date picker (backdating),
│   │                    #   Health Connect auto-fill banner, OCR
│   ├── details.tsx      # Activity details — shows source (manual / app name via hcSource)
│   └── edit.tsx         # Edit activity — recalculates impact diff, preserves source field
│
├── onboarding/
│   ├── index.tsx        # Onboarding orchestrator — 7 steps, writes hasFinishedOnboarding
│   ├── _onboardingWrapper.tsx  # PagerView wrapper with animated dots, theme-aware
│   └── 1.tsx – 7.tsx   # Welcome, how it works, category preview, tokens/streaks,
│                        #   permissions, region selection, ready screen
│
├── health-connect-setup.tsx   # HC permission flow with per-app instructions
├── health-connect-sync.tsx    # Bulk sync — checklist, animated success screen
├── login.tsx            # Auth screen — email + Google Sign-In, inline error messages
├── settings.tsx         # Settings — theme, region, HC status, cloud sync timestamp,
│                        #   Terms of Service, Privacy Policy, feedback link
├── edit-profile.tsx     # Edit name, weekly target, avatar
└── _layout.tsx          # Root layout — auth state, Firestore listeners, freshLogin ref

src/
├── store/
│   ├── activityStore.ts # Zustand store — activities, userProfile (tokens,
│   │                    #   totalCarbonSaved), celebration, levelUpPending,
│   │                    #   pendingLevel, _hasHydrated, _profileLoaded.
│   │                    #   duplicateActivity() creates a dated copy and returns
│   │                    #   it for Firestore persistence by the caller
│   └── themeStore.ts    # Zustand store — persisted theme mode (light/dark/system)
│
├── services/
│   ├── healthConnect.ts      # HC permission flow, polling, session fetch, daily pedometer
│   ├── healthSyncService.ts  # Bulk sync — merges sessions + pedometer days, commitSync
│   │                         #   (stores local date string, not UTC, to fix display time bug)
│   ├── aiSuggestions.ts      # Gemini API calls, 24h cache keyed to activity data hash
│   ├── billOCR.ts            # Camera capture + OCR for electricity and water bills
│   └── billService.ts        # Bill data extraction and L & kWh calculation
│
├── content/
│   ├── termsOfService.ts     # Terms of Service text (shown in-app modal)
│   └── privacyPolicy.ts      # Privacy Policy text (shown in-app modal)
│
└── utils/
    ├── ecoLogic.ts           # CO₂ calculations, token formulas, EcoScore (capped at 100),
    │                         #   streak logic, CATEGORY_COLORS, week/month range helpers
    ├── co2Equivalents.ts     # Real-world CO₂ equivalent lookup and formatter
    └── dateUtils.ts          # isToday, isThisWeek, localMidnightToday, localEndOfDay,
                              #   toLocalISOString (UTC→local for Health Connect dates)

components/
├── ai-suggestions-card.tsx   # AI tips card with force-refresh, rate-limit badge
├── health-connect-banner.tsx # Auto-fill banner on add screen when HC data available
├── LevelUpModal.tsx          # Level-up celebration modal — animated rank badge,
│                             #   floating emoji, confetti, next-level hint
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
EcoScore         = min(round(baseScore + consistencyBonus + varietyBonus), 100)
```

> **Bug fix:** The original formula lacked a final `Math.min(100, …)` cap. With 5 unique categories `varietyBonus = (5/3) × 10 = 16.7`, which combined with a perfect base (70) and full consistency (20) produced a score of 107. The final `Math.min` cap is now applied in `calculateEcoScore()` in `ecoLogic.ts`.

The EcoScore ring on the dashboard uses colour zones: red (<50), amber (50–74), green (≥75).

### Leveling System

Users earn levels based on cumulative EcoTokens. Levels are defined in `LEVELS` array (ecoLogic.ts or leveling config) with thresholds, rank names, and emojis. When a logged activity pushes `userProfile.tokens` past a level threshold, a `LevelUpModal` fires with animated rank badge, floating emoji, confetti, and a next-level hint. Level progress is displayed on the Profile screen.

**Level-up detection guard:** `setUserProfile()` in `activityStore.ts` uses a `_profileLoaded` boolean flag (not persisted) to distinguish the initial Firestore hydration from subsequent token increases. On first load, `_profileLoaded` is `false`; setting it to `true` happens on the first `setUserProfile` call. Level-up checks only fire when `_profileLoaded` was already `true`, preventing a spurious level-up modal on every cold boot.

### CO₂ Equivalents

Cumulative CO₂ savings are translated into a relatable real-world comparison displayed on the dashboard CO₂ card. The equivalent is selected automatically to produce the most readable quantity (targeting 5–500 units).

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
    │     ├── hcId (HC session ID or 'steps-YYYY-MM-DD' for pedometer days)
    │     ├── hcSource (originating app package name, e.g. 'com.strava')
    │     └── steps / distance / duration / kwhSaved / litersSaved / billId
    └── meta/healthSync
          ├── lastSyncedAt (ISO timestamp)
          └── importedIds   (array of HC session IDs + pedometer day IDs)
  ```
- **Real-time listeners** in root `_layout.tsx` keep the Zustand store in sync. Activities always come from Firestore.
- **Three-flag loading guard** (`authResolved` + `userDocReady` + `activitiesReady`) eliminates skeleton flash before login. A `freshLogin` ref skips the data-loading skeleton for new sign-ins.
- **Firestore security rules:** A wildcard `match /{subcollection}/{document=**}` under `users/{userId}` covers all sub-collections.
- **Account deletion:** Zustand store cleared first (before `deleteUser`) so `onAuthStateChanged` sees clean state. No competing `router.replace` call in `settings.tsx`.

---

## 💚 Health Connect Integration

EcoVerse integrates with Android Health Connect to import steps, distance, and exercise sessions from third-party fitness apps.

### Permission Flow
- `expo-health-connect` config plugin adds required intent filter to the manifest during prebuild
- `requestHealthPermissions()` polls `checkHealthPermissions()` up to 10 times after dialog closes (HC permission propagation delay: 1–6 seconds)
- `AppState` listeners on onboarding and settings update permission badges when returning from the HC dialog

### Auto-fill Banner
- When HC permissions are granted, the Add Activity screen shows a banner with pre-filled step/distance data
- All date comparisons use **local midnight** (not UTC midnight) — `setHours(0,0,0,0)` not `setUTCHours` — to avoid yesterday's evening sessions appearing as today on UTC+1/+2/+3 devices

### Backdating Activities
- Date picker below the category grid defaults to today; any past date is selectable
- Backdated activities contribute to streak and weekly stats for their selected date

### Bulk Sync — "Sync Activities"

Accessible from Settings → Sync Activities. Merges two HC data sources:

**1. Exercise Sessions** — structured workout records from Strava, Samsung Health, Google Fit etc. Originating app's package name (`hca.source`) stored as `hcSource` in Firestore, enabling "via Strava" display in details.tsx.

**2. Daily Step Summaries** — `Steps` records aggregated per local calendar day. `fetchDailyStepSummaries()` buckets by `(localDate, dataOrigin)` and takes the **maximum single-origin total** to prevent cross-app double-counting (Samsung Health + Google Fit both write the same steps to HC).

**Deduplication logic:**
- Exercise sessions: filtered by `importedIds` + ±2h temporal cross-check
- Step summary days: suppressed if any HC walking session (new or previously imported) covers the same date; also suppressed for manual walking entries on the same date
- `importedIds` stores both session IDs and `steps-YYYY-MM-DD` keys

### Date/Time Display Fix
Health Connect's `startTime` is a UTC ISO string. Storing it directly caused times to display shifted by the device's UTC offset (e.g. 2:00 AM instead of midnight in Cyprus UTC+2). Fixed in `commitSync()` by converting via `toLocalISOString(new Date(hca.startTime))` — formats as `YYYY-MM-DDTHH:MM:SS` without a trailing `Z`, so JavaScript treats it as local time throughout the app. Same fix applied to `add.tsx` for manual activity timestamps.

---

## 🤖 AI-Powered Tips (Gemini)

- **Data-aware prompts:** Tip request includes recent activities, categories, CO₂ total, and streak
- **New user handling:** Curated placeholder tips shown immediately without API call when no activities exist
- **24h cache:** Keyed to a hash of the activity summary; only invalidated when data changes
- **Rate-limit handling:** Shows cached tips with a "Quota reached" badge
- **Force refresh:** Reload button bypasses cache
- **Fallback tips:** Three data-aware hand-crafted tips reference the user's actual top and missing categories
- **Load timing fix:** Re-fetches when `activities.length` changes from 0 to N

---

## 📷 OCR Bill Scanning

- Camera capture via Expo Camera
- OCR extracts kWh and L readings from utility bills
- `ocr-candidate-picker.tsx` presents multiple candidates with confidence scores when ambiguous
- Selected value auto-populates the input field

---

## 🎮 Gamification System

### Weekly Goal & Celebration
- Personal weekly EcoToken target (default: 500)
- Slide-in banner + confetti fires on any tab when goal is reached (via `(tabs)/_layout.tsx`)
- Celebration state keyed to `celebratedWeek` (Sunday date string), auto-resets each week
- Resets if tokens drop below target (e.g. activity deleted) so reaching it again re-triggers
- Fires 400ms after navigation; resets if user raises their target above current count

### Leveling System
- Cumulative token thresholds unlock ranks (Seedling → Sprout → ... → EcoLegend)
- `LevelUpModal` fires on actual token increases — **not** on app boot (guarded by `_profileLoaded` flag)
- Animated rank badge, floating category emoji, 150-piece confetti, next-level hint
- Level and rank badge displayed on the Profile screen hero card

### Streak System
- `calculateStreak()` in `ecoLogic.ts` iterates backwards through activity history
- Grace period: streak counts from yesterday if today has no activity yet
- Streak multiplier: +10% per 5-day streak, capped at +50%
- Visual dot calendar on Profile bottom sheet shows active days with checkmarks

### EcoScore Ring
- SVG arc rendered around the EcoScore circle on dashboard
- Colour zones: red (<50), amber (50–74), green (≥75)
- Ring arc and inner circle border both adopt the zone colour
- Uses `<G transform="rotate(-90, cx, cy)">` — avoids deprecated `rotation`/`origin` props
- Score capped at 100 via `Math.min` in `calculateEcoScore()` (previously could reach 107)

### Category Colour System

| Category | Colour |
|----------|--------|
| Walking | `#4CAF50` Green |
| Running | `#FF7043` Orange-red |
| Cycling | `#29B6F6` Sky blue |
| Electricity | `#FFC107` Amber |
| Water | `#26C6DA` Cyan |

---

## 📊 Stats Screen

Three swipeable rows, each with animated pill-shaped page indicators:

**Row 1 — Overview**
- *All-Time card:* Total activities, steps, distance, averages, CO₂, top activity
- *This Week vs Last Week card:* Tokens and activity count comparison pills; CO₂ by category dual horizontal bars (last week faded, this week solid). CO₂ pill omitted from top-level comparison because utility bills logged monthly distort the weekly delta.

**Row 2 — Breakdown**
- *Activity Distribution donut chart:* SVG donut (react-native-svg) showing % of logged activities by category, with centre total and sorted legend. Built with react-native-svg rather than VictoryPie as it is already a dependency of Victory Native v41's Skia pipeline.
- *CO₂ Impact Breakdown:* Stacked bar + per-category legend + dominant-category insight.

**Row 3 — Monthly & Trends**
- *Monthly Activity card:* Activities, tokens, and CO₂ comparison pills (this month vs last month) plus per-category activity count dual bars.
- *Monthly Utilities card:* Electricity (kWh saved, CO₂ avoided) and Water (litres saved, CO₂ avoided) with diff badges and dual horizontal bars. Utilities are compared monthly (not weekly) because bills are not logged on a weekly cadence — a week with no bill entry would falsely show "CO₂ down 100%".
- *8-Week CO₂ chart:* Victory Native v41 CartesianChart + Bar, current week highlighted in full tint colour.

---

## 🎨 UI Design

- **Theme:** Full light/dark mode with system-follow option, persisted via `themeStore`
- **Login:** Soft green gradient (light) / deep forest green (dark). Inline error messages
- **Dashboard:** Time-based greeting, EcoScore hero with zone-coloured SVG ring, CO₂ card with weekly total and transport-only week-on-week % comparison (walking/running/cycling only — utility bills excluded to avoid misleading swings), real-world CO₂ equivalent, quick stats row, recent activity, AI tips card
- **Stats:** Three swipeable card rows with section labels and animated dot indicators (see Stats Screen section above)
- **Activity screen:** Category colour accent bars, coloured filter chips, weekly grouping, empty state with CTA. Long-press on any card triggers a haptic + native action sheet with Duplicate and Delete options. Duplicate creates a copy dated to now and persists it to Firestore. Delete requires a second confirmation alert before removing from both Zustand and Firestore.
- **Profile:** 3-stop gradient hero, level badge, streak calendar bottom sheet, goal progress bar
- **Settings:** iOS-style uppercase section headers, coloured icon rows, live cloud sync timestamp, HC connection status, in-app Terms of Service and Privacy Policy modals
- **Onboarding:** 7-step pager with animated transitions, theme-aware backgrounds
- **Health Connect Sync success screen:** Four-stage animation (circle scale → checkmark → stat cards → hint). Large bordered circle (120×120), 56px checkmark, green/cyan stat cards for tokens and CO₂

---

## 🔐 Auth & Security

- **Inline errors** — Firebase error codes mapped to user-friendly messages
- **Forgot password** — pre-filled from email field, confirmation dialog
- **Delete account** — Zustand store cleared first (before `deleteUser`) so `onAuthStateChanged` sees clean state. No competing `router.replace` in `settings.tsx`
- **Gemini API key** — currently in `.env`. For production: move to Firebase Cloud Function
- **Firebase Dynamic Links** — not used; not affected by deprecation

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

> **Note:** Victory Native v41 uses Skia and requires a native dev build. Health Connect requires Android 8.0+ (API 26). `@react-native-community/datetimepicker` also requires a native build. All three require `npx expo run:android` — Expo Go is not supported.

> **After a clean prebuild:** `npx expo prebuild --clean` resets `android/gradle.properties`. Re-add `minSdkVersion=26` after running it.

---

## 🐛 Bug Fixes Log

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Health Connect times show as 2:00 AM (UTC+2) | `hca.startTime` stored directly as UTC ISO string; JS parses as UTC, displays shifted | `toLocalISOString()` converts to local `YYYY-MM-DDTHH:MM:SS` (no `Z`) before storing |
| Manual activity times show midnight / wrong hour | `toISODate()` returns date-only string parsed as UTC midnight by JS | Same `toLocalISOString()` fix applied in `add.tsx` |
| EcoScore can reach 107 | `Math.min(100, …)` missing from final return in `calculateEcoScore()` | Added `Math.min(100, Math.round(…))` cap |
| Level-up modal fires on every cold boot | Zustand init sets `tokens = 0`; first Firestore snapshot looks like a token increase from 0 | `_profileLoaded` flag gates level-up check — only fires after first hydration, not during it |
| Dashboard CO₂ week-on-week % misleading | Utility bills logged monthly; week with no bill shows "−100% CO₂" | `getWeekCarbonComparison()` filters to transport categories only (walking, running, cycling) |
| Stats "CO₂ saved" pill misleading | Same as above — weekly CO₂ pill included utility bills | Pill removed from This Week vs Last Week card; per-category bars retained (absolute values, not delta) |
| +Log button shows wrong theme tint on OS theme change | `android_ripple` causes Android to recreate the native `RippleDrawable` on re-render; during reconstruction it briefly renders the system default colour | Removed `android_ripple`; replaced with JS `({ pressed }) => [...]` style callback using opacity for press feedback |
| Theme tint flashes opposite colour on cold boot | Zustand `persist` middleware rehydrates AsyncStorage asynchronously; a stale persisted `mode` (e.g. `'light'`) briefly applied before the correct value loaded | Added `_hydrated` flag to `themeStore`; `useAppTheme` falls back to OS scheme until hydration completes |

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