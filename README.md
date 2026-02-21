# 🌱 EcoVerse

EcoVerse is a mobile application that helps users track eco-friendly activities, calculate their CO₂ savings, and stay motivated through gamified rewards. Users log physical activities (walking, running, cycling) and household utility savings (electricity, water), earn EcoTokens, and track their environmental impact over time.

Developed as a **Final Year Project (FYP)** using **React Native** and **Expo**.

---

## 🎯 Project Objectives

- Allow users to log eco-friendly activities manually with CO₂ and token calculations
- Provide real-time progress tracking across a dashboard, stats, and profile
- Motivate sustained behaviour change through streaks, weekly goals, and a global celebration system
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
| Primary platform | Android |

---

## 📂 Project Structure

```
app/
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator — global celebration banner, auth listeners
│   ├── index.tsx        # Dashboard — EcoScore hero, CO₂ card, quick stats, recent activity
│   ├── activity.tsx     # Activity log — category filters, weekly grouping, accent cards
│   ├── stats.tsx        # Stats — swipeable chart rows, CO₂ breakdown, weekly trend
│   └── profile.tsx      # Profile — gradient hero, consistency dots, weekly goal progress
│
├── activity/
│   ├── _layout.tsx      # Activity screens navigator
│   ├── add.tsx          # Add activity — category grid + conditional inputs
│   ├── details.tsx      # Activity details — view, edit, delete
│   └── edit.tsx         # Edit activity — recalculates impact diff
│
├── onboarding/
│   ├── _onboardingWrapper.tsx  # PagerView wrapper with animated dots
│   ├── 1.tsx            # Welcome step
│   ├── 2.tsx            # Region selection step
│   ├── 3.tsx            # Completion step
│   └── index.tsx        # Onboarding navigator
│
├── login.tsx            # Auth screen — email + Google Sign-In
├── settings.tsx         # Settings — theme, region, account management
├── edit-profile.tsx     # Edit name, weekly target, avatar
└── _layout.tsx          # Root layout — auth state, Firestore listeners, two-flag loading

src/
├── store/
│   ├── activityStore.ts # Zustand store — activities, userProfile, celebration, hydration
│   └── themeStore.ts    # Zustand store — persisted theme mode
│
└── utils/
    └── ecoLogic.ts      # CO₂ calculations, token formulas, streak logic, CATEGORY_COLORS

constants/
└── theme.ts             # Light/dark colour tokens

hooks/
└── useAppTheme.ts       # Resolves system/light/dark scheme

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

**Streak multiplier:** +10% per 5-day streak, capped at +50%. Applied at save time.

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

Weekly rolling score (resets every Sunday). Designed to reflect current-week effort rather than all-time history, keeping motivation high for new and returning users.

```
baseScore        = min((weeklyTokens / weeklyTarget) × 70, 70)
consistencyBonus = (activeDaysThisWeek / 7) × 20
varietyBonus     = (uniqueCategories / 3) × 10
EcoScore         = round(baseScore + consistencyBonus + varietyBonus)   // max 100
```

---

## 🧭 Navigation Flow

```
Login ──▶ Onboarding (new users only) ──▶ Tabs
           └── region selection               ├── Dashboard
               hasFinishedOnboarding flag     ├── Activity Log ──▶ Add / Details / Edit
                                              ├── Stats
                                              └── Profile ──▶ Edit Profile
                                                         └── Settings
```

> **Why login before onboarding?** Region preference and the `hasFinishedOnboarding` flag are stored on the Firestore user document — an authenticated account must exist before this data can be saved.

---

## 🔥 Firebase Architecture

- **Auth:** Handles email/password and Google Sign-In. Firebase manages verification and password reset emails automatically.
- **Firestore structure:**
  ```
  users/{uid}
    ├── displayName, email, photoURL
    ├── region, weeklyTarget
    ├── hasFinishedOnboarding
    └── activities/{activityId}
          ├── category, date
          └── steps / distance / duration / kwhSaved / litersSaved
  ```
- **Real-time listeners** in root `_layout.tsx` keep the Zustand store in sync with Firestore. Activities are never stored in AsyncStorage — they always come from Firestore on load.
- **Two-flag loading guard** (`userDocReady` + `activitiesReady`) prevents onboarding flash and premature navigation before both Firestore snapshots have fired.

---

## 🎮 Gamification System

### Weekly Goal & Celebration
- Users set a personal weekly EcoToken target (default: 500)
- Progress tracked via a live bar on Dashboard and Profile
- When the goal is reached, a slide-in banner fires from the top of the screen with confetti — visible on any tab via the global `(tabs)/_layout.tsx`
- Celebration state persisted in AsyncStorage and keyed to the current week (`celebratedWeek`), auto-resetting each Sunday
- Re-fires correctly if the user raises their target and earns back to 100%

### Streak System
- Consecutive active days tracked via `calculateStreak()` in `ecoLogic.ts`
- Visual dot calendar on Profile shows this week's active days with checkmark indicators
- Streak multiplier applied to token rewards: +10% per 5-day streak, capped at +50%

### Category Colour System
Consistent colour palette across all screens via `CATEGORY_COLORS` exported from `ecoLogic.ts`:

| Category | Colour |
|----------|--------|
| Walking | `#4CAF50` Green |
| Running | `#FF7043` Orange-red |
| Cycling | `#29B6F6` Sky blue |
| Electricity | `#FFC107` Amber |
| Water | `#26C6DA` Cyan |

---

## 🎨 UI Design

- **Theme:** Full light/dark mode with system-follow option, persisted via `themeStore`
- **Typography & spacing:** 8/12/16pt rhythm, consistent card `borderRadius: 14–20`
- **Dashboard:** Personalised greeting, EcoScore hero with gradient background and weekly progress bar, CO₂ + week-on-week comparison card, quick stats row, most recent activity with category accent
- **Activity screen:** Category colour accent bars, coloured filter chips with icons, weekly grouping (This Week / Earlier), empty state illustration with Log Activity CTA
- **Profile:** 3-stop gradient hero card with decorative circles, consistency dot calendar with checkmarks, gradient progress bar, member since date
- **Settings:** iOS-style uppercase section headers, coloured icon rows, bottom-sheet region picker, "Soon" badges for unimplemented features, Danger Zone with red border

---

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Start dev server
npx expo start

# Run on Android device/emulator (required for Victory Native charts)
npx expo run:android
```

> **Note:** Victory Native v41 uses Skia and requires a native dev build. It does not run in Expo Go.

---

## 🔮 Planned Features

- Eco Explorer leveling system (Seed → Sapling → Oak → Forest Guardian)
- CO₂ equivalents ("equivalent to charging 1,000 smartphones")
- Streak milestone pop-ups (3-day, 7-day, 30-day)
- Activity distribution donut chart (VictoryPie)
- Daily token sparkline — 30-day line chart
- Monthly streak calendar heatmap
- Achievement badges screen
- Date picker on Edit Activity
- Long-press activity → quick delete/duplicate
- AI bill scanning (OCR) for electricity input
- AI-powered personalised sustainability tips

---

## 📋 Pre-Shipping Checklist

- [ ] Terms of Service and Privacy Policy (required for Play Store)
- [ ] Add © 2026 Amirah Yahaya. All rights reserved. to About section
- [ ] Configure Firebase Auth email templates
- [ ] Test on physical Android device
- [ ] Remove all debug `console.log` statements
- [ ] Play Store listing — icon, screenshots, description
- [ ] Sync status implementation (currently placeholder)
- [ ] Notifications implementation (currently placeholder)

---

## 👩🏽‍💻 Author

**Amirah Yahaya**
Final Year Computer Science Student
© 2026 All rights reserved.