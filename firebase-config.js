const firebaseConfig = {
  apiKey: "AIzaSyCr8_WDgp_DO4kE_sWObhhmyH-XzSs8W0U",
  authDomain: "mc-agency-9736b.firebaseapp.com",
  projectId: "mc-agency-9736b",
  storageBucket: "mc-agency-9736b.firebasestorage.app",
  messagingSenderId: "231711294642",
  appId: "1:231711294642:web:3d18e34bd0658a25cb35ab",
  measurementId: "G-WXQCJTWQN8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Optional: Add analytics if needed
const analytics = firebase.analytics();

