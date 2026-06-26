import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCM3cTJAPwkX9ZrQVTdPrlWGYsnJ2z1eqw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "colourplay-5385d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "colourplay-5385d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "colourplay-5385d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "212908790204",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:212908790204:web:c87d2b943d496a730b9bb9",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-JGKPXRGFXG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

auth.useDeviceLanguage();

export { app, auth };

