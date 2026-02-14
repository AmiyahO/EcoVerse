// app/splash.tsx
import { View, Image, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function SplashScreen() {
  const router = useRouter();
  const { scheme } = useAppTheme();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/'); // RootLayout handles auth & onboarding
    }, 1500); // 1.5 sec splash
    return () => clearTimeout(timeout);
  }, []);


  const splashImage =
    scheme === 'dark'
      ? require('../assets/images/splash-dark.png')
      : require('../assets/images/splash-light.png');

  return (
    <View style={styles.container}>
      <Image source={splashImage} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
},
image: { 
    width: '100%', 
    height: '100%' 
},
});
