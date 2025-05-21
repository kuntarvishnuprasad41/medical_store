import { initializeApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from "firebase/firestore"
import { getFunctions, connectFunctionsEmulator } from "firebase/functions"
import Constants from "expo-constants"
import { __DEV__ } from "react-native"

// Initialize Firebase
export const initializeFirebase = () => {
  const firebaseConfig = {
    apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
    authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
    projectId: Constants.expoConfig?.extra?.firebaseProjectId,
    storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
    messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
    appId: Constants.expoConfig?.extra?.firebaseAppId,
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  const functions = getFunctions(app)

  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.log("Multiple tabs open, persistence can only be enabled in one tab at a time.")
    } else if (err.code === "unimplemented") {
      console.log("The current browser does not support all of the features required to enable persistence")
    }
  })

  // Connect to emulators in development
  if (__DEV__) {
    connectAuthEmulator(auth, "http://localhost:9099")
    connectFirestoreEmulator(db, "localhost", 8080)
    connectFunctionsEmulator(functions, "localhost", 5001)
  }

  return { app, auth, db, functions }
}

export const { app, auth, db, functions } = initializeFirebase()
