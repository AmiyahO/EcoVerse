# 🌱 EcoVerse

EcoVerse is a mobile application that helps users track eco-friendly activities, calculate their CO₂ savings, and stay motivated through gamified rewards. Users log physical activities (walking, running, cycling) and household utility savings (electricity, water), earn EcoTokens, and track their environmental impact over time. A Community screen provides a global weekly leaderboard and opt-in weekly challenges.

Developed as a **Final Year Project (FYP)** using **React Native** and **Expo**.

---

## 🎯 Project Objectives

- Allow users to log eco-friendly activities manually with CO₂ and token calculations, including backdating forgotten entries
- Import activities from Android Health Connect with duplicate prevention — both exercise sessions and daily pedometer step summaries. Health Connect is pre-installed on Android 14+ (API 34+); users on Android 9–13 may need to install it from the Play Store first.
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
| Network state | `@react-native-community/netinfo` (drives Live/Offline badge in community screen) |
| Health data | Android Health Connect (`expo-health-connect` config plugin + `react-native-health-connect`) |
| AI tips | Google Gemini API (24h cached, data-aware prompts, food/diet excluded) |
| OCR | Expo Camera + Google ML Kit / Vision API |
| Notifications | `expo-notifications` (local scheduled — daily reminder, weekly recap, missed-day nudge, streak-at-risk) |
| Audio | `expo-audio` (SFX — level-up chime, activity save, goal reached; preloaded at boot via `sfx.ts`) |
| Primary platform | Android (minSdkVersion 26 / Android 8.0) |

---

## 📂 Project Structure

```
app/
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator — global celebration banner, confetti
│   ├── index.tsx        # Dashboard — EcoScore hero + zone-coloured SVG ring (tappable →
│   │                    #   EcoScoreModal with "Tap for insights" hint below ring),
│   │                    #   30-day token sparkline + score history tabs (responder overlay
│   │                    #   tap-to-select; persistent tooltip; vertical indicator line;
│   │                    #   no useChartPressState), CO₂ card with transport-only
│   │                    #   week-on-week % (falls back to all-CO₂ when no transport data,
│   │                    #   labelled "transport" or "all CO₂"), AI eco-tips pill button
│   │                    #   (tap opens bottom-sheet modal), quick stats, recent activity
│   ├── activity.tsx     # Activity log — category filters, weekly grouping, accent cards,
│   │                    #   long-press action sheet (duplicate / delete with haptic feedback)
│   ├── community.tsx    # Community — segmented control: Leaderboard | Challenges
│   │                    #   Leaderboard: podium for top 3, global ranking by weeklyEcoScore
│   │                    #     from /leaderboard collection, eco-alias by default (opt-in real
│   │                    #     name), sticky "You" row at bottom, pull-to-refresh
│   │                    #   Live/Offline badge: NetInfo.addEventListener drives header badge
│   │                    #     (green 'Live' when connected, red 'Offline' when not)
│   │                    #   Challenges: weekly opt-in challenges with progress bars,
│   │                    #     summary strip (Joined/Completed/Available), completion badges.
│   │                    #   ChallengeCompleteModal: fires when progress crosses goal.target;
│   │                    #     shows badge label, icon, reward tokens, haptic feedback.
│   │                    #     Writes arrayUnion(ch.id) to completedIds + increment(tokens).
│   │                    #     firedCompletions ref prevents re-firing on re-renders.
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
│   └── profile.tsx      # Profile — gradient hero (3-stat hero: Tokens | Activities | CO₂),
│                        #   streak badge with dynamic Best-Nd pill (tint when beatable,
│                        #   gold #FFD166 when matched/beaten), level badge (tappable →
│                        #   /leveling), level-up modal, Achievements card → /achievements,
│                        #   What's Next card → future-vision. calculateLongestStreak()
│                        #   helper added. XP bar: 12px height with rank-colour glow shadow.
│                        #   dynamicTarget guarded against 0 (Math.max(..., 1))
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
│   ├── _onboardingWrapper.tsx  # PagerView wrapper with animated pill dots + step counter
│   │                           #   (e.g. "3 / 7"), theme-aware. "Get Started 🌱" on last step.
│   └── 1.tsx – 7.tsx   # 1: Welcome (stats pills), 2: How it works (4 steps incl. community),
│                        #   3: Track & Earn (categories + token rates + streak/rank teaser),
│                        #   4: Community (challenge + leaderboard preview, privacy note),
│                        #   5: Permissions (HC real requestHealthPermissions, notifications
│                        #     via expo-notifications requestPermissionsAsync, camera via
│                        #     expo-camera — all properly implemented, re-check on AppState
│                        #     'active'), 6: Region selection, 7: All Set (updated highlights)
│
├── health-connect-setup.tsx   # HC permission flow. Detects Android API level at runtime:
│                              #   Android 14+ (API 34+): HC pre-installed, no download prompt.
│                              #   Android 9–13: conditional Play Store link shown only if needed.
│                              #   Includes per-app setup instructions for 7 fitness apps.
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
                         #   getWeekLabel() returns W{n} ISO week number (Sunday-start
                         #   adjusted: Sunday advances +1 day before ISO calc so Sunday
                         #   opens a new week). loadEcoScoreSnapshots() orders by
                         #   updatedAt desc to handle mixed YYYY-MM-DD / YYYY-Wnn keys.

src/
├── store/
│   ├── activityStore.ts # Zustand store — activities, userProfile (tokens,
│   │                    #   totalCarbonSaved), celebration, levelUpPending,
│   │                    #   pendingLevel, streakMilestonePending, pendingStreakDays,
│   │                    #   _hasHydrated, _profileLoaded,
│   │                    #   ecoScoreSnapshots (weekly history, loaded from Firestore),
│   │                    #   shownStreakMilestones (persisted — prevents re-firing
│   │                    #   streak modal after streak rebuilt to same milestone),
│   │                    #   unlockedAchievementIds (persisted — keeps badges earned).
│   │                    #   Activity type includes co2Saved? and tokensEarned? fields.
│   │                    #   duplicateActivity() creates a dated copy and returns
│   │                    #   it for Firestore persistence by the caller
│   └── themeStore.ts    # Zustand store — persisted theme mode (light/dark/system)
│
├── services/
│   ├── healthConnect.ts      # HC permission flow, polling, session fetch, daily pedometer.
│   │                         #   fetchTodaySteps() now delegates to fetchStepsForDate(new Date()).
│   │                         #   fetchStepsForDate(date) queries HC for any given local calendar
│   │                         #   day (local midnight → now for today, → 23:59:59 for past dates).
│   │                         #   Both deduped by dataOrigin (Math.max per origin).
│   │                         #   fetchRecentActivities() walking steps also deduped by origin
│   ├── healthSyncService.ts  # Bulk sync — merges sessions + pedometer days, commitSync
│   │                         #   (stores local date string, not UTC, to fix display time bug).
│   │                         #   Calls persistWeeklyEcoScore() after commit so leaderboard
│   │                         #   reflects HC imports immediately.
│   │                         #   registerAddScreenImport(hcId) — writes hcId to
│   │                         #   meta/healthSync.importedIds after add-screen HC save
│   │                         #   so sync screen treats it as already imported.
│   │                         #   importedSet built from importedIds UNION hcId values
│   │                         #   on existing activities — catches add-screen imports
│   │                         #   even if registerAddScreenImport hasn't run yet.
│   │                         #   Delta entries carry originalDayId so commitSync
│   │                         #   writes the correct pedometer day ID as hcId on the
│   │                         #   Firestore activity, enabling cumulative delta tracking.
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
│   ├── billService.ts        # Bill data extraction. calculateSaving() always compares against
   │                         #   the regional baseline (getRegionalBaseline()) — never bill-to-bill.
   │                         #   Previous reading displayed as informational context only.
   │                         #   Prevents gaming via month-on-month comparison and anchors
   │                         #   savings to a stable, meaningful reference.
   │                         #   deleteBillForActivity(billId) — soft-deletes linked bill
   │                         #   record so getLastBill() does not return stale data after
   │                         #   an electricity or water activity is deleted.
   └── notificationService.ts # (see Notifications section) + sendMissedChallengeNotification()
                              #   fires on first app open of new week if prior week had
                              #   joined-but-incomplete challenges.
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
    ├── challengeData.ts      # Static fallback challenge array (11 entries: 7 movement + 4 CO₂).
    │                         #   getChallengeProgress() handles steps/distance/kwh/litres/
    │                         #   activities/co2/tokens metrics. co2 metric reads co2Saved
    │                         #   from activity document (written by add.tsx at save time).
    │                         #   getCurrentWeekId() uses Sunday-based local date key.
    ├── co2Equivalents.ts     # Real-world CO₂ equivalent lookup and formatter
    └── dateUtils.ts          # isToday, isThisWeek, localMidnightToday, localEndOfDay,
                              #   toLocalISOString (UTC→local for Health Connect dates)

components/
├── ai-suggestions-card.tsx   # AI tips card with force-refresh, rate-limit badge
├── health-connect-banner.tsx # Auto-fill banner on add screen when HC data available.
│                             #   Accepts selectedDate prop — re-fetches steps for that
│                             #   specific date via fetchStepsForDate(); not always today.
│                             #   useEffect re-runs on both category and selectedDate change.
│                             #   Header shows 'May 8 from Health Connect' for past dates.
│                             #   onAutoFill includes hcId param (steps-YYYY-MM-DD for
│                             #   pedometer, session.id for exercise sessions) for
│                             #   deduplication in add.tsx handleHCAutoFill.
├── LevelUpModal.tsx          # Level-up celebration modal — animated rank icon
│                             #   (MaterialCommunityIcons), floating icon in rounded tile,
│                             #   pulsing glow, confetti (count 70, optimised), haptic on
│                             #   confetti fire, flavour text, next-level hint.
│                             #   Uses getRankInfo() for colour + icon name.
├── StreakMilestoneModal.tsx   # Streak milestone modal — fires at 3/7/14/30/60/100 days.
│                             #   Animated scale-in, floating fire icon, streak number hero,
│                             #   pulsing glow, haptic. Triggered via activityStore
│                             #   triggerStreakMilestone(days) + clearStreakMilestone().
├── streak-calendar-sheet.tsx # Bottom sheet streak calendar. longestStreak prop
│                             # displays "Best Nd" pill in header. Day circles use
│                             # two absolute-positioned layers (dayRing + dayFill) with
│                             # no overflow:hidden — avoids Android text-clip bug where
│                             # borderWidth + overflow:hidden clips child text
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

| Activity | Factor | Source |
|----------|--------|--------|
| Walking | 0.16725 kg CO₂ per km | DESNZ 2025 flat file: Average car > Unknown fuel > km |
| Running | 0.16725 kg CO₂ per km | DESNZ 2025 flat file: Average car > Unknown fuel > km |
| Cycling | 0.173 kg CO₂ per km | DESNZ 2025 flat file: Medium car > Unknown fuel > km |
| Electricity | Regional grid intensity × kWh saved | See table below |
| Water | 0.004 kg CO₂ per litre saved | Blended estimate: Griffiths-Sattenspiel & Wilson (2009), Danfoss (2021) |

**Regional electricity intensity (kg CO₂ per kWh) — DESNZ 2025 / Ember 2025:**

| Region | kg CO₂/kWh | Source |
|--------|------------|--------|
| US | 0.384 | Ember Global Electricity Review 2025, p.89 |
| UK | 0.196 | DESNZ 2025 flat file: consumed (generated 0.177 + T&D 0.019) |
| EU | 0.213 | Ember Global Electricity Review 2025, p.95 |
| India | 0.708 | Ember Global Electricity Review 2025, p.100 |
| China | 0.560 | Ember Global Electricity Review 2025, p.89 |
| Global avg | 0.473 | Ember Global Electricity Review 2025, p.58 |

**Regional electricity baselines (kWh/month per household):**

| Region | kWh/month | Source |
|--------|-----------|--------|
| US | 899 | US EIA Electric Power Monthly 2022 |
| UK | 288 | DESNZ / UK Government data Dec 2024 |
| EU | 285 | Eurostat 2023 (1,545 kWh/capita × 2.3 HH) |
| India | 97 | NSS Household Consumption Expenditure Survey 2022–23 |
| China | 247 | NBS 2022 (987 kWh/capita × 3.0 HH ÷ 12) |
| Global avg | 292 | IEA/WEC ~3,500 kWh/HH/year |

**Regional water baselines (litres/month per household):**

| Region | L/month | Source & Derivation |
|--------|---------|---------------------|
| US | 23,250 | US EPA WaterSense: 82 gal (310 L)/person/day × 2.5 persons × 30 |
| UK | 10,440 | Water UK/DiscoverWater (CCW data): 145 L/person/day × 2.4 persons × 30 |
| EU | 9,000 | European Environment Agency: ~130 L/person/day × 2.3 persons × 30 |
| India | 13,680 | CPHEEO: urban 135 L/day, rural 75 L/day → blended 114 L/day × 4.0 persons × 30 |
| China | 14,850 | China MoHURD/CEIC 2023: 188.8 L/person/day × 2.62 persons × 30 |
| Global avg | 15,000 | WHO: ~167 L/person/day × 3.0 persons × 30 |

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

| Rank | Icon (MaterialCommunityIcons) | Min Level | Token Range |
|------|-------------------------------|-----------|-------------|
| Seed | seed | 1 | 0 |
| Sprout | sprout | 2 | 500 – 2,499 |
| Sapling | tree | 4 | 2,500 – 15,999 |
| Grove Keeper | pine-tree | 7 | 16,000 – 49,999 |
| Eco Guardian | shield-half-full | 11 | 50,000 – 112,499 |
| Oak Warden | shield-home | 16 | 112,500 – 199,999 |
| Forest Elder | forest | 21 | 200,000 – 449,999 |
| Eco Legend | shield-crown | 31 | 450,000+ |

`LevelUpModal` fires on actual token increases — **not** on app boot (guarded by `_profileLoaded` flag). The rank pill on the Profile hero card is tappable and routes to `/leveling`.

### CO₂ Equivalents

Cumulative CO₂ savings are translated into a relatable real-world comparison displayed on the dashboard CO₂ card. The equivalent is selected automatically to produce the most readable quantity (targeting 5–500 units).

| Equivalent | kg CO₂ per unit | Source |
|------------|----------------|--------|
| Smartphone charge | 0.008 | IEA / Carbon Trust |
| Kettle boil | 0.020 | DESNZ 2023 |
| Load of laundry | 0.185 | Carbon Trust |
| km not driven | 0.16725 | DESNZ GHG factors 2023 |
| Plastic bottle | 0.083 | Franklin Associates |
| Hour of streaming | 0.036 | IEA 2023 |
| Hot shower (8 min) | 0.250 | 9kW × 0.196 kg/kWh |
| km of flying | 0.255 | ICAO per-passenger-km |
| Hour of AC | 0.553 | 1.5kW × global grid avg |
| Incandescent bulb (1 hr) | 0.012 | 60W × 1hr x 0.196 kg/kWh grid avg |
| kWh of grid electricity | 0.473 | IEA global average 2023 |
| Tree absorbing CO₂ (1 day) | 0.060 | ~22 kg/year ÷ 365 |

Food and diet equivalents intentionally excluded — EcoVerse does not track food consumption.

---

## 🧭 Navigation Flow

> **Tab bar labels:** Activity Log tab is labelled **'Log'**, Stats tab is labelled **'Progress'**.

```
Login ──▶ Onboarding (7 steps, new users only) ──▶ Tabs
           ├── Step 1: Welcome
           ├── Step 2: How it works
           ├── Step 3: Category preview
           ├── Step 4: Tokens & streaks
           ├── Step 5: Permissions (Health Connect, notifications, camera)
           ├── Step 6: Region selection    ├── Dashboard
           └── Step 7: Ready              ├── Activity Log ──▶ Add / Details / Edit
                                          ├── Community ──▶ Leaderboard / Challenges
                                          ├── Stats
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

- **Auth:** Email/password and Google Sign-In. Inline error messages with 10+ mapped Firebase error codes. Email verification sent on new account creation via `sendEmailVerification()`. Password reset via `sendPasswordResetEmail()` with inline confirmation banner and mapped error codes. Auth email templates configured with EcoVerse branding in Firebase console.
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
    │     ├── steps / distance / duration / kwhSaved / litersSaved / billId
    │     ├── co2Saved  ← kg CO₂ saved, stored at log time
    │     └── tokensEarned  ← final token award incl. streak multiplier, stored at log time
    ├── ecoScoreSnapshots/{YYYY-MM-DD}   ← Sunday-based local date key (e.g. "2026-05-03")
    │     ├── weekKey   (e.g. "2026-05-03" — Sunday date, local time)
    │     ├── score     (0–100, same formula as live EcoScore)
    │     ├── label     (e.g. "May 3" — used as chart axis label)
    │     └── updatedAt
    ├── challengeProgress/{weekId}
    │     ├── joinedIds[], progress{}, completedIds[]
    │     └── challengeTitles{}  ← metadata cached at join time
    └── meta/healthSync
          ├── lastSyncedAt (ISO timestamp)
          └── importedIds   (array of HC session IDs + pedometer day IDs)

  challenges/{id}               ← active weekly challenges (read: public; write: Cloud Function/Admin SDK only)
    ├── weekId, title, description, icon, color, difficulty, challengeType
    └── goal: { metric, target, categories[] }, rewardTokens, badgeLabel

  challengeTemplates/{id}       ← evergreen pool (read: public; write: Admin SDK only)

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
- **Firestore security rules:** `/users/{userId}` and all sub-collections are read/write by owner only. `/leaderboard/{userId}` is readable by any authenticated user, writable only by the document owner. `/challenges/{challengeId}` is publicly readable, write-disabled (Cloud Function uses Admin SDK). `/challengeTemplates/{id}` same pattern.
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
| Missed challenge nudge | One-shot on first app open of new week if prior week had joined-but-incomplete challenges | Automatic |

All notification titles and bodies are **plain text** (no emoji). Visual identity in the notification shade is provided by the Android channel `lightColor: '#4CAF50'` and the app's notification icon asset — not by text content.

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

**Weekly pool (22 templates — Cloud Function picks 2 easy + 2 medium + 1 hard/epic + 1 CO₂ = 6 challenges each Sunday):**

| Difficulty | Challenges |
|------------|-----------|
| Easy (4) | Step Sprint (20k steps), Green Commuter (15 km), Daily Mover (5 activities), Carbon Starter (0.5 kg CO₂) |
| Medium (7) | Sprint Starter (8 km run), Urban Trekker (12 km walk), Two-Wheel Hero (20 km cycle), Consistency Champion (7 active days), Sprint Master (6 runs), Eco Pedaler (8 cycles), Eco Explorer (12 activities), Green Impact (1 kg CO₂) |
| Hard (4) | Marathon Mood (50k steps), Coastal Cruiser (30 km cycle), Distance Crusher (30 km all), Movement Marathon (20 activities), Climate Contender (2 kg CO₂) |
| Epic (3) | The Century Quest (100k steps, 500 tokens), Distance Dynamo (50 km, 450 tokens), Ultra Runner (25 km run, 400 tokens), Carbon Crusher (5 kg CO₂, 400 tokens) |

**Monthly pool (5 templates — all appended on the first Sunday of each month):**

| Difficulty | Challenge | Goal | Reward |
|------------|-----------|------|--------|
| Easy | Quick Rinse | Save 200 L water | 100 tokens |
| Medium | Power Saver | Save 10 kWh | 180 tokens |
| Medium | Water Warrior | Save 500 L water | 170 tokens |
| Hard | Grid Guardian Elite | Save 20 kWh | 250 tokens |
| Hard | Hydro Hero | Save 750 L water | 220 tokens |

- Progress calculated client-side from activities array via `getChallengeProgress()`
  (handles steps, distance, kwh, litres, activities, co2 metrics)
- CO₂ challenges use `goal.metric: co2`; progress read from `co2Saved` field written to each activity document at save time
- CO₂ challenge templates carry `challengeGroup: 'co2'`; Cloud Function draws one per week from this pool independently of the difficulty shuffle
- Summary strip shows Joined / Completed / Available (count reflects live Firestore challenge count)
- Difficulty badge on each card (green easy / orange medium / red hard / purple epic)
- **Join** appends challengeId to `joinedIds` + caches metadata in `challengeTitles` map
- **Leave** removes challengeId via `arrayRemove`
- On weekly rollover: stale joined state cleared, missed-challenge notification fired
- Week ID uses Sunday-based local date key matching EcoScore week boundaries

---

## 🏅 Achievements Screen

`achievements.tsx` — accessible from the Profile tab via an Achievements card (`router.push('/achievements')`), two sections:

**Challenge Badges** — loads all `challengeProgress` sub-collection docs. For each `completedId`, resolves metadata from cached `challengeTitles` map (fallback: static `CHALLENGES` array). Renders as **2-column collectible badge tiles** (icon centred in a glow ring, badge label below, difficulty pill, week earned, token reward, colour accent bottom strip). Badges sorted newest-first.

**Milestones** — 38 static badges in a 2-column grid across 7 groups: General, Streaks (3/7/14/30/60/100 days), EcoTokens (100/500/1k/2.5k/5k/10k/25k), CO₂ (1/10/50/100/250/1000 kg), per-category firsts + activity counts (walking, running, cycling, electricity, water), and total activity count milestones (10/25/50/100/200/500). Icons use `FontAwesome6`, `MaterialCommunityIcons`, and `Ionicons` — `lib` field on `Milestone` interface selects the correct component. Unlocked cards show tinted background + checkmark. Locked cards show dashed border, padlock, `???` title, and a fractional progress bar. Hero banner shows rank icon (MaterialCommunityIcons), level, total badges, and completion percentage. `MilestoneStats` includes per-category activity counts, uniqueCategories, uniqueCategoriesThisWeek, and currentStreak.

---

## 💚 Health Connect Integration

EcoVerse integrates with Android Health Connect to import steps, distance, and exercise sessions from third-party fitness apps.

**Why Health Connect instead of direct per-app APIs?**  
Direct integration with individual app APIs (Strava OAuth, Samsung Health SDK, Garmin Connect API, etc.) would require separate auth flows for each service, limit coverage to explicitly supported apps, and miss users relying on the OS pedometer. Health Connect provides a single permission grant covering all installed fitness apps simultaneously, keeps all data on-device, and requires no API keys or per-service credentials.

**Pre-installation status:**
- **Android 14+ (API 34+):** Health Connect is pre-installed as a system component. No download required.
- **Android 9–13 (API 28–33):** Health Connect may need to be installed from the Play Store. `health-connect-setup.tsx` detects `Platform.Version` at runtime and only shows the Play Store prompt on older Android versions.

### Permission Flow
- `expo-health-connect` config plugin adds required intent filter to the manifest during prebuild
- `requestHealthPermissions()` polls `checkHealthPermissions()` up to 10 times after dialog closes (HC permission propagation delay: 1–6 seconds)

### Bulk Sync

Two data sources merged:

**1. Exercise Sessions** — structured workout records from Strava, Samsung Health, Google Fit etc. `hcSource` field stores originating app package name for "via Strava" display in details.tsx.

**2. Daily Step Summaries** — `Steps` records aggregated per local calendar day. `fetchDailyStepSummaries()` buckets by `(localDate, dataOrigin)` and takes the **maximum single-origin total** to prevent cross-app double-counting (Samsung Health + Google Fit both write the same steps to HC).

**Deduplication logic:**
- Exercise sessions: filtered by `importedIds` + ±2h temporal cross-check
- Step summary days: **delta calculation** — `pedometerTotal − importedSessionSteps`; only remainder offered if >200-step noise threshold. Distance scaled proportionally. Fixes silent loss of post-session steps (e.g. Samsung Health morning session imported, afternoon steps lost under old suppression logic).
- Manual walking entries on the same date fully suppress the pedometer day
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
- Confetti `ConfettiCannon` gated on `showCelebration` state — not always mounted (prevents visible origin artifact when idle). Count reduced 120 → 60; fired 150ms after banner animation starts to decouple from spring animation
- `setCelebrated(false)` reset on every new auth session (`onAuthStateChanged`) to prevent re-fire after sign-out/sign-in

### Haptic Feedback
- Save activity (`add.tsx`): `Haptics.notificationAsync(Success)` before `router.back()`
- Delete activity (`activity.tsx`): `Haptics.notificationAsync(Warning)` in `handleDelete`
- Delete activity (`details.tsx`): `Haptics.notificationAsync(Warning)` in `confirmDelete()`
- Level-up modal (`LevelUpModal.tsx`): `Haptics.notificationAsync(Success)` alongside confetti start (250ms delay)
- Streak milestone modal (`StreakMilestoneModal.tsx`): `Haptics.notificationAsync(Success)` on `visible` = true
- Edit profile save (`edit-profile.tsx`): already had `Haptics.notificationAsync(Success/Error)` — no change needed

### Sound Effects (SFX)
Implemented via `expo-audio` (migrated from deprecated `expo-av`). Shared utility: `src/utils/sfx.ts`.

- `preloadSounds()` called once at app boot in `app/_layout.tsx`
- `playSound(key, delayMs?)` — rewinds, plays, skips if already playing, silently ignores errors
- Assets stored in `assets/sounds/` (mix of `.mp3` and `.wav`)

| Sound | File | Trigger |
|-------|------|---------|
| Level-up chime | `level-up` | `LevelUpModal.tsx` on open, alongside haptic (250ms delay) |
| Activity save | `activity-save` | `add.tsx` after `commitActivity()` for all categories. Also `edit.tsx` after update, `edit-profile.tsx` after save |
| Goal reached | `goal-reached` | `(tabs)/_layout.tsx` celebration block with 1500ms delay to avoid overlap. Also `community.tsx` on `ChallengeCompleteModal` |

> Water activities use `activity-save` (not a coin sound). `token-earn` asset kept in `assets/sounds/` but not triggered.

### Leveling System
- Rank pill on Profile hero card is a `Pressable` → `router.push('/leveling')`
- `leveling.tsx`: hero card with gradient, animated XP bar, stat chips, NextRankPill teaser; all 8 tier cards with staggered entrance animations and per-tier fill bars; quadratic formula info card
- `LevelUpModal`: animated rank badge (rank colour from `getRankInfo()`), floating emoji, pulsing glow, confetti, flavour text per level
- `_profileLoaded` flag prevents modal on cold boot

### Streak System
- Grace period: streak counts from yesterday if today has no activity yet
- Streak multiplier: +10% per 5-day streak, capped at +50%
- **Streak milestone modals** — `StreakMilestoneModal` fires at 3/7/14/30/60/100 days.
- **Achievement unlock modal** — `AchievementModal` fires when a milestone is newly earned. State in `activityStore` (`achievementPending`, `pendingAchievementId`, `unlockedAchievementIds` — persisted). `achievementMap.ts` maps all 38 milestone IDs to display info. Detection in `achievements.tsx`: first visit silently seeds all earned milestones (no modal); subsequent visits show modal for one new achievement per visit. Rendered globally in `(tabs)/_layout.tsx`. Triggered in `add.tsx` via `triggerStreakMilestone(newStreak)` after `commitActivity()` when the post-save streak hits a milestone threshold. Staggered 800ms after weekly goal celebration if both fire simultaneously. State lives in `activityStore` (`streakMilestonePending`, `pendingStreakDays`). Rendered globally in `(tabs)/_layout.tsx` alongside `LevelUpModal`.

### EcoScore Ring
- Colour zones: red (<50), amber (50–74), green (≥75)
- Ring arc and inner circle border both adopt the zone colour
- Tappable → `EcoScoreModal` (spring-animated bottom sheet)
  - *30-Day Tokens* tab: `SparklineChart` sub-component, `CartesianChart` + `Line` + `Area`. Tooltip via `View` responder overlay (`onStartShouldSetResponder` / `onResponderGrant` / `onResponderMove`); selected index persists until next tap. Vertical indicator line at selected point. No `useChartPressState`.
  - *Score History* tab: `HistoryChart` sub-component, fixed 0–100 Y axis, colour-coded dot row. Same responder overlay pattern. X-axis labels use `W{n}` from snapshot `label` field.

### Weekly EcoScore Snapshots
- Written to `users/{uid}/ecoScoreSnapshots/{YYYY-MM-DD}` (Sunday-based local date key)
- `label` field stores `W{n}` ISO week number (e.g. `W20`) for chart axis display; doc key stays as `YYYY-MM-DD`
- `loadEcoScoreSnapshots()` orders by `updatedAt desc` to correctly sort mixed-format legacy (`YYYY-MM-DD`) and new (`YYYY-Wnn`) doc keys
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
- **Dashboard:** Time-based greeting with contextual icon (AntDesign `sunny` amber morning / FA6 `cloud-sun` green afternoon / AntDesign `moon` indigo evening) rendered to the right of the text. Name truncated at 12 chars to prevent layout break. `greetingLeft` is `flex:1 flexShrink:1`. EcoScore hero with zone-coloured SVG ring (tappable — opens EcoScore modal with "Tap any point to inspect" hint below each chart), CO₂ card with weekly total and transport-only week-on-week % comparison (redundant sub-label removed), real-world CO₂ equivalent, quick stats row, recent activity, AI Eco Tips pill button (tap opens bottom-sheet modal with `AISuggestionsCard` — modal header title + sparkle icon, card's own header with refresh button and footer text visible below). `paddingBottom: 90` ensures last item clears tab bar.
- **Stats:** Gradient hero banner (CO₂ total, EcoTokens from Firestore, distance, top activity) + featured 8-week CO₂ chart + three swipeable card rows. Bar chart uses transparent responder overlay for reliable instant tap — no Victory Native pan gesture dependency
- **Activity screen:** Category colour accent bars, coloured filter chips, weekly grouping, empty state with CTA. Long-press on any card triggers a haptic + custom bottom-sheet action sheet with Duplicate and Delete options.
- **Community:** Podium (top 3) + flat list rows (4+), score dot badges, sticky "You" bar, challenge cards with coloured left accent, summary strip
- **Profile:** 3-stop gradient hero with 3-stat row (Tokens | Activities | CO₂ saved). Streak badge shows current streak with dynamic Best-Nd pill: tint-coloured when current streak < best (motivational), gold `#FFD166` with 🏆 when matched/beaten. `calculateLongestStreak()` walks full activity history for longest consecutive-day run. Streak calendar bottom sheet shows "Best Nd" trophy pill in header. Goal progress bar.
- **Leveling screen:** Gradient hero card using rank colour (light mode: white → rank+30 → rank+18 to prevent washed-out appearance). No nav bar — minimal back button inside hero card top-left. Rank icons use `MaterialCommunityIcons` throughout (seed/sprout/tree/pine-tree/shield-half-full/shield-home/forest/shield-crown). Chevron-right removed from NextRankPill. Staggered tier cards, locked tiers dimmed with lock icon.
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

> **Expo Go is not supported** — EcoVerse uses native modules (Victory Native v41 Skia, Health Connect, `@react-native-community/datetimepicker`) that require a custom dev build. For development: uninstall the release APK first (signing conflict), then use `npx expo run:android` over USB with USB debugging enabled.


> **app.json:** Add `"expo-notifications"` to the plugins array for notification support.

---

## 🐛 Bug Fixes Log

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Health Connect times show as 2:00 AM (UTC+2) | `hca.startTime` stored as UTC ISO string | `toLocalISOString()` strips `Z` suffix |
| Manual activity times show midnight | `toISODate()` returns date-only string parsed as UTC midnight | Same `toLocalISOString()` fix in `add.tsx` |
| EcoScore can reach 107 | `Math.min(100, …)` missing from `calculateEcoScore()` | Added cap |
| Level-up modal fires on every cold boot | Zustand init sets `tokens = 0`; first snapshot looks like increase | `_profileLoaded` flag gates level-up check |
| Dashboard CO₂ week-on-week % misleading | Utility bills logged monthly; empty week shows −100% | `getWeekCarbonComparison()` filters transport only; falls back to all-CO₂ with "all CO₂" label when no transport data |
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
| Pedometer day suppressed after session import | `sessionCoveredDates` suppressed entire day when HC walking session existed | Delta calc: `pedometerTotal − importedSessionSteps`; import if >200-step threshold |
| Utility baseline wrong for non-EU users | `calculateSaving()` hardcoded 290 kWh/month regardless of region | `getRegionalBaseline(category, region)` passed as optional 4th param |
| Challenges show Joined after weekly rollover | No current-week `challengeProgress` doc; local state retained previous week's `joinedIds` | Clear state when doc absent; fire missed-challenge notification |
| Cloud Function log counts differ from actual batch | `randomPick()` called again inside `console.log` — independent reshuffle | Store `pickedEasy/pickedMedium/pickedHard` as named vars; reference directly |
| Community screen shows 11 challenges instead of Firestore count | `useState<Challenge[]>(CHALLENGES)` seeded initial state with full 11-item static array before fetch resolved | Changed to `useState([])` + added `loadingChallenges` spinner; fallback only fires inside `fetchChallengesForWeek()` |
| Cloud Function writes wrong `weekId` (previous Sunday) | Cloud Run executes in UTC; `new Date().getDay()` returns Saturday (6) when fired at 00:01 Cyprus time (UTC+3 = Saturday 21:01 UTC) | `getSundayDateString()` now extracts Cyprus local date via `Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Nicosia' })` before computing Sunday offset |
| No CO₂ challenge in weekly rotation | Old deployed function pre-dated CO₂ pool logic; `co2Pool` was not yet in the Cloud Function | Redeployed with `co2Pool` filter on `challengeGroup === 'co2'`; guaranteed slot drawn independently of difficulty shuffle |
| Dashboard chart tooltip flashing / invisible on tap | `onResponderRelease` cleared `selIdx` immediately on finger lift; Victory Native `useChartPressState` requires drag to activate (static taps silently cancelled) | Replaced `useChartPressState` + `SkiaCircle` with `View` responder overlay; `selIdx` state persists until next tap (no `onResponderRelease` clear) |
| Dashboard EcoScore modal "This week" pill shows stale score | `ecoScoreSnapshots.at(-1)?.score` returns the most recent snapshot, which may be from a prior session with lower data | Replaced with "vs Last Week" trend pill (`+N`/`-N` delta vs previous snapshot) using IIFE pattern |
| EcoScore snapshot chart labels showing `May 10` instead of `W20` | `getWeekLabel()` in `_layout.tsx` returned `"May 3"` string | Changed to return `W{n}` ISO week number. Sunday-start adjusted: on Sundays, date advanced +1 day before ISO week computation so Sunday opens the new week number. |
| EcoScore snapshot chart ordering wrong (W19–W21 before W9–W18) | `orderBy('weekKey', 'desc')` sorts lexicographically; mixed `YYYY-MM-DD` and `YYYY-Wnn` doc keys interleave incorrectly | `loadEcoScoreSnapshots()` now orders by `updatedAt desc` — always chronological regardless of key format |
| Calendar day numbers missing on current-month reopening | `overflow: 'hidden'` + `borderWidth` on `dayCircle` (View with `borderRadius: 999`) causes Android to clip child text into the border region when no explicit `backgroundColor` is set | Replaced single `dayCircle` View with two absolute-positioned layers: `dayRing` (border only) and `dayFill` (background only); `ThemedText` is a direct child of `dayCell` — never inside an `overflow:hidden` container |
| HC banner shows today's steps even when a past date is selected | `fetchTodaySteps()` always queries today regardless of the date picker value | `fetchStepsForDate(selectedDate)` added; banner re-fetches on `selectedDate` change; walking sessions filtered to selected date for past days |
| Confetti artifact visible at bottom of screen | `ConfettiCannon` always mounted outside conditional — renders visible origin element when idle | Gated cannon on `showCelebration` — only mounted during celebration |
| Weekly goal celebration re-fires after sign-out + sign-in | `celebrated: true` persisted from previous session; progress check fires before activities load | `setCelebrated(false)` called in `onAuthStateChanged` on every new sign-in |
| Profile photo missing after email re-login | `photoURL` race: snapshot could arrive before server value | Resolution order: Firestore → `currentUser.photoURL` → existing Zustand value → null |
| Leaderboard shows deleted users | Leaderboard doc not deleted with user account | `handleDeleteAccount` now deletes both `users/{uid}` and `leaderboard/{uid}` in `Promise.all` |
| Leaderboard stale after activity deletion | `persistWeeklyEcoScore()` not called after `deleteDoc` in `activity.tsx` `handleDelete` or `details.tsx` `confirmDelete` | `persistWeeklyEcoScore()` added to both delete handlers, filtering out the deleted activity before computing the new score |
| Action-sheet activity delete not decrementing tokens/carbon | `handleDelete` in `activity.tsx` called `deleteDoc` but never called `increment(-tokens)` or `increment(-carbon)` on the user doc, nor `persistWeeklyEcoScore()` | Added `updateDoc` with `increment(-tokens)` and `increment(-carbon)` on the user doc, plus `persistWeeklyEcoScore()` call with remaining activities |
| Leaderboard fallback avatar shows Chinese/Japanese character instead of sprout | `FontAwesome6 name="sprout"` is a Pro-only icon; free tier renders a random glyph from the font table that resembles a CJK character | Replaced all three `"sprout"` usages in `community.tsx` with `"seedling"` (FA6 free) |
| `generateAlias` produces `undefined` noun for some UIDs | `h >> 4` (signed right shift) returns negative values for large hashes; `NOUNS[-7]` = `undefined` | Changed to `h >>> 4` (unsigned right shift), matching the `h >>> 0` pattern used for the hash itself |
| `showOnLeaderboard` field absent from leaderboard doc for new users | `persistWeeklyEcoScore()` only writes `weeklyEcoScore` to the leaderboard doc; the toggle in Settings is never touched by new users, so `showOnLeaderboard` is never written | `settings.tsx` onSnapshot handler now writes `showOnLeaderboard: optedIn` to the leaderboard doc with `merge:true` on every settings load, backfilling the field for all existing users |
| Onboarding screen 3 rank emoji chips render inconsistently across devices | Emoji rendering varies by Android font version; chips used raw emoji characters | Replaced `RANKS` array emoji with FontAwesome6 icon names (`seedling`, `leaf`, `tree`, `shield`, `star`); rendered as `FontAwesome6` components inside coloured chip views |
| Onboarding screen 5 privacy note overlaps camera permission card when permissions unganted | `list` had `flex:1` inside a fixed `View`; granted cards shrink but the note stays at bottom causing overlap | Converted outer `View` to `ScrollView` with `flexGrow:1`; removed `flex:1` from `list` style |
| Onboarding screen 7 emoji in headline renders inconsistently | Raw 🌱 emoji in `Text` renders at different sizes/baselines on different Android versions | Replaced with inline `FontAwesome6 name="seedling"` alongside the headline text in a `flexDirection:'row'` wrapper |
| Privacy Policy and Terms of Service screens have no back button | Both screens rendered `WebView` directly inside `SafeAreaView` with no header | Added a header `View` with a `Pressable` back button (`router.back()`) and `Ionicons arrow-back` above the `WebView` in both screens |
| Edit profile avatar initial letter clipped top and bottom | `overflow:'hidden'` on the avatar `View` clips the large initial `Text` into the border region | Applied `overflow:'hidden'` conditionally — only when `photoURL` is set (photo needs clipping); initial letter container uses `overflow:'visible'` |
| HC sync success screen "Sync Complete!" text clips descenders (y, p) | `successTitle` style had no explicit `lineHeight`; large `fontSize:30` with default tight line height clips descenders at view boundary | Added `lineHeight:40` to `successTitle` style |
| Leveling screen hero card and tier cards too faint in light mode | Gradient used `rank.color+'30'`/`'18'`; current tier background used `rank.color+'06'` | Increased to `rank.color+'55'`/`'35'` for gradient, `rank.color+'15'` for current tier background, `rank.color+'BB'` for hero card border |
| Achievements screen hero banner too faint in light mode | Gradient used `rank.color+'25'`/`'08'`; pct bubble used `rank.color+'12'` | Increased to `rank.color+'70'`/`'35'` for gradient; `rank.color+'35'` for pct bubble; `rank.color+'30'` for glow; `rank.color+'80'` for border; milestone badges from `'10'`/`'22'` to `'22'`/`'30'` |
| Gemini API key committed to git via `eas.json` env block | Key added directly to `eas.json` under `build.preview.env` and pushed to GitHub; GitGuardian detected the exposure | Old key revoked in Google AI Studio; new key created; stored as EAS environment variable via `eas env:create --scope project` (plain text visibility); `eas.json` env block removed |
| Podium shows all users even when all have 0 EcoScore | No zero-score guard | Podium hidden when no user has score > 0; "Week just started!" banner shown instead |
| Equal EcoScores assigned different ranks | Sequential `i + 1` rank regardless of score ties | Two-pass: same score → same rank; next score → skips (competition ranking) |
| Leaderboard doesn't update after EcoScore changes without reload | No focus-based refresh | `useFocusEffect` in community.tsx refreshes leaderboard on every tab visit |
| Celebration fires mid-navigation transition | `setCelebrated(false)` called before `router.back()` | Navigate first; delay `setCelebrated(false)` 420ms |
| `successTitle` "Sync" clips the y in HC sync success screen | `letterSpacing: -0.5` clips descenders at view bounds | Changed to `letterSpacing: 0` |
| Bill saving compared previous reading vs current (gameable) | `calculateSaving()` used `previousReading` as comparison when available | Comparison always uses `getRegionalBaseline()` regardless of history; previous reading shown as display-only context in UI |
| Challenge completion silent (no feedback) | No modal or haptic on completion; tokens credited but no user acknowledgement | `ChallengeCompleteModal` fires with haptic on goal.target crossed; `firedCompletions` ref prevents re-showing |
| Community 'Live' badge shows when offline | No network state tracked | `NetInfo.addEventListener` drives badge: green 'Live' / red 'Offline' |
| Google Sign-In `DEVELOPER_ERROR` on release APK | Release APK and dev build have different signing keys; only one SHA-1 registered in Firebase | Added both debug SHA-1 (`./gradlew signingReport`) and release SHA-1 (`eas credentials → Keystore`) to Firebase Console → Project Settings → Android App (`com.amirah.ecoverse`). Downloaded and replaced `google-services.json` |
| Double bottom padding above tab bar on all tab screens | `SafeAreaView` without `edges` prop adds bottom inset on top of the tab bar's own inset handling in `(tabs)/_layout.tsx` | Added `edges={['top']}` to `SafeAreaView` on `index.tsx`, `activity.tsx`, `stats.tsx`, `profile.tsx`. `community.tsx` already correct |
| `EcoScoreModal`, `AIModal`, `StreakCalendarSheet` render behind tab bar; phone nav becomes transparent | Modals rendered inside `SafeAreaView` which clips their z-order below the tab bar | Wrapped each screen in outer `View`; moved affected modals outside `SafeAreaView`; `SafeAreaView edges={['top']}` kept around scroll content only. `LevelUpModal` and `StreakMilestoneModal` unaffected — use React Native `Modal` which renders above everything |
| Onboarding step 6 footnote appears inside last region row when button navigation active | `listWrap` had `flex:1` inside fixed-height `View`; button nav adds extra height pushing footnote into overlap | Outer `View` replaced with `ScrollView`; `flex:1` removed from `listWrap` |
| Onboarding step 7 content cramps together on smaller screens | `justifyContent:'space-between'` with fixed `paddingTop:50` squeezes items on short screens | Outer `View` replaced with `ScrollView` using `gap:28` in `contentContainerStyle` |
| Activity screen empty state sits too low | `emptyState` style had `paddingTop:60` pushing centred content down | Replaced `paddingTop:60` with `marginTop:-40` |
| Dead `streakMilestone` state in `(tabs)/_layout.tsx` | `const [streakMilestone, setStreakMilestone]` declared but never read or updated | Removed unused state declaration |
| Streak milestone modal shows wrong day / 7-day never fires on HC import | `triggerStreakMilestone()` only called in `add.tsx` manual log path; HC bulk import bypassed it. `STREAK_MILESTONES` in `add.tsx` also missing 60 and 100 | Added streak check in `health-connect-sync.tsx` after `commitSync()`; extended threshold array to `[3, 7, 14, 30, 60, 100]` |
| Achievement screen freeze on first visit | `unlockedAchievementIds` empty on first visit → every earned milestone looked new → `triggerAchievement()` set `achievementPending: true` → modal overlay rendered with null content, blocking all touch | First-visit seeding: silently marks all currently-unlocked milestones without firing modal; modal only fires for achievements earned after seeding |
| Missed challenge notification fires on every community screen refresh | `sendMissedChallengeNotification()` inside `fetchChallengeState()` with no session guard; called on mount, `currentUid` change, and every pull-to-refresh | Added `missedNotifFiredRef = useRef(false)` guard; notification fires at most once per app session |
| HC sync screen shows "all caught up" after add-screen import | Pedometer HC activities counted in both `sessionStepsByDate` and `alreadyImportedSteps` — double-count made deltaSteps negative | `sessionStepsByDate` now excludes activities where `hcId` starts with `steps-` (pedometer imports); only session-based imports counted |
| HC sync screen re-offers already-imported steps after add-screen import | Add-screen HC saves wrote `hcId` to Firestore activity but not to `meta/healthSync.importedIds`; sync screen built `importedSet` from `importedIds` only | `importedSet` extended with `hcId` values from `currentActivities`; `registerAddScreenImport()` added to write `hcId` to `meta/healthSync` after add-screen save |
| HC sync delta re-offered on every sync after sync-screen import | Delta `syntheticActivity.id` was timestamped (e.g. `steps-2026-05-27-delta-1748...`); written as `hcId` on Firestore activity; future `alreadyImportedSteps` filter on `hcId === day.id` never matched | `syntheticActivity` carries `originalDayId` for delta entries; `commitSync` writes `hcId: originalDayId ?? hca.id` |
| Add-screen HC banner allows re-import of same steps | No check against already-logged activities with matching `hcId` before filling form | `handleHCAutoFill` queries `activities` for matching `hcId`; blocks if delta ≤ 200 steps; fills with delta only if delta > 200 |
| Keyboard obscures input fields on add activity screen | No `KeyboardAvoidingView` or scroll-to-focused-field logic | Wrapped in `KeyboardAvoidingView`; `onFocus` scrolls `ScrollView` to end after 300 ms delay |
| Streak milestone modal fires twice on same day | `alreadyLoggedToday` compared full ISO timestamps; different times on same day never matched | Date comparison changed to `slice(0, 10)` prefix (YYYY-MM-DD only) |
| Streak milestone modal re-fires after streak rebuilt to same threshold | No persistent record of shown milestones | `shownStreakMilestones: number[]` added to store, persisted to AsyncStorage; `markStreakMilestoneSeen()` called before `triggerStreakMilestone()` in both `add.tsx` and `health-connect-sync.tsx` |
| Streak milestone badges revert to grey after streak breaks | `unlockedMilestoneIds` computed from `m.check(stats)` (live streak) only | Extended to `m.check(stats) \|\| unlockedAchievementIds.includes(m.id)` |
| Last bill reading shown after deleting all electricity/water activities | `activity.tsx` `handleDelete` did not clean up linked bill record | `deleteBillForActivity(item.billId)` called in `activity.tsx` `handleDelete` when `billId` present |
| Firebase rejects `+` symbol in password on sign-up | Firebase password policy had "Require special character" with internal allowlist that excludes `+` | Unchecked "Require special character" in Firebase Console; policy now requires uppercase + lowercase + number only |
| Gemini API 400 / 404 errors | Model name `gemini-2.5-flash-preview-05-20` invalid; `maxOutputTokens: 8192` exceeded free tier; `responseMimeType: "application/json"` unsupported on preview models | Model → `gemini-2.5-flash`; `maxOutputTokens` stays at `8192`; only `responseMimeType` removed; error body logging added |
| `streak-calendar-sheet.tsx` summary row invisible in dark mode | `colors.surfaceMuted + '80'` is string concatenation producing invalid hex | Replaced with explicit `rgba(255,255,255,0.08)` dark / `rgba(27,67,50,0.07)` light |
| Health Connect setup ✅ emoji in alert title | `Alert.alert('✅ Connected!')` — emoji renders inconsistently across Android OEMs | Removed emoji: `Alert.alert('Connected!')` |
| Challenge privacy note misleading | "Only completions are visible to others" — completions are not visible either | Corrected to "Challenge progress and completions are private — only you can see them" |

---

## 🚀 Future Vision Screen

`future-vision.tsx` — four planned directions, all labelled "Planned — not yet live":

| Direction | Phase | Summary |
|-----------|-------|---------|
| EcoToken Marketplace | 3 | Redeem tokens for partner discounts, municipal bill credits, public transport perks |
| Friend Accountability | 3 | Opt-in friend circles with EcoScore sharing, shared weekly challenges, gentle nudges |
| More Regions & Countries | 3 | 50+ countries with localised grid emission factors, country-specific benchmarks, regional leaderboards |
| Offline Mode | 3 | Local-first activity logging, queue-and-sync on reconnect, offline leaderboard cache |
| Accessibility & Personalisation | 3 | Reduce Motion toggle, custom app tint, high contrast mode, larger text scaling |
| Municipal & Civic Integration | 4 | Smart meter auto-sync, city-wide EcoScore dashboards, Green Deal community challenges |
| Predictive AI Coach | 4 | Behaviour-pattern ML model, proactive nudges, smart goal calibration, carbon forecasting |

---


## 🔊 Sound Effects (SFX)

**Status: Implemented.** Uses `expo-audio` (migrated from deprecated `expo-av` — removed in SDK 54).

See Haptic Feedback + Sound Effects section under Gamification System above for full details. Ambient stats sound deferred.

## 📋 Pre-Shipping Checklist

- [x] Terms of Service and Privacy Policy (required for Play Store)
- [x] Firebase Auth email templates configured (verification + password reset, EcoVerse branding)
- [x] Gemini API key moved out of codebase — stored as EAS environment variable (`eas env:create`); old exposed key revoked
- [x] Replace `FEEDBACK_FORM_URL` in `settings.tsx` with actual Google Form / Typeform link
- [ ] Test on 360dp-wide emulator (Pixel 3a size) — tested on Samsung Galaxy A55 5G; Pixel 3a emulator not run due to memory constraints (documented as limitation in thesis)
- [ ] Remove remaining debug `console.warn` statements in `aiSuggestions.ts`
- [ ] Play Store listing — icon, screenshots, description, Privacy Policy URL
- [ ] © 2026 Amirah Yahaya. All rights reserved. to About section in Settings

---


---

## ✅ Previously Known Issues — Now Fixed

| Issue | Fix |
|-------|-----|
| Modal bottom edge behind phone navigation bar | Added `useSafeAreaInsets().bottom` inside `EcoScoreModal`, `AIModal`, `StreakCalendarSheet`; `paddingBottom: Math.max(36, insets.bottom + 20)` applied inline on each sheet container |
| Leaderboard rank ties (3+ way) and sticky "You" row inconsistent | Replaced `.map()` with `for`-loop reading already-computed rank from output array; sticky bar rank computed from `usersAbove + 1` instead of hardcoded `999` |

## 👩🏽‍💻 Author

**Amirah Yahaya**
Final Year Computer Science Student
© 2026 All rights reserved.
