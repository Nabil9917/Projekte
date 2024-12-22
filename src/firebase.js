// Importiere die Funktionen, die du aus dem Firebase SDK benötigst
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Authentifizierungsfunktion importieren
import { getFirestore } from "firebase/firestore"; // Firestore-Datenbank importieren

// Deine Firebase-Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyCD_IfaGTdOl3M82xCXCX3koCV9Jf7DT60",
  authDomain: "wg-verwaltung-f94c9.firebaseapp.com",
  projectId: "wg-verwaltung-f94c9",
  storageBucket: "wg-verwaltung-f94c9.appspot.com",
  messagingSenderId: "952038417210",
  appId: "1:952038417210:web:4872523398ef37f253a603",
  measurementId: "G-B5MXN3EQ0M",
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);

// Authentifizierung und Firestore-Datenbank initialisieren
const auth = getAuth(app);
const db = getFirestore(app);

// Exportiere auth und db, damit sie in anderen Dateien verwendet werden können
export { auth, db };
