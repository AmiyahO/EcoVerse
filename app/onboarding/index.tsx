// onboarding/index.tsx
import { useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '@/src/firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import OnboardingWrapper from './_onboardingWrapper';
import Step1 from './1';
import Step2 from './2';
import Step3 from './3';
import Step4 from './4';
import Step5 from './5';
import Step6 from './6';
import Step7 from './7';

export default function Onboarding() {
  const router  = useRouter();
  const [region, setRegion]         = useState('GLOBAL_AVG');
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinish = async () => {
    const user = auth.currentUser;
    if (!user) { router.replace('/login'); return; }

    setIsFinishing(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        hasFinishedOnboarding: true,
        region,
        email: user.email,
        lastLogin: serverTimestamp(),
      }, { merge: true });

      router.replace('/(tabs)');
    } catch (e) {
      console.error('Failed to save onboarding:', e);
      setIsFinishing(false);
    }
  };

  if (isFinishing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const steps = [
    <Step1 key="1" />,
    <Step2 key="2" />,
    <Step3 key="3" />,
    <Step4 key="4" />,
    <Step5 key="5" />,
    <Step6 key="6" region={region} setRegion={setRegion} />,
    <Step7 key="7" />,
  ];

  return <OnboardingWrapper steps={steps} onFinish={handleFinish} />;
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: '#0B1E14', justifyContent: 'center', alignItems: 'center' },
});