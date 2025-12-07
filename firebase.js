// Firebase config (from user)
const firebaseConfig = {
  apiKey:"AIzaSyDdKe6vnWEbSq5FHz1Y6Pz3QdVjcrrq5CA",
  authDomain:"dolvar-7cc8e.firebaseapp.com",
  projectId:"dolvar-7cc8e",
  storageBucket:"dolvar-7cc8e.firebasestorage.app",
  messagingSenderId:"284313401192",
  appId:"1:284313401192:web:0d2c088d37c5fbe8f008dd",
  measurementId:"G-D6PRWJGLGQ"
};

// init (compat)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
console.log("Firebase initialized (compat)");
