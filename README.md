# 🌱 EcoVerse

EcoVerse is a mobile application that helps users track eco-friendly activities, calculate their CO₂ savings, and stay motivated through gamified rewards. Users log physical activities (walking, running, cycling) and household utility savings (electricity, water), earn EcoTokens, and track their environmental impact over time.

Developed as a **Final Year Project (FYP)** using **React Native** and **Expo**.

---

## 🎯 Project Objectives

- Allow users to log eco-friendly activities manually with CO₂ and token calculations
- Import activities from Android Health Connect with duplicate prevention
- Provide real-time progress tracking across a dashboard, stats, and profile
- Motivate sustained behaviour change through streaks, weekly goals, and a global celebration system
- Offer AI-powered personalised eco-tips powered by Google Gemini
- Enable bill scanning (OCR) to auto-populate electricity usage from utility bills
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
│   ├── index.tsx        # Dashboard — EcoScore hero, CO₂ card, quick stats, recent activity
│   ├── activity.tsx     # Activity log — category filters, weekly grouping, accent cards
│   ├── stats.tsx        # Stats — swipeable chart rows, CO₂ breakdown, weekly trend
│   └── profile.tsx      # Profile — gradient hero, streak calendar, weekly goal progress
│
├── activity/
    ├── _layout.tsx      # Activity screens navigator
│   ├── add.tsx          # Add activity — category grid, Health Connect auto-fill banner, OCR
│   ├── details.tsx      # Activity details — shows source (manual vs Health Connect)
│   └── edit.tsx         # Edit activity — recalculates impact diff, preserves source field
│
├── onboarding/
│   ├── index.tsx        # Onboarding orchestrator — 7 steps, writes hasFinishedOnboarding
│   ├── _onboardingWrapper.tsx  # PagerView wrapper with animated dots, theme-aware
│   ├── 1.tsx – 7.tsx    # Welcome, eco-facts, category preview, tokens/streaks,
│                        #   Health Connect setup, region selection, ready screen
│
├── health-connect-setup.tsx   # HC permission flow with per-app instructions
├── health-connect-sync.tsx    # Bulk sync review screen — checklist, batch import
├── login.tsx            # Auth screen — email + Google Sign-In, inline error messages
├── settings.tsx         # Settings — theme, region, HC status, cloud sync timestamp
├── edit-profile.tsx     # Edit name, weekly target, avatar
└── _layout.tsx          # Root layout — auth state, Firestore listeners, freshLogin ref

src/
├── store/
│   ├── activityStore.ts # Zustand store — activities, userProfile, celebration, hydration
│   └── themeStore.ts    # Zustand store — persisted theme mode (light/dark/system)
│
├── services/
│   ├── healthConnect.ts      # HC permission flow, polling, session fetch, formatters
│   ├── healthSyncService.ts  # Bulk sync — getSyncState, fetchSyncCandidates, commitSync
│   ├── aiSuggestions.ts      # Gemini API calls, 24h cache keyed to activity data hash
│   ├── billOCR.ts            # Camera capture + OCR for electricity bills
│   └── billService.ts        # Bill data extraction and kWh calculation
│
└── utils/
    └── ecoLogic.ts      # CO₂ calculations, token formulas, streak logic, CATEGORY_COLORS

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
| Running | 25 tokens per km |
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
| Cycling | 0.25 kg CO₂ per km |
| Electricity | Regional grid intensity × kWh saved |
| Water | 0.003 kg CO₂ per litre saved |

**Regional electricity intensity (kg CO₂ per kWh):**
US 0.385 · UK 0.193 · EU 0.230 · India 0.710 · China 0.550 · Global avg 0.475

### EcoScore

Weekly rolling score (resets every Sunday). Designed to reflect current-week effort rather than all-time history.

```
baseScore        = min((weeklyTokens / weeklyTarget) × 70, 70)
consistencyBonus = (activeDaysThisWeek / 7) × 20
varietyBonus     = (uniqueCategories / 3) × 10
EcoScore         = round(baseScore + consistencyBonus + varietyBonus)   // max 100
```

---

## 🧭 Navigation Flow

```
Login ──▶ Onboarding (7 steps, new users only) ──▶ Tabs
           ├── Step 1: Welcome
           ├── Step 2: Eco facts
           ├── Step 3: Category preview
           ├── Step 4: Tokens & streaks
           ├── Step 5: Health Connect setup
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
    │     └── steps / distance / duration / kwhSaved / litersSaved / billId / hcSessionId
    └── meta/healthSync
          ├── lastSyncedAt (ISO timestamp)
          └── importedIds   (array of HC session IDs to prevent re-import)
  ```
- **Real-time listeners** in root `_layout.tsx` keep the Zustand store in sync. Activities always come from Firestore.
- **Three-flag loading guard** (`authResolved` + `userDocReady` + `activitiesReady`) eliminates skeleton flash before login. A `freshLogin` ref skips the data-loading skeleton entirely for new sign-ins, routing directly after `userDocReady`.
- **Firestore rules** cover the `meta` subcollection with a wildcard pattern.

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

### Bulk Sync — "Sync Activities"
- Accessible from Settings → Sync Activities
- `fetchSyncCandidates()` fetches HC sessions since `lastSyncedAt` (max 30 days back), filters already-imported session IDs, and cross-checks against manually-logged activities within a 2-hour window
- Review screen shows a checklist of unsynced sessions; user selects/deselects and taps "Import X activities"
- `commitSync()` uses a Firestore `writeBatch` to atomically write all selected activities + update user totals + update sync state
- `importedIds` array on `meta/healthSync` prevents duplicate imports across sessions

### Deduplication (three layers)
1. `importedIds` in Firestore meta — session-level, prevents re-importing same HC session ID
2. 2-hour time window cross-check — activity-level, avoids importing if a manual entry exists within ±2h of same type
3. Store-level ID check in `_layout.tsx` — prevents Firestore snapshot from adding duplicates to local state

---

## 🤖 AI-Powered Tips (Gemini)

The dashboard features a personalised eco-tip card powered by Google Gemini 1.5 Flash.

- **Data-aware prompts:** The tip request includes a summary of the user's recent activities, categories, total carbon saved, and streak — so tips are specific to their behaviour, not generic
- **24h cache:** Tips are cached in AsyncStorage keyed to a hash of the activity summary. The cache is only invalidated when the underlying activity data changes materially
- **Rate-limit handling:** If the Gemini quota is exceeded, the card shows cached tips with a "Quota reached — showing cached tips" badge
- **Force refresh:** A reload button bypasses the cache and requests fresh tips; the button is disabled while loading
- **Fallback tips:** Three hand-crafted fallback tips are shown if the API is unavailable and no cache exists

---

## 📷 OCR Bill Scanning

The Electricity category on the Add Activity screen supports scanning utility bills:
- Camera capture via Expo Camera
- OCR processing extracts kWh readings
- `ocr-candidate-picker.tsx` presents multiple candidate values with confidence scores when OCR returns ambiguous results
- Selected value auto-populates the kWh input field

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
- **Dashboard:** Personalised greeting, EcoScore hero with gradient background and weekly progress bar, CO₂ + week-on-week comparison card, quick stats row, most recent activity sorted by date
- **Activity screen:** Category colour accent bars, coloured filter chips, weekly grouping, empty state with CTA
- **Profile:** 3-stop gradient hero card, bottom-sheet streak calendar, gradient progress bar
- **Settings:** iOS-style uppercase section headers, coloured icon rows, live cloud sync timestamp, HC connection status with last sync time
- **Onboarding:** 7-step pager with animated transitions, theme-aware backgrounds (dark forest / light mint), branded motion on each step

---

## 🔐 Auth & Security

- **Inline errors** — Firebase error codes mapped to user-friendly messages (invalid credential, email in use, weak password, rate limiting, no network, disabled account)
- **Forgot password** — pre-filled from email field, confirmation dialog, sends Firebase password reset email
- **Delete account** — re-authenticates via Google before deleting, clears Zustand store on completion, prevents stale `hasFinishedOnboarding` leaking into the next session
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
- [ ] Configure Firebase Auth email templates
- [ ] Move Gemini API key to Firebase Cloud Function
- [ ] Test on physical Android device (Health Connect, camera OCR)
- [ ] Remove remaining debug `console.warn` statements in `aiSuggestions.ts`
- [ ] Play Store listing — icon, screenshots, description, Privacy Policy URL
- [ ] © 2026 Amirah Yahaya. All rights reserved. to About section
- [ ] Firebase email templates (password reset, verification)

---

## 👩🏽‍💻 Author

**Amirah Yahaya**
Final Year Computer Science Student
© 2026 All rights reserved.
