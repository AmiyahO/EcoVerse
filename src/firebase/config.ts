// src/firebase/config.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAKfXNVGCNiW7p4q04h0u--EWWo8yBkURM",
  authDomain: "ecoverse-321bd.firebaseapp.com",
  projectId: "ecoverse-321bd",
  storageBucket: "ecoverse-321bd.firebasestorage.app",
  messagingSenderId: "29515161391",
  appId: "1:29515161391:web:1499dde456cb6c31decbda"
};

// initialize firebase app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// auth instance
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
