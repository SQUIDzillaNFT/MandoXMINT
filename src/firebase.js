// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAhhICLuNRJIDjv1M9iO1UYdl0IWZo-y00",
  authDomain: "mandoxmint.firebaseapp.com",
  projectId: "mandoxmint",
  storageBucket: "mandoxmint.appspot.com",
  messagingSenderId: "735725910900",
  appId: "1:735725910900:web:e8086287e3bdcc59c30a21",
  measurementId: "G-NSTFLPMDT8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);