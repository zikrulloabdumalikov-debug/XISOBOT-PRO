
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAIasM8XWCPQdDfOBXxtOjUWUN84aKmov4",
  authDomain: "xisobotpro-e153b.firebaseapp.com",
  projectId: "xisobotpro-e153b",
  storageBucket: "xisobotpro-e153b.firebasestorage.app",
  messagingSenderId: "861517015010",
  appId: "1:861517015010:web:9667360edb9576cfd8bbbb",
  measurementId: "G-PTCPYXF9R1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
