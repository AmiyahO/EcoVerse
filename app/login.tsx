// login.tsx
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput,
  Alert, KeyboardAvoidingView, ActivityIndicator, Image,
  Animated, Dimensions,
} from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { auth, db } from '@/src/firebase/config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { useAppTheme } from '@/hooks/useAppTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

GoogleSignin.configure({
  webClientId: '29515161391-2ammbbfc04029chfhaefsvkbohihs54i.apps.googleusercontent.com',
});

export default function LoginScreen() {
  const { scheme, colors } = useAppTheme();
  const router = useRouter();
  const isDark = scheme === 'dark';

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [isSignUp, setIsSignUp]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);

  // Fade-in on mount
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo   = await GoogleSignin.signIn();
      const idToken    = userInfo.data?.idToken;
      if (!idToken) throw new Error('No ID token returned');

      const credential    = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user          = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc    = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          tokens: 0,
          totalCarbonSaved: 0,
          hasFinishedOnboarding: false,
        });
      } else {
        await setDoc(userDocRef, {
          lastLogin: serverTimestamp(),
          photoURL: user.photoURL || null,
        }, { merge: true });
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Sign-in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        Alert.alert('Sign-In Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (isSignUp && password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          email: cred.user.email,
          displayName: email.split('@')[0],
          photoURL: null,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          tokens: 0,
          totalCarbonSaved: 0,
          hasFinishedOnboarding: false,
        });
        setEmail(''); setPassword('');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', cred.user.uid), { lastLogin: serverTimestamp() }, { merge: true });
      }
    } catch (error: any) {
      const msg =
        error.code === 'auth/user-not-found'  ? 'No account found with this email.' :
        error.code === 'auth/wrong-password'  ? 'Incorrect password.' :
        error.code === 'auth/invalid-email'   ? 'Please enter a valid email address.' :
        error.code === 'auth/email-already-in-use' ? 'An account already exists with this email.' :
        error.message;
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Type your email above, then tap "Forgot password" to reset it.');
      return;
    }
    Alert.alert(
      'Reset password',
      `Send a reset link to ${email.trim()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email.trim());
              Alert.alert('Sent!', 'Check your inbox for a password reset link.');
            } catch {
              Alert.alert('Error', 'Could not send reset email. Check the address and try again.');
            }
          },
        },
      ]
    );
  };

  const gradientColors = isDark
    ? ['#0B1E14', '#0D2A1A', '#0B1E14'] as const
    : ['#0f3320', '#1B4D2E', '#2E7D32'] as const;

  const inputBorderColor = (focused: boolean) =>
    focused ? colors.tint + 'AA' : (isDark ? '#ffffff18' : '#00000018');

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>

      {/* Decorative orbs */}
      <View style={[styles.orb, styles.orbTopRight, { backgroundColor: isDark ? colors.tint + '18' : 'rgba(0,0,0,0.12)' }]} />
      <View style={[styles.orb, styles.orbBottomLeft, { backgroundColor: isDark ? '#34C9C922' : 'rgba(0,0,0,0.08)' }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Logo ── */}
          <View style={styles.logoSection}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>TRACK YOUR IMPACT</Text>
          </View>

          {/* ── Card ── */}
          <View style={[
            styles.card,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)' },
          ]}>

            {/* Mode toggle pill */}
            <View style={[styles.modePill, { backgroundColor: isDark ? '#ffffff10' : '#00000010' }]}>
              <Pressable
                style={[styles.modeBtn, !isSignUp && { backgroundColor: colors.tint }]}
                onPress={() => { setIsSignUp(false); setEmail(''); setPassword(''); }}
              >
                <Text style={[styles.modeBtnText, { color: !isSignUp ? '#fff' : (isDark ? '#ffffff88' : '#00000066') }]}>
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, isSignUp && { backgroundColor: colors.tint }]}
                onPress={() => { setIsSignUp(true); setEmail(''); setPassword(''); }}
              >
                <Text style={[styles.modeBtnText, { color: isSignUp ? '#fff' : (isDark ? '#ffffff88' : '#00000066') }]}>
                  Sign Up
                </Text>
              </Pressable>
            </View>

            {/* Email input */}
            <View style={[styles.inputWrap, { borderColor: inputBorderColor(emailFocused), backgroundColor: isDark ? '#ffffff08' : '#00000006' }]}>
              <Ionicons name="mail-outline" size={18} color={isDark ? '#ffffff55' : '#00000055'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#111' }]}
                placeholder="Email address"
                placeholderTextColor={isDark ? '#ffffff44' : '#00000044'}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Password input */}
            <View style={[styles.inputWrap, { borderColor: inputBorderColor(passFocused), backgroundColor: isDark ? '#ffffff08' : '#00000006' }]}>
              <Ionicons name="lock-closed-outline" size={18} color={isDark ? '#ffffff55' : '#00000055'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#111', flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={isDark ? '#ffffff44' : '#00000044'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={isDark ? '#ffffff55' : '#00000055'}
                />
              </Pressable>
            </View>

            {/* Forgot password — only on sign in */}
            {!isSignUp && (
              <Pressable onPress={handleForgotPassword} style={styles.forgotBtn}>
                <Text style={[styles.forgotText, { color: colors.tint }]}>Forgot password?</Text>
              </Pressable>
            )}

            {/* Primary CTA */}
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
              )}
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? '#ffffff18' : '#00000018' }]} />
              <Text style={{ color: isDark ? '#ffffff44' : '#00000044', fontSize: 12, marginHorizontal: 12 }}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? '#ffffff18' : '#00000018' }]} />
            </View>

            {/* Google */}
            <Pressable
              style={[styles.googleBtn, {
                backgroundColor: isDark ? '#ffffff10' : '#fff',
                borderColor: isDark ? '#ffffff18' : '#00000015',
              }]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {/* Google G icon using text as proxy */}
              <View style={styles.googleIconWrap}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={[styles.googleBtnText, { color: isDark ? '#fff' : '#333' }]}>
                Continue with Google
              </Text>
            </Pressable>

          </View>

          {/* Terms note */}
          <Text style={styles.termsNote}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>

        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Decorative background orbs
  orb: { position: 'absolute', borderRadius: 999 },
  orbTopRight:   { width: 280, height: 280, top: -80,  right: -80 },
  orbBottomLeft: { width: 200, height: 200, bottom: 40, left: -60 },

  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  // Logo
  logoSection: { alignItems: 'center', marginBottom: 28 },
  logo:        { width: 160, height: 160, marginBottom: 4 },
  tagline:     { fontSize: 11, fontWeight: '700', letterSpacing: 3, color: '#8BE94F', opacity: 0.85, marginTop: 2 },

  // Card
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 12,
  },

  // Mode toggle
  modePill:    { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 4 },
  modeBtn:     { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeBtnText: { fontSize: 14, fontWeight: '600' },

  // Inputs
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, fontSize: 15, height: 52 },
  eyeBtn:    { padding: 4 },

  // Forgot
  forgotBtn:  { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 13, fontWeight: '500' },

  // Primary button
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center' },
  dividerLine: { flex: 1, height: 1 },

  // Google
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  googleIconWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#4285F4',
    alignItems: 'center', justifyContent: 'center',
  },
  googleG:       { color: '#fff', fontWeight: '800', fontSize: 13 },
  googleBtnText: { fontSize: 15, fontWeight: '600' },

  // Footer
  termsNote: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    marginTop: 16,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});