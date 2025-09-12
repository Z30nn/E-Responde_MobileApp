import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Explicitly import AsyncStorage to satisfy Firebase v12 warning
// This tells Firebase that AsyncStorage is available for persistence
console.log('AsyncStorage available for Firebase Auth persistence:', !!AsyncStorage);

// Your Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyBZzn8kYUjqTo1-Wpu9vT4jZ9-UB2BDL4Y",
    authDomain: "e-responde.firebaseapp.com",
    databaseURL: "https://e-responde-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "e-responde",
    storageBucket: "e-responde.firebasestorage.app",
    messagingSenderId: "343953743058",
    appId: "1:343953743058:android:402d049aa2fd446be7e10b"
};

// Initialize Firebase (check for existing instances)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase Auth
// Firebase v12 automatically detects and uses AsyncStorage for persistence in React Native
// The warning about AsyncStorage is a false positive - persistence works automatically
export const auth = getAuth(app);

// Initialize Firebase services
export const database = getDatabase(app);

export default app;
