import { View, Text, Pressable, StyleSheet, Platform, TextInput, Alert, ScrollView, KeyboardAvoidingView, ActivityIndicator, Image } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { auth, db } from '@/src/firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithCredential } from 'firebase/auth';
import { useAppTheme } from '@/hooks/useAppTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { makeRedirectUri } from 'expo-auth-session';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession(); // required for Expo Auth Session

export default function LoginScreen() {
  const { scheme, colors } = useAppTheme();
  const router = useRouter();

  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 1. Force the Proxy Redirect URI
  const proxyRedirectUri = 'https://auth.expo.io/@amirahy/ecoverse';
//   const redirectUri = makeRedirectUri({
//   native: 'https://auth.expo.io/@amirahy/ecoverse', // Match your Google Console exactly
// });

  const [request, response, promptAsync] = 
    Google.useIdTokenAuthRequest({
      clientId: '29515161391-2ammbbfc04029chfhaefsvkbohihs54i.apps.googleusercontent.com',
      // pass string directly
      redirectUri: proxyRedirectUri,
      // This helps with certain Android issues
      // responseType: 'id_token',
  });

  console.log("Redirect URI is:", proxyRedirectUri);

  // handle google login response
  useEffect(() => {
    if (response?.type === 'success') {
      const handleGoogleSignIn = async () => {
        setLoading(true);

        try {
          const { id_token } = response.params;
          const credential = GoogleAuthProvider.credential(id_token);
          const userCredential = await signInWithCredential(auth, credential);
          const user = userCredential.user;

          if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            // Extract the high-res photo URL if available
            // Google usually provides a thumbnail, but we want the best quality
            const googlePhotoURL = user.photoURL || null;
            
            if (!userDoc.exists()) {
              // NEW USER: Create full profile
              await setDoc(userDocRef, {
                email: user.email,
                displayName: user.displayName,
                photoURL: googlePhotoURL,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(), // Log initial login
                tokens: 0,
                totalCarbonSaved: 0,
                hasFinishedOnboarding: false,
              });
            } else {
              // Update lastLogin for returning Google users and refresh photoURL
              await setDoc(userDocRef, {
                lastLogin: serverTimestamp(),
                photoURL: googlePhotoURL, // <--- Keep their profile pic fresh
              }, { merge: true });

              // Direct to home if they already finished onboarding
              const userData = userDoc.data();
              if (userData.hasFinishedOnboarding) {
                router.replace('/(tabs)');
              } else {
                router.replace('/onboarding');
              }
            }
          }
        } catch (err) {
          console.error('Google sign-in error:', err);
          Alert.alert('Sign-In Error', 'Could not link Google account.');
        } finally {
          setLoading(false);
        }
      };

      handleGoogleSignIn();
    }
  }, [response]);

  // Email/Password Logic
  const handleEmailAuth = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields');
    
    setLoading(true);
    try {
      if (isSignUp) {
        // 1. Create the Auth Account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Create the Firestore Document
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(), // Initial login
          tokens: 0,
          totalCarbonSaved: 0,
          displayName: email.split('@')[0],
          hasFinishedOnboarding: false,
          photoURL: null,
        });

        console.log('User profile created in Firestore!');
        setEmail('');
        setPassword('');
        router.replace('/onboarding');
      } else {
        // 3. Login existing user
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Update lastLogin for returning users
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          lastLogin: serverTimestamp(),
        }, { merge: true });
      }
    } catch (error: any) {
      Alert.alert('Auth Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={scheme === 'dark' ? ['#34C9C9', '#2E7D32'] : ['#2E7D32', '#34C9C9']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>  
        {/* LOGO and MOTTO */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Image 
            source={require('@/assets/images/icon.png')} 
            style={styles.loginLogo}
            resizeMode="contain"
          />
          <Text style={styles.loginMotto}>
            TRACK YOUR IMPACT
          </Text>
        </View>
        
        {/* Login Card */}
        <View style={[styles.card, { backgroundColor: colors.surfaceMuted }]}>
          <Text style={[styles.subtitle, { color: colors.text }]}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>

          {/* Email */}
          <TextInput
            editable={!loading}
            style={[styles.input, { opacity: loading ? 0.5 : 1, color: colors.text, borderColor: colors.tint + '44' }]}
            placeholder="Email"
            placeholderTextColor="gray"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />

          {/* Password */}
          <View style={[styles.passwordContainer, {borderColor: colors.tint + '44' }]}>
            <TextInput
              editable={!loading}
              style={[
                styles.input, 
                { 
                  flex: 1,
                  marginBottom: 0,
                  opacity: loading ? 0.5 : 1, 
                  color: colors.text, 
                  borderWidth: 0,
                }
              ]}
              placeholder="Password"
              placeholderTextColor="gray"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color={colors.text + '88'} 
              />
            </Pressable>
          </View>

          <Pressable style={[styles.mainButton, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]} 
                      onPress={handleEmailAuth}
                      disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { color: '#fff' }]}>{isSignUp ? 'Sign Up' : 'Login'}</Text>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={{ color: 'gray', marginHorizontal: 10 }}>OR</Text>
            <View style={styles.line} />
          </View>

          <Pressable
            style={[styles.googleButton, { backgroundColor: scheme === 'dark' ? colors.tint : '#4285F4' }]}
            disabled={!request || loading}
            onPress={() => promptAsync()}
          >
            <Text style={[styles.buttonText, { color: '#fff' }]}>
                {loading ? 'Signing in...' : 'Sign in with Google'}
              </Text>
          </Pressable>

          <Pressable 
            onPress={() => { 
              setIsSignUp(!isSignUp);
              setEmail('');
              setPassword('');
            }} 
            style={{ marginTop: 20, alignItems: 'center' }}
          >
            <Text style={{ color: colors.text, opacity: 0.7 }}>
              {isSignUp 
                ? "Already have an account? Login" : "Don't have an account? Sign Up"}
            </Text>
          </Pressable>

          {/* DEV BYPASS */}
          <Pressable 
            onPress={() => router.replace('/(tabs)')}
            style={{ marginTop: 20, alignSelf: 'center' }}
          >
            <Text style={{ color: 'gray', fontSize: 12 }}>Dev: Skip Login</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loginLogo: { width: 120, height: 120, marginBottom: 5 },
  loginMotto: { opacity: 0.6, letterSpacing: 2, fontSize: 12, fontWeight: '800', textAlign: 'center', color: '#8BE94F' },
  inner: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { padding: 25, borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  subtitle: { fontSize: 20, fontWeight: '600', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 16 },
  mainButton: { padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  googleButton: { padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 0, marginTop: 10 },
  buttonText: { fontWeight: 'bold', fontSize: 18 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: '#eee' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, marginBottom: 15 },
  eyeIcon: { padding: 10, justifyContent: 'center', alignItems: 'center' },
});