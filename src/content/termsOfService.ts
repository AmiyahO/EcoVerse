// EcoVerse Terms of Service content
// Use this in settings.tsx to replace the empty onPress: () => {}
// You can show this in a Modal, a WebView, or a dedicated screen.
// The text below is formatted for display in a React Native ScrollView.

export const TERMS_OF_SERVICE = `
EcoVerse — Terms of Service
Last updated: February 2026

By creating an account or using EcoVerse, you agree to these Terms. Please read them carefully.

1. ABOUT ECOVERSE
EcoVerse is a gamified eco-activity tracking application developed as an academic Final Year Project by Amirah Yahaya at the University of Nicosia. It is provided for personal, non-commercial use.

2. ACCOUNTS
You must provide a valid email address or use Google Sign-In to create an account. You are responsible for keeping your login credentials secure. You may not share your account with others.

3. WHAT YOU CAN DO
- Log eco-friendly activities (walking, cycling, running, electricity savings, water savings)
- Connect Health Connect to auto-import workouts
- Scan utility bills using your device camera
- Track your CO₂ savings and token progress

4. WHAT YOU CANNOT DO
- Reverse-engineer, modify, or attempt to access systems you are not authorised to access
- Submit false or misleading activity data to game the scoring system
- Use the app in any way that violates applicable law

5. ACCURACY OF CALCULATIONS
CO₂ and token calculations are estimates based on published scientific averages and regional emission factors. They are provided for informational and motivational purposes only and should not be relied upon for compliance reporting or environmental certification.

6. INTELLECTUAL PROPERTY
All code, design, and content in EcoVerse is the intellectual property of the developer unless otherwise stated. You may not reproduce or distribute it without permission.

7. HEALTH DATA
EcoVerse requests access to Health Connect data (steps, distance, workout sessions) solely to auto-fill activity logs. This data is processed on-device and stored in your personal Firebase account. EcoVerse does not sell or share your health data with any third party.

8. THIRD-PARTY SERVICES
EcoVerse uses the following third-party services:
- Firebase (Google) — authentication, database, and storage
- Google Health Connect — fitness data integration
- Google Gemini API — AI-generated eco tips
These services are governed by their own terms and privacy policies.

9. AVAILABILITY
EcoVerse is provided "as is." As an academic project, it may be updated, modified, or taken offline at any time without notice. No warranty of availability, accuracy, or fitness for any purpose is given.

10. LIMITATION OF LIABILITY
To the extent permitted by law, the developer shall not be liable for any damages arising from your use of EcoVerse.

11. CHANGES TO THESE TERMS
These terms may be updated from time to time. Continued use of the app after changes are posted constitutes acceptance of the new terms.

12. CONTACT
For questions about these terms, contact: ecoverse.dev.team@gmail.com

Thank you for using EcoVerse and taking steps towards a greener lifestyle!
`;

// ── Usage in settings.tsx ────────────────────────────────────────────────────
// Import TERMS_OF_SERVICE and show in a Modal with a ScrollView:
//
// import { TERMS_OF_SERVICE } from '@/src/content/termsOfService';
//
// const [showTerms, setShowTerms] = useState(false);
//
// <Row
//   icon="document-text-outline"
//   iconColor="#29B6F6"
//   label="Terms of Service"
//   onPress={() => setShowTerms(true)}
//   separator={false}
// />
//
// <Modal visible={showTerms} animationType="slide">
//   <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
//     <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
//       <Pressable onPress={() => setShowTerms(false)}
//         style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface,
//                  alignItems: 'center', justifyContent: 'center' }}>
//         <Ionicons name="close" size={20} color={colors.text} />
//       </Pressable>
//       <ThemedText style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
//         Terms of Service
//       </ThemedText>
//     </View>
//     <ScrollView contentContainerStyle={{ padding: 20 }}>
//       <ThemedText style={{ color: colors.text, lineHeight: 22, fontSize: 14 }}>
//         {TERMS_OF_SERVICE}
//       </ThemedText>
//     </ScrollView>
//   </SafeAreaView>
// </Modal>
