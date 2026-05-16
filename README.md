# 🌱 EcoVerse

EcoVerse is a mobile application that helps users track eco-friendly activities, calculate their CO₂ savings, and stay motivated through gamified rewards. Users log physical activities (walking, running, cycling) and household utility savings (electricity, water), earn EcoTokens, and track their environmental impact over time. A Community screen provides a global weekly leaderboard and opt-in weekly challenges.

Developed as a **Final Year Project (FYP)** using **React Native** and **Expo**.

---

## 🎯 Project Objectives

- Allow users to log eco-friendly activities manually with CO₂ and token calculations, including backdating forgotten entries
- Import activities from Android Health Connect with duplicate prevention — both exercise sessions and daily pedometer step summaries
- Provide real-time progress tracking across a dashboard, stats, and profile
- Motivate sustained behaviour change through streaks, weekly goals, a global celebration system, and a leveling system
- Provide a Community screen with a global leaderboard (ranked by weekly EcoScore) and opt-in weekly challenges with privacy-preserving anonymous display
- Offer AI-powered personalised eco-tips powered by Google Gemini (food/diet suggestions excluded)
- Enable bill scanning (OCR) to auto-populate electricity and water usage from utility bills
- Translate cumulative CO₂ savings into relatable real-world equivalents
- Sync all data to the cloud with Firebase for cross-session persistence
- Apply modern mobile development practices using Expo, Expo Router, and TypeScript
- Send local push notifications for daily reminders, weekly recaps, missed-day nudges, and streak-at-risk alerts

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
| AI tips | Google Gemini API (24h cached, data-aware prompts, food/diet excluded) |
| OCR | Expo Camera + Google ML Kit / Vision API |
| Notifications | `expo-notifications` (local scheduled — daily reminder, weekly recap, missed-day nudge, streak-at-risk) |
| Primary platform | Android (minSdkVersion 26 / Android 8.0) |

---

## 📂 Project Structure

```
app/
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator — global celebration banner, confetti
│   ├── index.tsx        # Dashboard — EcoScore hero + zone-coloured SVG ring (tappable →
│   │                    #   EcoScoreModal with "Tap for insights" hint below ring),
│   │                    #   30-day token sparkline + score history tabs with press tooltips,
│   │                    #   CO₂ card, quick stats, recent activity, AI eco-tips
│   ├── activity.tsx     # Activity log — category filters, weekly grouping, accent cards,
│   │                    #   long-press action sheet (duplicate / delete with haptic feedback)
│   ├── stats.tsx        # Stats — gradient hero banner (total CO₂ + EcoTokens from
│   │                    #   userProfile.tokens + distance + top activity) + featured full-width
│   │                    #   8-week CO₂ bar chart + 3 swipeable rows:
│   │                    #   Row 1: All-Time detail (tiles + stacked CO₂ bar) | This Week vs
│   │                    #     Last Week (tokens, activity count pills, CO₂ dual bars)
│   │                    #   Row 2: Activity Mix SVG donut | CO₂ Breakdown (per-category rows)
│   │                    #   Row 3: Monthly Activity | Monthly Utilities
│   │                    #   WeeklyCO2Chart: transparent View responder overlay for instant
│   │                    #     bar tap (no Victory Native pan gesture). Index from locationX
│   │                    #     + slot geometry. Dot pip on selected bar. No chartPressState.
│   ├── community.tsx    # Community — segmented control: Leaderboard | Challenges
│   │                    #   Leaderboard: podium for top 3, global ranking by weeklyEcoScore
│   │                    #     from /leaderboard collection, eco-alias by default (opt-in real
│   │                    #     name), sticky "You" row at bottom, pull-to-refresh
│   │                    #   Challenges: 5 weekly opt-in challenges with progress bars,
│   │                    #     summary strip (Joined/Completed/Available), completion badges
│   └── profile.tsx      # Profile — gradient hero, streak calendar, weekly goal progress,
│                        #   level badge (tappable → /leveling), level-up modal,
│                        #   What's Next card → future-vision
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
│                        #   permissions (HC + notifications permission flow), region
│                        #   selection, ready screen
│
├── health-connect-setup.tsx   # HC permission flow with per-app instructions
├── health-connect-sync.tsx    # Bulk sync — selectable checklist of exercise sessions +
│                              #   pedometer days, "Import N activities" button. Four-stage
│                              #   animated success screen. "Go to Dashboard" routes via
│                              #   router.replace('/(tabs)') — not router.back()
├── leveling.tsx         # Levels & Ranks screen — hero card with animated XP bar, gradient
│                        #   using current rank colour, stat chips, NextRankPill teaser,
│                        #   all 8 tier cards with staggered entrance animations and live
│                        #   fill bars, quadratic formula info card.
│                        #   Accessed from profile.tsx rank pill (router.push('/leveling'))
├── future-vision.tsx    # Static "What's Next" screen — 4 vision cards (EcoToken
│                        #   Marketplace, Friend Accountability, Municipal Integration,
│                        #   Predictive AI Coach), each with Planned badge + bullet points.
│                        #   Accessible from Profile tab What's Next card
├── login.tsx            # Auth screen — email + Google Sign-In, inline error messages
├── settings.tsx         # Settings — theme, region, HC status, cloud sync timestamp,
│                        #   leaderboard opt-in toggle, Notifications section (permission
│                        #   request, daily reminder toggle + time picker, weekly recap,
│                        #   missed-day nudge, streak-at-risk alert), Terms of Service,
│                        #   Privacy Policy, feedback link
├── edit-profile.tsx     # Edit name, weekly target, avatar
└── _layout.tsx          # Root layout — auth state, Firestore listeners, freshLogin ref,
                         #   weekly EcoScore snapshot writer + loader. readyFlags ref
                         #   (userDoc + activities) and maybeWriteSnapshot() guarantee
                         #   exactly one correct snapshot write per login session.
                         #   snapshotParams ref ensures correct weeklyTarget/region values.
                         #   Calls checkAndScheduleMissedDayNudge() after activities load.

src/
├── store/
│   ├── activityStore.ts # Zustand store — activities, userProfile (tokens,
│   │                    #   totalCarbonSaved), celebration, levelUpPending,
│   │                    #   pendingLevel, _hasHydrated, _profileLoaded,
│   │                    #   ecoScoreSnapshots (weekly history, loaded from Firestore).
│   │                    #   duplicateActivity() creates a dated copy and returns
│   │                    #   it for Firestore persistence by the caller
│   └── themeStore.ts    # Zustand store — persisted theme mode (light/dark/system)
│
├── services/
│   ├── healthConnect.ts      # HC permission flow, polling, session fetch, daily pedometer.
│   │                         #   fetchTodaySteps() deduped by dataOrigin (Math.max per origin)
│   │                         #   fetchRecentActivities() walking steps also deduped by origin
│   ├── healthSyncService.ts  # Bulk sync — merges sessions + pedometer days, commitSync
│   │                         #   (stores local date string, not UTC, to fix display time bug).
│   │                         #   Calls persistWeeklyEcoScore() after commit so leaderboard
│   │                         #   reflects HC imports immediately
│   ├── notificationService.ts # Local push notifications — configureNotificationHandler(),
│   │                          #   requestNotifPermission(), getNotifPermStatus(),
│   │                          #   applyNotifSettings() (schedules/reschedules all repeating
│   │                          #   notifications), checkAndScheduleMissedDayNudge() (one-shot,
│   │                          #   called on cold boot from _layout.tsx),
│   │                          #   sendGoalReachedNotification() (one-shot on weekly goal hit).
│   │                          #   NotifSettings persisted to AsyncStorage under 'notifSettings'.
│   │                          #   Android channel: 'ecoverse_default'
│   ├── aiSuggestions.ts      # Gemini API calls, 24h cache keyed to activity data hash.
│   │                         #   System prompt explicitly excludes food/diet/food waste tips;
│   │                         #   focuses on energy, water, transport, laundry, standby power,
│   │                         #   thermostat, and packaging. Fallback pool: 7 data-aware tips.
│   ├── billOCR.ts            # Camera capture + OCR for electricity and water bills
│   └── billService.ts        # Bill data extraction and L & kWh calculation
│
├── content/
│   ├── termsOfService.ts     # Terms of Service text (shown in-app modal)
│   └── privacyPolicy.ts      # Privacy Policy text (shown in-app modal)
│
└── utils/
    ├── ecoLogic.ts           # CO₂ calculations, token formulas, EcoScore (capped at 100),
    │                         #   streak logic, CATEGORY_COLORS, week/month range helpers.
    │                         #   calculateEcoScore() exported for reuse by dashboard +
    │                         #   persistWeeklyEcoScore(). persistWeeklyEcoScore() writes
    │                         #   weeklyEcoScore to both /users/{uid} and /leaderboard/{uid}
    │                         #   with merge:true after every activity save/edit/HC import.
    ├── levelSystem.ts        # Leveling system — getLevelInfo(), getRankInfo(), RANKS array,
    │                         #   tokensForLevel(). Formula: 500 × (L-1)². 8 rank tiers.
    ├── challengeData.ts      # 5 weekly challenges (Step Sprint, Power Saver, Green Commuter,
    │                         #   Consistency Champion, Water Warrior). getChallengeProgress()
    │                         #   derives live progress from activities array. getCurrentWeekId()
    │                         #   uses Sunday-based local date key.
    ├── co2Equivalents.ts     # Real-world CO₂ equivalent lookup and formatter
    └── dateUtils.ts          # isToday, isThisWeek, localMidnightToday, localEndOfDay,
                              #   toLocalISOString (UTC→local for Health Connect dates)

components/
├── ai-suggestions-card.tsx   # AI tips card with force-refresh, rate-limit badge
├── health-connect-banner.tsx # Auto-fill banner on add screen when HC data available
├── LevelUpModal.tsx          # Level-up celebration modal — animated rank badge,
│                             #   floating emoji, pulsing glow, confetti, flavour text,
│                             #   next-level hint. Uses getRankInfo() for colour + emoji.
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

Formula: tokens needed to reach Level L = **500 × (L−1)²**. Level = `floor(sqrt(totalTokens / 500)) + 1`.

| Rank | Min Level | Token Range |
|------|-----------|-------------|
| Seed 🌱 | 1 | 0 |
| Sprout 🌿 | 2 | 500 – 2,499 |
| Sapling 🌳 | 4 | 2,500 – 15,999 |
| Grove Keeper 🌲 | 7 | 16,000 – 49,999 |
| Eco Guardian 🛡️ | 11 | 50,000 – 112,499 |
| Oak Warden 🪵 | 16 | 112,500 – 199,999 |
| Forest Elder 🌲 | 21 | 200,000 – 449,999 |
| Eco Legend ✨ | 31 | 450,000+ |

`LevelUpModal` fires on actual token increases — **not** on app boot (guarded by `_profileLoaded` flag). The rank pill on the Profile hero card is tappable and routes to `/leveling`.

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
           ├── Step 5: Permissions (Health Connect, notifications, camera)
           ├── Step 6: Region selection    ├── Dashboard
           └── Step 7: Ready              ├── Activity Log ──▶ Add / Details / Edit
                                          ├── Stats
                                          ├── Community ──▶ Leaderboard / Challenges
                                          └── Profile ──▶ Edit Profile
                                                     │   ├── Rank pill → Leveling screen
                                                     │   └── What's Next → Future Vision
                                                     └── Settings
                                                            ├── HC Setup
                                                            ├── HC Sync (bulk import)
                                                            └── Notifications (time picker)
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
    ├── weeklyEcoScore          ← written by persistWeeklyEcoScore() on every save/edit/sync
    ├── showOnLeaderboard       ← written by Settings leaderboard toggle (default: false)
    ├── hasFinishedOnboarding
    ├── lastLogin
    ├── activities/{activityId}
    │     ├── category, date, source ('manual' | 'health_connect')
    │     ├── hcId (HC session ID or 'steps-YYYY-MM-DD' for pedometer days)
    │     ├── hcSource (originating app package name, e.g. 'com.strava')
    │     └── steps / distance / duration / kwhSaved / litersSaved / billId
    ├── ecoScoreSnapshots/{YYYY-MM-DD}   ← Sunday-based local date key (e.g. "2026-05-03")
    │     ├── weekKey   (e.g. "2026-05-03" — Sunday date, local time)
    │     ├── score     (0–100, same formula as live EcoScore)
    │     ├── label     (e.g. "May 3" — used as chart axis label)
    │     └── updatedAt
    ├── challengeProgress/{weekId}
    │     ├── joinedIds[], progress{}, completedIds[]
    └── meta/healthSync
          ├── lastSyncedAt (ISO timestamp)
          └── importedIds   (array of HC session IDs + pedometer day IDs)

  leaderboard/{uid}             ← public mirror, readable by any authenticated user
    ├── weeklyEcoScore          ← mirrored from users/{uid} by persistWeeklyEcoScore()
    ├── displayName             ← user's real name (shown only if showOnLeaderboard: true)
    ├── photoURL
    ├── showOnLeaderboard       ← mirrored from settings toggle
    └── updatedAt
  ```
- **Real-time listeners** in root `_layout.tsx` keep the Zustand store in sync. After the initial activity snapshot loads, `_layout.tsx` writes this week's EcoScore snapshot to `ecoScoreSnapshots/{YYYY-MM-DD}` (merge — idempotent) and loads the last 12 weekly snapshots into `activityStore.ecoScoreSnapshots` for the dashboard history chart. Also calls `checkAndScheduleMissedDayNudge()` after activities load.
- **EcoScore snapshot write guarantee:** Three refs (`activitiesForSnapshot`, `snapshotWritten`, `readyFlags`) and a `maybeWriteSnapshot()` helper ensure the snapshot is written exactly once per login, only after both the user doc listener and activities listener have fired, using the correct weeklyTarget and region values. Week keys use **Sunday-based local dates** (not ISO week numbers) to match the boundaries used throughout the app.
- **Three-flag loading guard** (`authResolved` + `userDocReady` + `activitiesReady`) eliminates skeleton flash before login. A `freshLogin` ref skips the data-loading skeleton for new sign-ins.
- **Firestore security rules:** `/users/{userId}` and all sub-collections are read/write by owner only. `/leaderboard/{userId}` is readable by any authenticated user, writable only by the document owner.
- **Account deletion:** Zustand store cleared first (before `deleteUser`) so `onAuthStateChanged` sees clean state. No competing `router.replace` call in `settings.tsx`.

---

## 🔔 Notifications

Notification logic lives in `src/services/notificationService.ts`. All notifications are **local** (expo-notifications) — no FCM/remote push.

### Notification types

| Type | Trigger | Default |
|------|---------|---------|
| Daily activity reminder | Daily at user-chosen time | On, 19:00 |
| Weekly goal recap | Every Sunday at user-chosen time | On, 09:00 |
| Missed-yesterday nudge | One-shot, 30s after cold boot if no activity yesterday | On |
| Streak at-risk alert | Daily at user-chosen time | Off |

### Settings integration

Notification preferences are stored in `AsyncStorage` under the key `'notifSettings'` as a JSON object matching `NotifSettings`. Any toggle or time change in Settings calls `applyNotifSettings()`, which cancels all scheduled notifications and reschedules them from scratch.

### Permission flow

- `getNotifPermStatus()` — returns `'granted' | 'denied' | 'not_asked'`
- `requestNotifPermission()` — creates Android channel `ecoverse_default` then calls `requestPermissionsAsync()`
- Settings Notifications section shows a single "Enable notifications" row when not yet granted, and expands to the full controls once granted
- `shouldShowBanner: true` and `shouldShowList: true` required by newer expo-notifications `NotificationBehavior` type

### _layout.tsx wiring

```ts
// Top of file (module level):
import { configureNotificationHandler, checkAndScheduleMissedDayNudge } from '@/src/services/notificationService';
configureNotificationHandler();
import AsyncStorage from '@react-native-async-storage/async-storage';

// Inside activities onSnapshot callback, after loadEcoScoreSnapshots:
AsyncStorage.getItem('notifSettings').then(raw => {
  const ns = raw ? JSON.parse(raw) : {};
  const dates = firebaseData.map((a: any) => String(a.date));
  checkAndScheduleMissedDayNudge(dates, ns.missedDayNudge ?? true).catch(() => {});
}).catch(() => {});
```

---

## 🏆 Community Screen

Accessible via the third tab. Two sections via segmented control:

### Leaderboard
- Global ranking of all EcoVerse users by **weekly EcoScore** (resets every Sunday)
- Podium component for ranks 1–3 with medal colours, bordered avatar rings, and gradient coloured blocks
- Rows 4+ rendered as a flat list with score dot badges
- Data source: `/leaderboard` collection (not `/users`), ranked by `weeklyEcoScore` desc, limit 50
- **Privacy-by-default:** eco-alias (`SolarFox·4821`) shown unless `showOnLeaderboard: true`
- **Sticky "You" row** pinned at bottom regardless of scroll position
- Pull-to-refresh

### Weekly Challenges

| Challenge | Goal | Reward |
|-----------|------|--------|
| Step Sprint | 20,000 steps this week | 100 tokens |
| Power Saver | Save 10 kWh this week | 80 tokens |
| Green Commuter | Cycle or walk 15 km this week | 90 tokens |
| Consistency Champion | Log at least one activity every day | 120 tokens |
| Water Warrior | Save 200 litres this week | 70 tokens |

- Progress calculated client-side from activities array via `getChallengeProgress()`
- Summary strip at top shows Joined / Completed / Available counts
- Week ID uses Sunday-based local date key matching EcoScore week boundaries

---

## 💚 Health Connect Integration

EcoVerse integrates with Android Health Connect to import steps, distance, and exercise sessions from third-party fitness apps.

### Permission Flow
- `expo-health-connect` config plugin adds required intent filter to the manifest during prebuild
- `requestHealthPermissions()` polls `checkHealthPermissions()` up to 10 times after dialog closes (HC permission propagation delay: 1–6 seconds)

### Bulk Sync

Two data sources merged:

**1. Exercise Sessions** — structured workout records from Strava, Samsung Health, Google Fit etc. `hcSource` field stores originating app package name for "via Strava" display in details.tsx.

**2. Daily Step Summaries** — `Steps` records aggregated per local calendar day. `fetchDailyStepSummaries()` buckets by `(localDate, dataOrigin)` and takes the **maximum single-origin total** to prevent cross-app double-counting (Samsung Health + Google Fit both write the same steps to HC).

**Deduplication logic:**
- Exercise sessions: filtered by `importedIds` + ±2h temporal cross-check
- Step summary days: suppressed if any HC walking session (new or previously imported) covers the same date; also suppressed for manual walking entries on the same date
- `importedIds` stores both session IDs and `steps-YYYY-MM-DD` keys

**Date/Time Display Fix:** `commitSync()` converts HC UTC start times via `toLocalISOString()` — formats as `YYYY-MM-DDTHH:MM:SS` without trailing `Z` so JS treats it as local time.

---

## 🤖 AI-Powered Tips (Gemini)

- **Data-aware prompts:** Tip request includes recent activities, categories, CO₂ total, and streak
- **Food/diet exclusion enforced in system prompt:** Gemini is explicitly prohibited from suggesting dietary changes, plant-based diets, food waste reduction, or meal planning. Constrained to: home energy saving, water conservation, active transport, laundry habits (cold wash, air-dry), device charging, standby power, thermostat adjustments, and single-use reduction
- **New user handling:** Curated placeholder tips shown immediately without API call when no activities exist
- **24h cache:** Keyed to a hash of the activity summary; only invalidated when data changes
- **Rate-limit handling:** Shows cached tips with a "Quota reached" badge
- **Force refresh:** Reload button bypasses cache
- **Fallback tips:** Pool of 7 data-aware tips (3 shown), including thermostat adjustment and cold-water laundry. Tips reference the user's actual top category and missing categories.
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
- Slide-in banner + confetti fires on any tab when goal is reached (via `(tabs)/_layout.tsx`)
- Keyed to `celebratedWeek` (Sunday date string), auto-resets each week
- Re-fires if user raises their target above current count

### Leveling System
- Rank pill on Profile hero card is a `Pressable` → `router.push('/leveling')`
- `leveling.tsx`: hero card with gradient, animated XP bar, stat chips, NextRankPill teaser; all 8 tier cards with staggered entrance animations and per-tier fill bars; quadratic formula info card
- `LevelUpModal`: animated rank badge (rank colour from `getRankInfo()`), floating emoji, pulsing glow, confetti, flavour text per level
- `_profileLoaded` flag prevents modal on cold boot

### Streak System
- Grace period: streak counts from yesterday if today has no activity yet
- Streak multiplier: +10% per 5-day streak, capped at +50%

### EcoScore Ring
- Colour zones: red (<50), amber (50–74), green (≥75)
- Ring arc and inner circle border both adopt the zone colour
- Tappable → `EcoScoreModal` (spring-animated bottom sheet)
  - *30-Day Tokens* tab: `SparklineChart` sub-component, `CartesianChart` + `Line` + `Area`, press tooltip via `useChartPressState`
  - *Score History* tab: `HistoryChart` sub-component, fixed 0–100 Y axis, colour-coded dot row

### Weekly EcoScore Snapshots
- Written to `users/{uid}/ecoScoreSnapshots/{YYYY-MM-DD}` (Sunday-based local date key)
- `readyFlags` + `maybeWriteSnapshot()` guarantee exactly one write per session after both Firestore listeners fire
- `snapshotParams` ref supplies correct weeklyTarget/region — avoids Zustand store race on cold boot

---

## 📊 Stats Screen

Redesigned with a gradient hero banner and a featured full-width 8-week CO₂ chart above three horizontally swipeable card rows with animated pill indicators.

**Hero banner:** `LinearGradient` (`#1B4332 → #0E2318` dark, `#2D6A4F → #1B4332` light). Shows total CO₂ saved (Firestore `totalCarbonSaved`), total EcoTokens (`userProfile.tokens` — authoritative Firestore value, same source as Profile tab, avoids streak-multiplier discrepancy), total distance, and top activity category.

**Featured chart (`WeeklyCO2Chart`):** Full-width 8-week CO₂ bar chart. Touch handled by a transparent `View` overlay using the React Native responder system (`onStartShouldSetResponder` / `onResponderGrant` / `onResponderMove`) rather than Victory Native's built-in pan gesture (which requires finger movement to activate, causing static taps to silently cancel). Bar index computed from `locationX` and chart slot geometry — instant on first tap, supports drag. Selected bar at full tint with white pip `SkiaCircle` above. `CartesianChart` has no `chartPressState` (rendering only).

**Row 1 — Overview:** All-Time detail (stat tiles + CO₂ stacked bar + dominant-category insight) | This Week vs Last Week (tokens + activity count pills, CO₂ dual bars by category — CO₂ summary pill omitted to avoid misleading monthly-bill distortion)

**Row 2 — Breakdown:** Activity Mix SVG donut (react-native-svg, two-column grid legend below the donut) | CO₂ Breakdown (per-category rows with icon bubbles, kg values and %)

**Row 3 — Monthly:** Monthly Activity (comparison pills + CO₂ dual bars; count per category omitted — covered by donut) | Monthly Utilities (kWh + litres vs previous month)

**Performance:** `activitiesEnriched` memo pre-computes `_date`, `_co2`, `_tokens` once; all downstream filters/reduces read from it. Horizontal `ScrollView` rows replace previous `FlatList`s (eliminates nested VirtualizedList warning). All heavy computations in `useMemo`. Sub-components wrapped in `memo()`.

---

## 🎨 UI Design

- **Theme:** Full light/dark mode with system-follow option, persisted via `themeStore`. `_hydrated` flag prevents flash on cold boot
- **Login:** Soft green gradient (light) / deep forest green (dark). Inline error messages
- **Dashboard:** Time-based greeting, EcoScore hero with zone-coloured SVG ring (tappable — opens EcoScore modal), CO₂ card with weekly total and transport-only week-on-week % comparison, real-world CO₂ equivalent, quick stats row, recent activity, AI tips card
- **Stats:** Gradient hero banner (CO₂ total, EcoTokens from Firestore, distance, top activity) + featured 8-week CO₂ chart + three swipeable card rows. Bar chart uses transparent responder overlay for reliable instant tap — no Victory Native pan gesture dependency
- **Activity screen:** Category colour accent bars, coloured filter chips, weekly grouping, empty state with CTA. Long-press on any card triggers a haptic + custom bottom-sheet action sheet with Duplicate and Delete options.
- **Community:** Podium (top 3) + flat list rows (4+), score dot badges, sticky "You" bar, challenge cards with coloured left accent, summary strip
- **Profile:** 3-stop gradient hero, level badge, streak calendar bottom sheet, goal progress bar
- **Leveling screen:** Gradient hero card using rank colour, staggered tier cards, locked tiers dimmed with lock icon
- **Settings:** iOS-style uppercase section headers, coloured icon rows, live cloud sync timestamp, HC connection status, leaderboard opt-in toggle, in-app Terms of Service and Privacy Policy modals
- **Settings Notifications:** Permission request row expands into four live toggles + time picker bottom sheet once granted
- **Onboarding:** 7-step pager with animated transitions, theme-aware backgrounds
- **Health Connect Sync success screen:** Four-stage animation (circle scale → checkmark → stat cards → hint)
- **`android_ripple` removed from all `Pressable` components** — use `({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]`

---

## 🔐 Auth & Security

- **Inline errors** — Firebase error codes mapped to user-friendly messages
- **Delete account** — Zustand store cleared first (before `deleteUser`) so `onAuthStateChanged` sees clean state. No competing `router.replace` in `settings.tsx`
- **Gemini API key** — currently in `.env`. For production: move to Firebase Cloud Function
- **Notifications** — local only; no server-side data access

---

## 🚀 Running the Project

```bash
npm install
npx expo start
npx expo run:android   # required for Victory Native v41, Health Connect, datetimepicker
```

> **After a clean prebuild:** `npx expo prebuild --clean` resets `android/gradle.properties`. Re-add `minSdkVersion=26`.

> **app.json:** Add `"expo-notifications"` to the plugins array for notification support.

---

## 🐛 Bug Fixes Log

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Health Connect times show as 2:00 AM (UTC+2) | `hca.startTime` stored as UTC ISO string | `toLocalISOString()` strips `Z` suffix |
| Manual activity times show midnight | `toISODate()` returns date-only string parsed as UTC midnight | Same `toLocalISOString()` fix in `add.tsx` |
| EcoScore can reach 107 | `Math.min(100, …)` missing from `calculateEcoScore()` | Added cap |
| Level-up modal fires on every cold boot | Zustand init sets `tokens = 0`; first snapshot looks like increase | `_profileLoaded` flag gates level-up check |
| Dashboard CO₂ week-on-week % misleading | Utility bills logged monthly; empty week shows −100% | `getWeekCarbonComparison()` filters transport only |
| Stats CO₂ pill misleading | Same cause | Pill removed; per-category bars retained |
| +Log button tint flash on OS theme change | `android_ripple` recreates native `RippleDrawable` on re-render | Removed `android_ripple` app-wide |
| Theme tint flash on cold boot | Stale persisted `mode` applied before AsyncStorage rehydration | `_hydrated` flag in `themeStore` |
| EcoScore snapshot writes 100 (v1 race) | `writeEcoScoreSnapshot()` read Zustand store before `setUserProfile` fired | `snapshotParams` ref populated from user doc listener |
| EcoScore snapshot wrong on some cold boots (v2 race) | Activities listener could fire before user doc listener | `readyFlags` + `maybeWriteSnapshot()` — write only after both listeners fire |
| EcoScore snapshot attributed to wrong week (UTC+2/+3 Mondays) | `getISOWeekKey()` used UTC Monday boundaries | `getWeekKey()` uses Sunday-based local dates |
| Community leaderboard shows 0 for all users | `weeklyEcoScore` never written to Firestore | `persistWeeklyEcoScore()` called in `add.tsx`, `edit.tsx`, `health-connect-sync.tsx` |
| Leaderboard query fails with permissions error | `/users` is owner-only | `/leaderboard` top-level collection with public-read rules |
| HC auto-fill banner shows double steps | `fetchTodaySteps()` summed all `Steps` records | Buckets by `dataOrigin`, takes `Math.max` per origin |
| Walking session import inflates step count | `fetchRecentActivities()` inner `Steps` query same issue | Same origin-bucketing fix |
| Gemini tip about food waste / plant-based diet | System prompt didn't exclude food domains | Explicit ban in prompt; fallback pool expanded |
| "Go to Dashboard" after HC sync → Settings | `router.back()` navigates to previous screen | `router.replace('/(tabs)')` |
| Double navigation on account deletion | Both `settings.tsx` and `onAuthStateChanged` called `router.replace('/login')` | Removed explicit call from `settings.tsx` |
| Notification handler type error (TS2322) | Newer `expo-notifications` requires `shouldShowBanner` + `shouldShowList` | Added both fields to `handleNotification` return |
| Missed-day nudge `await` at top level of component | Nudge lines pasted outside any function in `_layout.tsx` | Moved inside activities `onSnapshot` callback |
| `setNotifModal(true) \|\| setTimePickerFor()` void error | `setNotifModal` returns `void`; `\|\|` on void is TS error | Split into `{ setTimePickerFor(...); setNotifModal(true); }` |
| Stats hero EcoTokens differs from Profile | `calculateTokens()` omits streak multiplier baked in at save time; sum of recalculated values is lower | `totalTokens` reads `userProfile.tokens` (Firestore) — identical source to Profile tab |
| Stats 8-week chart invisible (height) | `CartesianChart` (Skia canvas) cannot infer height from flex; renders into 0px | Explicit `<View style={{ height: CHART_HEIGHT }}>` wrapper required |
| Stats 8-week chart bars all invisible (Bar API) | `Bar` in Victory Native v41 requires full `points` array — per-point loop produces nothing | One `<Bar points={points.co2} />` for all bars; second overlay `Bar` for current-week highlight |
| Stats chart bar tap shows wrong bar or no response | Victory Native pan gesture requires movement to activate; static taps silently cancelled | Transparent `View` responder overlay; index from `locationX` ÷ slot width — instant on first tap |
| Reanimated warning on Stats screen | `chartPressState.*.position.value` read during JSX render | Removed `chartPressState`; tooltip via plain React state from responder overlay |
| VirtualizedList slow-update warning on Stats | Three nested `FlatList`s inside vertical `ScrollView` | Replaced with horizontal `ScrollView` + `pagingEnabled` + `snapToInterval` |

---

## 🚀 Future Vision Screen

`future-vision.tsx` — four planned directions, all labelled "Planned — not yet live":

| Direction | Summary |
|-----------|---------|
| EcoToken Marketplace | Redeem tokens for partner discounts, municipal bill credits, public transport perks |
| Friend Accountability | Opt-in friend circles with EcoScore sharing, shared weekly challenges, gentle nudges |
| Municipal & Civic Integration | Smart meter auto-sync, city-wide EcoScore dashboards, Green Deal community challenges |
| Predictive AI Coach | Behaviour-pattern ML model, proactive nudges, smart goal calibration, carbon forecasting |

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
