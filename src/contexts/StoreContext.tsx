"use client"

import type React from "react"
import { createContext, useState, useEffect, useContext } from "react"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  onSnapshot,
} from "firebase/firestore"
import { db } from "../utils/firebase"
import { useAuth } from "./AuthContext"

export interface Store {
  id: string
  name: string
  address: string
  openingBalance: number
  currentBalance: number
  createdAt: Date
  updatedAt: Date
  entryPersonIds: string[]
}

export interface Transaction {
  id: string
  storeId: string
  amount: number
  paymentMethod: "cash" | "upi" | "credit"
  type: "collection" | "withdrawal"
  remarks: string
  createdBy: string
  createdByName: string
  createdAt: Date
}

interface StoreContextType {
  stores: Store[]
  selectedStore: Store | null
  transactions: Transaction[]
  loadingStores: boolean
  loadingTransactions: boolean
  selectStore: (storeId: string) => Promise<void>
  createStore: (storeData: Omit<Store, "id" | "createdAt" | "updatedAt" | "currentBalance">) => Promise<string>
  updateStore: (storeId: string, storeData: Partial<Omit<Store, "id" | "createdAt" | "updatedAt">>) => Promise<void>
  deleteStore: (storeId: string) => Promise<void>
  addTransaction: (transactionData: Omit<Transaction, "id" | "createdAt">) => Promise<string>
  updateTransaction: (
    transactionId: string,
    transactionData: Partial<Omit<Transaction, "id" | "createdAt">>,
  ) => Promise<void>
  deleteTransaction: (transactionId: string) => Promise<void>
  getStoreTransactions: (storeId: string, startDate?: Date, endDate?: Date) => Promise<Transaction[]>
  withdrawAmount: (storeId: string, amount: number, remarks: string) => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export const useStore = () => {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider")
  }
  return context
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingStores, setLoadingStores] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const { currentUser } = useAuth()

  // Load stores based on user role
  useEffect(() => {
    if (!currentUser) {
      setStores([])
      setLoadingStores(false)
      return
    }

    setLoadingStores(true)

    let storesQuery
    if (currentUser.role === "admin") {
      // Admin can see all stores
      storesQuery = collection(db, "stores")
    } else {
      // Entry person can only see assigned stores
      storesQuery = query(collection(db, "stores"), where("entryPersonIds", "array-contains", currentUser.uid))
    }

    const unsubscribe = onSnapshot(
      storesQuery,
      (snapshot) => {
        const storesList: Store[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          storesList.push({
            id: doc.id,
            name: data.name,
            address: data.address,
            openingBalance: data.openingBalance,
            currentBalance: data.currentBalance,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            entryPersonIds: data.entryPersonIds || [],
          })
        })
        setStores(storesList)
        setLoadingStores(false)
      },
      (error) => {
        console.error("Error loading stores:", error)
        setLoadingStores(false)
      },
    )

    return () => unsubscribe()
  }, [currentUser])

  const selectStore = async (storeId: string) => {
    if (!storeId) {
      setSelectedStore(null)
      setTransactions([])
      return
    }

    try {
      const storeDoc = await getDoc(doc(db, "stores", storeId))
      if (storeDoc.exists()) {
        const data = storeDoc.data()
        setSelectedStore({
          id: storeDoc.id,
          name: data.name,
          address: data.address,
          openingBalance: data.openingBalance,
          currentBalance: data.currentBalance,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          entryPersonIds: data.entryPersonIds || [],
        })

        // Load transactions for this store
        await getStoreTransactions(storeId)
      } else {
        setSelectedStore(null)
        setTransactions([])
      }
    } catch (error) {
      console.error("Error selecting store:", error)
      setSelectedStore(null)
    }
  }

  const createStore = async (storeData: Omit<Store, "id" | "createdAt" | "updatedAt" | "currentBalance">) => {
    try {
      const now = Timestamp.now()
      const storeRef = await addDoc(collection(db, "stores"), {
        ...storeData,
        currentBalance: storeData.openingBalance,
        createdAt: now,
        updatedAt: now,
      })
      return storeRef.id
    } catch (error) {
      console.error("Error creating store:", error)
      throw error
    }
  }

  const updateStore = async (storeId: string, storeData: Partial<Omit<Store, "id" | "createdAt" | "updatedAt">>) => {
    try {
      await updateDoc(doc(db, "stores", storeId), {
        ...storeData,
        updatedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error("Error updating store:", error)
      throw error
    }
  }

  const deleteStore = async (storeId: string) => {
    try {
      // First check if there are any transactions for this store
      const transactionsQuery = query(collection(db, "transactions"), where("storeId", "==", storeId))
      const snapshot = await getDocs(transactionsQuery)

      if (!snapshot.empty) {
        throw new Error("Cannot delete store with existing transactions")
      }

      await deleteDoc(doc(db, "stores", storeId))
    } catch (error) {
      console.error("Error deleting store:", error)
      throw error
    }
  }

  const addTransaction = async (transactionData: Omit<Transaction, "id" | "createdAt">) => {
    try {
      // Get the current store balance
      const storeDoc = await getDoc(doc(db, "stores", transactionData.storeId))
      if (!storeDoc.exists()) {
        throw new Error("Store not found")
      }

      const storeData = storeDoc.data()
      let newBalance = storeData.currentBalance

      // Update balance based on transaction type
      if (transactionData.type === "collection") {
        newBalance += transactionData.amount
      } else if (transactionData.type === "withdrawal") {
        if (newBalance < transactionData.amount) {
          throw new Error("Insufficient balance for withdrawal")
        }
        newBalance -= transactionData.amount
      }

      // Add transaction
      const transactionRef = await addDoc(collection(db, "transactions"), {
        ...transactionData,
        createdAt: Timestamp.now(),
      })

      // Update store balance
      await updateDoc(doc(db, "stores", transactionData.storeId), {
        currentBalance: newBalance,
        updatedAt: Timestamp.now(),
      })

      return transactionRef.id
    } catch (error) {
      console.error("Error adding transaction:", error)
      throw error
    }
  }

  const updateTransaction = async (
    transactionId: string,
    transactionData: Partial<Omit<Transaction, "id" | "createdAt">>,
  ) => {
    try {
      // Get the original transaction
      const transactionDoc = await getDoc(doc(db, "transactions", transactionId))
      if (!transactionDoc.exists()) {
        throw new Error("Transaction not found")
      }

      const originalTransaction = transactionDoc.data() as Transaction

      // If amount or type is changing, we need to update the store balance
      if (
        (transactionData.amount !== undefined && transactionData.amount !== originalTransaction.amount) ||
        (transactionData.type !== undefined && transactionData.type !== originalTransaction.type)
      ) {
        // Get the current store balance
        const storeDoc = await getDoc(doc(db, "stores", originalTransaction.storeId))
        if (!storeDoc.exists()) {
          throw new Error("Store not found")
        }

        const storeData = storeDoc.data()
        let newBalance = storeData.currentBalance

        // Reverse the effect of the original transaction
        if (originalTransaction.type === "collection") {
          newBalance -= originalTransaction.amount
        } else if (originalTransaction.type === "withdrawal") {
          newBalance += originalTransaction.amount
        }

        // Apply the effect of the updated transaction
        const newType = transactionData.type || originalTransaction.type
        const newAmount = transactionData.amount || originalTransaction.amount

        if (newType === "collection") {
          newBalance += newAmount
        } else if (newType === "withdrawal") {
          if (newBalance < newAmount) {
            throw new Error("Insufficient balance for withdrawal")
          }
          newBalance -= newAmount
        }

        // Update store balance
        await updateDoc(doc(db, "stores", originalTransaction.storeId), {
          currentBalance: newBalance,
          updatedAt: Timestamp.now(),
        })
      }

      // Update transaction
      await updateDoc(doc(db, "transactions", transactionId), {
        ...transactionData,
        updatedAt: Timestamp.now(),
      })
    } catch (error) {
      console.error("Error updating transaction:", error)
      throw error
    }
  }

  const deleteTransaction = async (transactionId: string) => {
    try {
      // Get the transaction
      const transactionDoc = await getDoc(doc(db, "transactions", transactionId))
      if (!transactionDoc.exists()) {
        throw new Error("Transaction not found")
      }

      const transaction = transactionDoc.data() as Transaction

      // Get the current store balance
      const storeDoc = await getDoc(doc(db, "stores", transaction.storeId))
      if (!storeDoc.exists()) {
        throw new Error("Store not found")
      }

      const storeData = storeDoc.data()
      let newBalance = storeData.currentBalance

      // Reverse the effect of the transaction
      if (transaction.type === "collection") {
        newBalance -= transaction.amount
      } else if (transaction.type === "withdrawal") {
        newBalance += transaction.amount
      }

      // Update store balance
      await updateDoc(doc(db, "stores", transaction.storeId), {
        currentBalance: newBalance,
        updatedAt: Timestamp.now(),
      })

      // Delete transaction
      await deleteDoc(doc(db, "transactions", transactionId))
    } catch (error) {
      console.error("Error deleting transaction:", error)
      throw error
    }
  }

  const getStoreTransactions = async (storeId: string, startDate?: Date, endDate?: Date) => {
    setLoadingTransactions(true)
    try {
      let transactionsQuery = query(collection(db, "transactions"), where("storeId", "==", storeId))

      if (startDate) {
        transactionsQuery = query(transactionsQuery, where("createdAt", ">=", Timestamp.fromDate(startDate)))
      }

      if (endDate) {
        transactionsQuery = query(transactionsQuery, where("createdAt", "<=", Timestamp.fromDate(endDate)))
      }

      const snapshot = await getDocs(transactionsQuery)
      const transactionsList: Transaction[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        transactionsList.push({
          id: doc.id,
          storeId: data.storeId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          type: data.type,
          remarks: data.remarks,
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          createdAt: data.createdAt.toDate(),
        })
      })

      // Sort by date, newest first
      transactionsList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      setTransactions(transactionsList)
      setLoadingTransactions(false)
      return transactionsList
    } catch (error) {
      console.error("Error getting store transactions:", error)
      setLoadingTransactions(false)
      throw error
    }
  }

  const withdrawAmount = async (storeId: string, amount: number, remarks: string) => {
    if (!currentUser) throw new Error("User not authenticated")

    try {
      await addTransaction({
        storeId,
        amount,
        paymentMethod: "cash", // Withdrawals are typically cash
        type: "withdrawal",
        remarks,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || currentUser.email,
      })
    } catch (error) {
      console.error("Error withdrawing amount:", error)
      throw error
    }
  }

  const value = {
    stores,
    selectedStore,
    transactions,
    loadingStores,
    loadingTransactions,
    selectStore,
    createStore,
    updateStore,
    deleteStore,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getStoreTransactions,
    withdrawAmount,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
