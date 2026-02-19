// onboarding/index.tsx
import { useState } from 'react'; // Added useState
import { ActivityIndicator, View, StyleSheet } from 'react-native'; // Added UI components
import OnboardingWrapper from './_onboardingWrapper';
import Step1 from './1';
import Step2 from './2';
import Step3 from './3';
import { useRouter } from 'expo-router';
import { auth, db } from '@/src/firebase/config'; // Import your firebase tools
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Onboarding() {
  const router = useRouter();
  const [region, setRegion] = useState('GLOBAL_AVG');
  const [isFinishing, setIsFinishing] = useState(false); // New loading state

  const handleFinish = async () => {
    const user = auth.currentUser;

    if (user) {
      setIsFinishing(true); // Start loading
      
      try {
        // Save to Firestore that this specific user is done with onboarding
        await setDoc(doc(db, "users", user.uid), {
          hasFinishedOnboarding: true,
          region: region.toUpperCase() || 'GLOBAL_AVG', // Save the region!
          email: user.email,
          lastLogin: serverTimestamp(), // new Date().toISOString()
        }, { merge: true });

        // Just navigate directly, don't rely solely on RootLayout
      router.replace('/(tabs)');
      } catch (error) {
        console.error("Failed to save onboarding status:", error);
        setIsFinishing(false);
      }
    } else {
      // If for some reason there's no user, send them to login
      router.replace('/login');
    }
  };

  // If saving OR while waiting for RootLayout to transition, show a full-screen loader so they don't interact with steps
  if (isFinishing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Pass the state down to Step 2
  const steps = [
    <Step1 key="1" />,
    <Step2 key="2" region={region} setRegion={setRegion} />, 
    <Step3 key="3" />
  ];

  return <OnboardingWrapper steps={steps} onFinish={handleFinish} />;
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff', // Match your onboarding background
  },
});
