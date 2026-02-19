import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            "AIzaSyD_szaaxnFAjtHA7w65zKeaxGKGkqV3OvM",
  authDomain:        "ac-scouting.firebaseapp.com",
  projectId:         "ac-scouting",
  storageBucket:     "ac-scouting.firebasestorage.app",
  messagingSenderId: "322559785391",
  appId:             "1:322559785391:web:891b0b533d36976851175a",
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const db = getFirestore(app)
