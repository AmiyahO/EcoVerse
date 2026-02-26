// EcoVerse Privacy Policy content
// Replace the current Alert.alert('Privacy', ...) in settings.tsx with a proper modal
// using this content, following the same pattern as termsOfService.ts

export const PRIVACY_POLICY = `
EcoVerse — Privacy Policy
Last updated: February 2026

Your privacy matters. This policy explains what data EcoVerse collects, how it is used, and your rights.

1. WHO WE ARE
EcoVerse is developed by Amirah Yahaya as a Final Year Project at the University of Nicosia. For privacy enquiries: ecoverse.dev.team@gmail.com

2. DATA WE COLLECT

Account Data
- Email address and display name (provided when you register)
- Google profile name and photo URL (if you sign in with Google)
- A unique user ID (assigned by Firebase Authentication)

Activity Data
- Eco-activities you log manually: category, date, steps, distance, duration, kWh saved, litres saved
- Activities imported from Health Connect: type, distance, steps, duration, start time, source app
- Bill readings scanned or entered for electricity and water

Device & App Data
- Your selected region (for CO₂ calculations)
- Your weekly token target and display name preferences
- App theme preference (stored locally on your device)
- Timestamps of account creation and last login

3. DATA WE DO NOT COLLECT
- Your precise GPS location — region is selected by you, never detected
- Biometric data beyond what you explicitly share via Health Connect
- Payment information — EcoVerse is free
- Advertising identifiers

4. HOW WE USE YOUR DATA
- To calculate and display your CO₂ savings and eco tokens
- To sync your activities across devices via Firebase
- To generate personalised AI eco-tips (your activity hash is sent to Google Gemini; no personally identifiable information is included)
- To show you your progress history and streaks

5. DATA STORAGE AND SECURITY
Your data is stored in Google Firebase (Firestore and Authentication), which is hosted in secure Google Cloud data centres. Access is controlled by Firebase Security Rules that restrict read and write access to your own account only. Your data is not accessible by other users.

6. HEALTH CONNECT DATA
EcoVerse requests Health Connect permissions to read:
- Steps count
- Distance (walking/running/cycling)
- Exercise session data

This data is read from your device's Health Connect store, processed locally, and saved to your personal Firestore collection. It is not shared with any third party beyond your own Firebase storage. You can revoke Health Connect permissions at any time via Android Settings → Apps → Health Connect.

7. THIRD-PARTY SERVICES
We use:
- Google Firebase (Authentication, Firestore) — govgerns data under Google's Privacy Policy
- Google Gemini API — AI tip generation; no personal data is sent in prompts
- Google Health Connect — fitness data integration on your device

8. DATA RETENTION
Your data is retained for as long as your account exists. You can delete your account and all associated data at any time via Settings → Account Actions → Delete Account. Deletion is immediate and permanent.

9. YOUR RIGHTS
Depending on your jurisdiction, you may have rights to:
- Access a copy of your data
- Correct inaccurate data
- Delete your data (use the in-app Delete Account option)
- Object to processing

To exercise these rights, contact: ecoverse.dev.team@gmail.com

10. CHILDREN
EcoVerse is not directed at children under 13. We do not knowingly collect data from children.

11. CHANGES TO THIS POLICY
We may update this policy. We will notify you of significant changes via the app. Continued use after changes are posted constitutes acceptance.

12. CONTACT
Amirah Yahaya
University of Nicosia, Cyprus
ecoverse.dev.team@gmail.com
`;

// ── Usage in settings.tsx ────────────────────────────────────────────────────
// Replace the existing Privacy Policy Row onPress Alert with a modal,
// following the same pattern shown in termsOfService.ts.
//
// import { PRIVACY_POLICY } from '@/src/content/privacyPolicy';
// const [showPrivacy, setShowPrivacy] = useState(false);
//
// <Row
//   icon="shield-checkmark-outline"
//   iconColor="#26A69A"
//   label="Privacy Policy"
//   onPress={() => setShowPrivacy(true)}
//   separator={true}
// />
// ... add Modal identically to Terms of Service modal above
