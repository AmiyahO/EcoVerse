// login screen
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { auth } from '@/src/firebase/config';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useAppTheme } from '@/hooks/useAppTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession(); // required for Expo Auth Session

export default function LoginScreen() {
  const { scheme, colors } = useAppTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 1. Generate the correct Proxy Redirect URI
  // const redirectUri = makeRedirectUri({
  //   path: '/', // This forces it away from localhost:8081
  // });

  // 1. Force the Proxy Redirect URI
  // We use the exact string Google expects in the dashboard
  const proxyRedirectUri = 'https://auth.expo.io/@amirahy/ecoverse';

  // const redirectUri = makeRedirectUri({ 
  //   scheme: 'ecoverse',
  //   preferLocalhost: true,
  // });
  console.log("Redirect URI:", proxyRedirectUri);
  // @ts-ignore — expo-auth-session hasn’t typed useProxy
  // const redirectUri = makeRedirectUri({ useProxy: true });
  
  const [request, response, promptAsync] = 
    Google.useIdTokenAuthRequest({
      // clientId: Platform.select({
      //   android: '29515161391-kem0mgknf9eok4hgt70dnj8qf67jvvu3.apps.googleusercontent.com',
      //   // ios: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
      //   web: '29515161391-2ammbbfc04029chfhaefsvkbohihs54i.apps.googleusercontent.com', // Expo Go
      // }),
      // When you build for production, you can use Platform.select again
      // but for now, the Web ID is your best friend.
      clientId: '29515161391-2ammbbfc04029chfhaefsvkbohihs54i.apps.googleusercontent.com',
      
      redirectUri: proxyRedirectUri,
  });

  // handle google login response
  useEffect(() => {
    if (response?.type === 'success') {
      setLoading(true); // optional: show spinner while signing in
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      
      signInWithCredential(auth, credential)
        .then(() => {
          // // Redirect to main tab if login succeeds
          // router.replace('/(tabs)');
        })
        .catch((err: any) => {
          console.error('Google sign-in error:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [response]);

  return (
    <LinearGradient
    colors={scheme === 'dark' ? [colors.tint, colors.background] : [colors.tint, colors.background]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.container}
  >
    <Text style={[styles.title, { color: scheme === 'dark' ? '#000' : '#fff' }]}>Welcome to EcoVerse 🌱</Text>
    <Pressable
      style={[styles.button, { backgroundColor: scheme === 'dark' ? colors.tint : '#4285F4' }]}
      disabled={!request || loading} // || loading added to bypass
      onPress={() => promptAsync()}
    >
      <Text style={styles.buttonText}>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </Text>
    </Pressable>

    {/* ADD A DEV BUTTON TO BYPASS MANUALLY */}
      <Pressable 
        onPress={() => router.replace('/(tabs)')}
        style={{ marginTop: 20 }}
      >
        <Text style={{ color: 'gray' }}>Dev: Skip Login</Text>
      </Pressable>
  </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 16 
  },
  title: { 
    fontSize: 28, 
    marginBottom: 40, 
    fontWeight: '600' 
  },
  button: { 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 8 
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
});
