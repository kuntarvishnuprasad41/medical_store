"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext } from "react"
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth"
import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore"
import { db } from "../utils/firebase"

export type UserRole = "admin" | "entry_person"

export interface User {
  uid: string
  email: string
  displayName?: string
  role: UserRole
  storeIds?: string[]
  createdAt: Date
  lastLogin: Date
}

interface AuthContextType {
  currentUser: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>
  signOut: () => Promise<void>
  updateUserProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const auth = getAuth()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))

        if (userDoc.exists()) {
          const userData = userDoc.data() as Omit<User, "uid">
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            ...userData,
            createdAt: userData.createdAt?.toDate() || new Date(),
            lastLogin: userData.lastLogin?.toDate() || new Date(),
          })

          // Update last login
          await setDoc(
            doc(db, "users", firebaseUser.uid),
            {
              lastLogin: Timestamp.now(),
            },
            { merge: true },
          )
        } else {
          // User document doesn't exist
          setCurrentUser(null)
        }
      } else {
        setCurrentUser(null)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      console.error("Sign in error:", error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, displayName: string, role: UserRole) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email,
        displayName,
        role,
        createdAt: Timestamp.now(),
        lastLogin: Timestamp.now(),
        storeIds: [],
      })
    } catch (error) {
      console.error("Sign up error:", error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error("Sign out error:", error)
      throw error
    }
  }

  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) throw new Error("No user is signed in")

    try {
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          ...data,
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      )

      setCurrentUser((prev) => (prev ? { ...prev, ...data } : null))
    } catch (error) {
      console.error("Update profile error:", error)
      throw error
    }
  }

  const value = {
    currentUser,
    loading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
