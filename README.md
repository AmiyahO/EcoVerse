# 🌱 EcoVerse

EcoVerse is a mobile application that helps users track eco-friendly activities, calculate their CO₂ savings, and stay motivated through gamified rewards. Users log physical activities (walking, running, cycling) and household utility savings (electricity, water), earn EcoTokens, and track their environmental impact over time.

Developed as a **Final Year Project (FYP)** using **React Native** and **Expo**.

---

## 🎯 Project Objectives

- Allow users to log eco-friendly activities manually with CO₂ and token calculations
- Provide real-time progress tracking across a dashboard, stats, and profile
- Motivate sustained behaviour change through streaks, weekly goals, and a celebration system
- Sync all data to the cloud with Firebase for cross-session persistence
- Apply modern mobile development practices using Expo, Expo Router, and TypeScript

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo (Managed Workflow) |
| Navigation | Expo Router (file-based, typed routes) |
| Language | TypeScript |
| State | Zustand + AsyncStorage |
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
│   ├── index.tsx        # Dashboard — EcoScore, weekly tokens, CO₂ summary
│   ├── activity.tsx     # Activity log with category filters
│   ├── stats.tsx        # Stats — swipeable card rows with charts
│   └── profile.tsx      # Profile — streak, weekly goal, celebration modal
│
├── activity/
│   ├── add.tsx          # Add activity — category grid + conditional inputs
│   ├── details.tsx      # Activity details — view, edit, delete
│   └── edit.tsx         # Edit activity — recalculates impact diff
│
├── onboarding/
│   ├── _onboardingWrapper.tsx  # PagerView wrapper with animated dots
│   ├── 1.tsx            # Welcome step
│   ├── 2.tsx            # Region selection step
│   └── 3.tsx            # Completion step
│
├── login.tsx            # Auth screen — email + Google Sign-In
├── settings.tsx         # Settings — theme, region, account management
├── edit-profile.tsx     # Edit name, weekly target, avatar
└── _layout.tsx          # Root layout — auth state, Firestore listeners

src/
├── store/
│   ├── activityStore.ts # Zustand store — activities, streak, celebration, region
│   └── themeStore.ts    # Zustand store — persisted theme mode
│
└── utils/
    └── ecoLogic.ts      # CO₂ calculations, token formulas, streak logic, weekly data

constants/
└── theme.ts             # Light/dark colour tokens

hooks/
└── useAppTheme.ts       # Resolves system/light/dark scheme
```

---

## 🧮 Calculations

### Token Rewards

| Activity | Rate |
|----------|------|
| Walking | 1 token per 100 steps |
| Running | 25 tokens per km |
| Cycling | 10 tokens per km |
| Electricity | 5 tokens per kWh saved |
| Water | 1 token per 10 L saved |

**Streak multiplier:** +10% per 5-day streak, capped at +50%. Applied at save time only.

**Weekly target:** 500 tokens (adjustable per user in Edit Profile).

### CO₂ Savings

| Activity | Factor |
|----------|--------|
| Walking | 0.192 kg CO₂ per km |
| Running | 0.192 kg CO₂ per km |
| Cycling | 0.25 kg CO₂ per km |
| Electricity | Regional grid intensity × kWh |
| Water | 0.003 kg CO₂ per litre |

**Regional electricity intensity (kg CO₂ per kWh):**
US 0.385 · UK 0.193 · EU 0.230 · India 0.710 · China 0.550 · Global 0.475

### EcoScore

```
EcoScore = min(weeklyTokens/500 × 70, 70)   // base (max 70)
         + (activeDaysThisWeek/7 × 20)        // consistency bonus (max 20)
         + (uniqueCategories/3 × 10)          // variety bonus (max 10)
```

---

## 🧭 Navigation Flow

```
Login ──▶ Onboarding (new users) ──▶ Tabs
           (region selection)
                                   ├── Dashboard
                                   ├── Activity Log ──▶ Add / Details / Edit
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
    ├── tokens, totalCarbonSaved
    ├── hasFinishedOnboarding
    └── activities/{activityId}
          ├── category, date
          └── steps / distance / duration / kwhSaved / litersSaved
  ```
- **Real-time listeners** in `RootLayout` keep the Zustand store in sync with Firestore. Activities are never stored in AsyncStorage — they always come from Firestore.

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

> **Note:** Victory Native v41 uses Skia and requires a dev build. It does not work in Expo Go.

---

## 🔮 Planned Features

- Activity distribution donut chart (VictoryPie)
- Daily token sparkline — 30-day line chart (VictoryLine)
- Streak milestone pop-ups (3-day, 7-day)
- Eco Explorer leveling system (Seed → Sapling → Oak)
- CO₂ equivalents (e.g. "Same as charging 1,000 smartphones")
- Monthly streak calendar heatmap
- Achievement badges screen
- Date picker on Edit Activity
- Long-press activity → quick delete/duplicate
- AI bill scanning (OCR) for electricity input

---

## 📋 Pre-Shipping Checklist

- [ ] Terms of Service and Privacy Policy (required for Play Store)
- [ ] Add © 2026 Amirah. All rights reserved. to About section
- [ ] Configure Firebase Auth email templates
- [ ] Test on physical Android device
- [ ] Remove all debug console.log statements
- [ ] Play Store listing — icon, screenshots, description

---

## 👩🏽‍💻 Author

**Amirah Yahaya**  
Final Year Computer Science Student  
© 2026 All rights reserved.
