import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { firebaseConfig } from './firebaseConfig';

/**
 * Firebase Service
 *
 * This module initializes and exports the Firebase Firestore instance.
 * It reads its configuration from `firebaseConfig.ts`.
 *
 * /!\ IMPORTANT /!\
 * Make sure to fill in your credentials in `firebaseConfig.ts` and
 * DO NOT commit that file to version control.
 *
 * Note: For scalability and better data organization, this app uses Firestore,
 * which is a powerful, scalable NoSQL document database, over the Realtime Database.
 */

let app: firebase.app.App;
let db: firebase.firestore.Firestore;

// This flag determines if Firebase was successfully initialized.
let configured = false;

try {
  // Check if placeholder values have been replaced.
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_')) {
    app = firebase.initializeApp(firebaseConfig);
    // Use initializeFirestore to set long polling. This can help bypass
    // network issues (like firewalls blocking WebSockets) that can cause
    // "unavailable" errors with the Firestore backend.
    db = app.firestore()
    db.settings({
        experimentalForceLongPolling: true,
    });
    configured = true;
  } else {
    // If config is missing or is still the placeholder, we'll run in a mock mode.
    console.warn(
      "Firebase configuration is incomplete or contains placeholder values in `firebaseConfig.ts`. CoreNexus will run in a mock, non-persistent mode. Please provide your Firebase credentials to enable real-time features."
    );
    // Create a mock db object to prevent the app from crashing.
    db = {} as firebase.firestore.Firestore;
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
  // Create a mock db object on error as well.
  db = {} as firebase.firestore.Firestore;
}

export { db };

/**
 * Checks if the Firebase connection was successfully configured.
 * @returns {boolean} True if Firebase is connected, false otherwise.
 */
export const isFirebaseConfigured = (): boolean => {
    return configured;
};