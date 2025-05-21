"use client"

import { useState, useEffect } from "react"
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native"
import { TextInput, Button, Text, RadioButton, HelperText, Headline, Chip } from "react-native-paper"
import { useRoute, useNavigation } from "@react-navigation/native"
import { useStore } from "../../contexts/StoreContext"
import { useAuth } from "../../contexts/AuthContext"
import { formatCurrency } from "../../utils/formatters"

const PRESET_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000]

const TransactionEntryScreen = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const { storeId } = route.params as { storeId: string }
  const { selectedStore, selectStore, addTransaction } = useStore()
  const { currentUser } = useAuth()

  const [amount, setAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "credit">("cash")
  const [remarks, setRemarks] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadStoreData()
  }, [storeId])

  const loadStoreData = async () => {
    if (!selectedStore || selectedStore.id !== storeId) {
      await selectStore(storeId)
    }
  }

  const handlePresetAmount = (value: number) => {
    setAmount(value.toString())
  }

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (!currentUser) {
      setError("User not authenticated")
      return
    }

    setLoading(true)
    setError("")

    try {
      await addTransaction({
        storeId,
        amount: Number(amount),
        paymentMethod,
        type: "collection",
        remarks,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || currentUser.email,
      })

      navigation.goBack()
    } catch (err: any) {
      setError(err.message || "Failed to add transaction")
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {selectedStore && (
          <View style={styles.storeInfoContainer}>
            <Headline style={styles.storeName}>{selectedStore.name}</Headline>
            <Text style={styles.storeBalance}>Current Balance: {formatCurrency(selectedStore.currentBalance)}</Text>
          </View>
        )}

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Enter Transaction Details</Text>

          <View style={styles.presetContainer}>
            <Text style={styles.presetLabel}>Quick Amounts:</Text>
            <View style={styles.presetChips}>
              {PRESET_AMOUNTS.map((presetAmount) => (
                <Chip key={presetAmount} onPress={() => handlePresetAmount(presetAmount)} style={styles.presetChip}>
                  ₹{presetAmount}
                </Chip>
              ))}
            </View>
          </View>

          <TextInput
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />

          <Text style={styles.radioLabel}>Payment Method:</Text>
          <RadioButton.Group
            onValueChange={(value) => setPaymentMethod(value as "cash" | "upi" | "credit")}
            value={paymentMethod}
          >
            <View style={styles.radioContainer}>
              <RadioButton.Item label="Cash" value="cash" />
              <RadioButton.Item label="UPI" value="upi" />
              <RadioButton.Item label="Credit" value="credit" />
            </View>
          </RadioButton.Group>

          <TextInput
            label="Remarks (Optional)"
            value={remarks}
            onChangeText={setRemarks}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          {error ? <HelperText type="error">{error}</HelperText> : null}

          <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} style={styles.button}>
            Save Transaction
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 20,
  },
  storeInfoContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  storeName: {
    fontSize: 20,
    fontWeight: "bold",
  },
  storeBalance: {
    fontSize: 16,
    marginTop: 5,
  },
  formContainer: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  presetContainer: {
    marginBottom: 15,
  },
  presetLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  presetChips: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  presetChip: {
    margin: 4,
  },
  input: {
    marginBottom: 16,
  },
  radioLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  radioContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
})

export default TransactionEntryScreen
