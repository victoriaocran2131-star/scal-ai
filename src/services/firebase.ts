import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAdv7mIs-NaPG9jIAWIPRnrbdxkmqhmefs",
  authDomain: "scal-ai-4910c.firebaseapp.com",
  projectId: "scal-ai-4910c",
  storageBucket: "scal-ai-4910c.firebasestorage.app",
  messagingSenderId: "523362998451",
  appId: "1:523362998451:web:d426b82d9e859c8d7338c6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
