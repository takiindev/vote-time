import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDODWMiS8FcpogA35wWon3bOJ1zSxaoOGQ",
  authDomain: "sample-firebase-ai-app-26281.firebaseapp.com",
  projectId: "sample-firebase-ai-app-26281",
  storageBucket: "sample-firebase-ai-app-26281.appspot.com",
  messagingSenderId: "611707542566",
  appId: "1:611707542566:web:6b690baa6f34494965dae7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
