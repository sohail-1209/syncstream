// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBND0F3hvYEPbtudDIQYihndluyMKhbMZ0",
  authDomain: "syncstream-ptp6x.firebaseapp.com",
  projectId: "syncstream-ptp6x",
  storageBucket: "syncstream-ptp6x.firebasestorage.app",
  messagingSenderId: "1048156878113",
  appId: "1:1048156878113:web:865d06ee557681e626fa60"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
