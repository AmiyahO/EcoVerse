// login.tsx
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput,
  Alert, KeyboardAvoidingView, ActivityIndicator, Image,
  Animated,
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
  sendEmailVerification,
} from 'firebase/auth';
import { useAppTheme } from '@/hooks/useAppTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

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
  const [authError, setAuthError]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused]   = useState(false);
  const [passFocused, setPassFocused]     = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetLoading, setResetLoading]     = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const clearError = () => { if (authError) setAuthError(''); };

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
      const userInfo = await GoogleSignin.signIn();
      const idToken  = userInfo.data?.idToken;
      if (!idToken) throw new Error('No ID token returned');

      const credential     = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user           = userCredential.user;
      const userDocRef     = doc(db, 'users', user.uid);
      const userDoc        = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const newUser = {
          email: user.email, 
          displayName: user.displayName,
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(), 
          lastLogin: serverTimestamp(),
          tokens: 0, 
          totalCarbonSaved: 0, 
          hasFinishedOnboarding: false,
        };
        await setDoc(userDocRef, newUser);
      } else {
        await setDoc(userDocRef, { lastLogin: serverTimestamp(), photoURL: user.photoURL || null }, { merge: true });
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (error.code === statusCodes.IN_PROGRESS)
        Alert.alert('Sign-in already in progress');
      else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
        Alert.alert('Error', 'Google Play Services not available');
      else
        Alert.alert('Sign-In Error', error.message);
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
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setAuthError('');
    try {
      if (isSignUp) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          email: cred.user.email, displayName: email.split('@')[0],
          photoURL: null, createdAt: serverTimestamp(), lastLogin: serverTimestamp(),
          tokens: 0, totalCarbonSaved: 0, hasFinishedOnboarding: false,
        });
        // Send verification email — best-effort, don't block onboarding if it fails
        sendEmailVerification(cred.user).catch(() => {});
        setEmail(''); setPassword('');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

        // 1. Fetch the user document immediately
        const userDocRef = doc(db, 'users', cred.user.uid);
        const userDoc = await getDoc(userDocRef);

        // 2. Update last login
        await setDoc(doc(db, 'users', cred.user.uid), { lastLogin: serverTimestamp() }, { merge: true });

        const userData = userDoc.data();

        // 3. Explicitly route based on the onboarding flag
        if (userData?.hasFinishedOnboarding === true) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      }
    } catch (error: any) {
      const msg =
        error.code === 'auth/user-not-found'         ? 'No account found with this email.' :
        error.code === 'auth/wrong-password'          ? 'Incorrect password. Please try again.' :
        error.code === 'auth/invalid-credential'      ? 'Incorrect email or password.' :
        error.code === 'auth/invalid-email'           ? 'Please enter a valid email address.' :
        error.code === 'auth/email-already-in-use'    ? 'An account already exists with this email. Try signing in instead.' :
        error.code === 'auth/weak-password'           ? 'Password must be at least 6 characters.' :
        error.code === 'auth/password-does-not-meet-requirements' ? 'Password must be at least 6 characters, combining uppercase/lowercase letters, numbers, and symbols.' :
        error.code === 'auth/too-many-requests'       ? 'Too many attempts. Please wait a moment and try again.' :
        error.code === 'auth/network-request-failed'  ? 'No internet connection. Check your network and try again.' :
        error.code === 'auth/user-disabled'           ? 'This account has been disabled. Please contact support.' :
        error.message?.toLowerCase().includes('password') ? 'Password must be at least 6 characters.' :
        'Something went wrong. Please try again.';
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      // Email field is empty — show inline message asking them to enter it
      setAuthError('Enter your email address above, then tap "Forgot password".');
      return;
    }
    setResetLoading(true);
    setAuthError('');
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setResetEmailSent(true);
      // Clear after 6 seconds so it doesn't linger if they switch to Sign Up
      setTimeout(() => setResetEmailSent(false), 6000);
    } catch (error: any) {
      const msg =
        error.code === 'auth/user-not-found'     ? 'No account found with this email.' :
        error.code === 'auth/invalid-email'       ? 'Please enter a valid email address.' :
        error.code === 'auth/too-many-requests'   ? 'Too many attempts. Please wait and try again.' :
        'Could not send reset email. Please try again.';
      setAuthError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  // ── Dark: deep forest. Light: clean white/mint — clearly distinct ──────────
  const gradientColors = isDark
    ? ['#0B1E14', '#0D2A1A', '#0B1E14'] as const
    : ['#FFFFFF', '#F0F9F1', '#E4F5E7'] as const;

  // ── Input border ───────────────────────────────────────────────────────────
  const inputBorderFocused   = colors.tint + 'CC';
  const inputBorderUnfocused = isDark ? 'rgba(255,255,255,0.12)' : '#D8D8D8';
  const inputBg              = isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5';

  // ── Card: NO shadow/elevation/border in dark mode — causes the "box" look ──
  const cardStyle = isDark
    ? {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        // No shadow props at all in dark mode
      }
    : {
        backgroundColor: '#FFFFFF',
        borderColor: 'rgba(0,0,0,0.06)',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.09,
        shadowRadius: 14,
        elevation: 5,
      };

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>

      {/* Decorative orbs — stronger in light mode for visual interest */}
      <View style={[styles.orb, styles.orbTopRight, {
        backgroundColor: isDark ? colors.tint + '15' : '#B9E8BF',
      }]} />
      <View style={[styles.orb, styles.orbBottomLeft, {
        backgroundColor: isDark ? '#34C9C918' : '#A5D6A7',
      }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Logo ── */}
          <View style={styles.logoSection}>
            {/* In light mode, add a subtle circular glow behind logo to make it pop */}
            {!isDark && (
              <View style={styles.logoGlow} />
            )}
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.tagline, {
              // Darker green in light mode so it's clearly readable
              color: isDark ? '#8BE94F' : '#1B5E20',
            }]}>
              TRACK YOUR IMPACT
            </Text>
          </View>

          {/* ── Card ── */}
          <View style={[styles.card, cardStyle]}>

            {/* Mode toggle pill */}
            <View style={[styles.modePill, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EBEBEB',
            }]}>
              <Pressable
                style={[styles.modeBtn, !isSignUp && { backgroundColor: colors.tint }]}
                onPress={() => { setIsSignUp(false); setEmail(''); setPassword(''); setAuthError(''); setResetEmailSent(false); }}
              >
                <Text style={[styles.modeBtnText, {
                  color: !isSignUp ? '#fff' : (isDark ? 'rgba(255,255,255,0.5)' : '#777'),
                }]}>Sign In</Text>
              </Pressable>
              <Pressable
                style={[styles.modeBtn, isSignUp && { backgroundColor: colors.tint }]}
                onPress={() => { setIsSignUp(true); setEmail(''); setPassword(''); setAuthError(''); setResetEmailSent(false); }}
              >
                <Text style={[styles.modeBtnText, {
                  color: isSignUp ? '#fff' : (isDark ? 'rgba(255,255,255,0.5)' : '#777'),
                }]}>Sign Up</Text>
              </Pressable>
            </View>

            {/* Email input */}
            <View style={[styles.inputWrap, {
              borderColor: emailFocused ? inputBorderFocused : inputBorderUnfocused,
              backgroundColor: inputBg,
            }]}>
              <Ionicons name="mail-outline" size={18}
                color={isDark ? 'rgba(255,255,255,0.35)' : '#AAAAAA'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#111' }]}
                placeholder="Email address"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : '#C0C0C0'}
                value={email}
                onChangeText={v => { setEmail(v); clearError(); }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Password input */}
            <View style={[styles.inputWrap, {
              borderColor: passFocused ? inputBorderFocused : inputBorderUnfocused,
              backgroundColor: inputBg,
            }]}>
              <Ionicons name="lock-closed-outline" size={18}
                color={isDark ? 'rgba(255,255,255,0.35)' : '#AAAAAA'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#111', flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.28)' : '#C0C0C0'}
                value={password}
                onChangeText={v => { setPassword(v); clearError(); }}
                secureTextEntry={!showPassword}
                editable={!loading}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20} color={isDark ? 'rgba(255,255,255,0.35)' : '#AAAAAA'}
                />
              </Pressable>
            </View>

            {/* Inline error */}
            {authError ? (
              <View style={[styles.errorBox, { backgroundColor: '#FF525212' }]}>
                <Ionicons name="alert-circle-outline" size={15} color="#FF5252" />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            ) : null}

            {/* Forgot password */}
            {!isSignUp && (
              resetEmailSent ? (
                <View style={[styles.resetSentBox, { backgroundColor: colors.tint + '18', borderColor: colors.tint + '40' }]}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={colors.tint} />
                  <Text style={[styles.resetSentText, { color: colors.tint }]}>
                    Reset link sent — check your inbox
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleForgotPassword}
                  style={styles.forgotBtn}
                  disabled={resetLoading}
                >
                  {resetLoading
                    ? <ActivityIndicator size="small" color={colors.tint} />
                    : <Text style={[styles.forgotText, { color: colors.tint }]}>Forgot password?</Text>
                  }
                </Pressable>
              )
            )}

            {/* Primary CTA */}
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.tint, opacity: loading ? 0.7 : 1 }]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
              }
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E5E5' }]} />
              <Text style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#CCCCCC', fontSize: 12, marginHorizontal: 12 }}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E5E5' }]} />
            </View>

            {/* Google — PNG icon, no SVG to avoid duplicate registration error */}
            <Pressable
              style={[styles.googleBtn, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FAFAFA',
                borderColor:     isDark ? 'rgba(255,255,255,0.10)' : '#E0E0E0',
              }]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {/* Place google-icon.png in assets/images/ */}
              <Image
                source={require('@/assets/images/google-icon.png')}
                style={styles.googleIcon}
                resizeMode="contain"
              />
              <Text style={[styles.googleBtnText, { color: isDark ? '#fff' : '#333' }]}>
                Continue with Google
              </Text>
            </Pressable>

          </View>

          {/* Terms note */}
          <Text style={[styles.termsNote, {
            color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
          }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>

        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  orb: { position: 'absolute', borderRadius: 999 },
  orbTopRight:   { width: 260, height: 260, top: -70,  right: -70 },
  orbBottomLeft: { width: 190, height: 190, bottom: 50, left: -55 },

  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  logoSection: { alignItems: 'center', marginBottom: 20 },
  // Soft circular glow behind logo in light mode — makes it pop off white bg
  logoGlow: {
    position: 'absolute',
    width: 170, height: 170,
    borderRadius: 85,
    backgroundColor: '#C8E6C9',
    top: 0,
  },
  logo:    { width: 150, height: 150, marginBottom: -12 },
  tagline: { fontSize: 11, fontWeight: '800', letterSpacing: 3, opacity: 0.9 },

  card: { borderRadius: 24, padding: 24, gap: 12 },

  modePill:    { flexDirection: 'row', borderRadius: 12, padding: 3, marginBottom: 4 },
  modeBtn:     { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeBtnText: { fontSize: 14, fontWeight: '600' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, fontSize: 15, height: 52 },
  eyeBtn:    { padding: 4 },

  forgotBtn:    { alignSelf: 'flex-end', marginTop: -4 },
  resetSentBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, alignSelf: 'stretch' },
  resetSentText: { fontSize: 13, fontWeight: '500', flex: 1 },
  errorBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, marginTop: -4 },
  errorText:  { color: '#FF5252', fontSize: 13, flex: 1, lineHeight: 18 },
  forgotText: { fontSize: 13, fontWeight: '500' },

  primaryBtn: {
    height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  dividerRow:  { flexDirection: 'row', alignItems: 'center' },
  dividerLine: { flex: 1, height: 1 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 14, borderWidth: 1, gap: 10,
  },
  googleIcon:    { width: 30, height: 30 },
  googleBtnText: { fontSize: 15, fontWeight: '600' },

  termsNote: {
    textAlign: 'center', fontSize: 11,
    marginTop: 16, lineHeight: 16, paddingHorizontal: 20,
  },
});