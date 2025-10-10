import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
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
let app;
let auth;

try {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
        console.log('Firebase: App initialized successfully');
        
        // Initialize Auth with AsyncStorage persistence for React Native
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
        console.log('Firebase: Auth initialized with persistence');
    } else {
        app = getApps()[0];
        auth = getAuth(app);
        console.log('Firebase: Using existing app instance');
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
    // Fallback to basic initialization
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
}

export { auth };

// Initialize Firebase services
export const database = getDatabase(app);

export default app;
