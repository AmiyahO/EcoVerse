// onboarding/index.tsx
import OnboardingWrapper from './_onboardingWrapper';
import Step1 from './1';
import Step2 from './2';
import Step3 from './3';
import { useRouter } from 'expo-router';
import { auth, db } from '@/src/firebase/config'; // Import your firebase tools
import { doc, setDoc } from 'firebase/firestore';

export default function Onboarding() {
  const router = useRouter();

  const handleFinish = async () => {
    const user = auth.currentUser;

    if (user) {
      try {
        // Save to Firestore that this specific user is done with onboarding
        await setDoc(doc(db, "users", user.uid), {
          hasFinishedOnboarding: true,
          email: user.email,
          lastLogin: new Date().toISOString()
        }, { merge: true });

        // Now that the DB is updated, navigate to the main app
        // The RootLayout will pick up this change and show (tabs)
        router.replace('/(tabs)'); 
      } catch (error) {
        console.error("Failed to save onboarding status:", error);
        // Optional: Alert the user or let them proceed anyway
        router.replace('/(tabs)');
      }
    } else {
      // If for some reason there's no user, send them to login
      router.replace('/login');
    }
  };

  return <OnboardingWrapper steps={[<Step1 />, <Step2 />, <Step3 />]} onFinish={handleFinish} />;
}
