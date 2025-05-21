"use client"

import { useState } from "react"
import { StyleSheet } from "react-native"
import { Dialog, Portal, TextInput, Button, Text, HelperText } from "react-native-paper"
import { useStore } from "../contexts/StoreContext"
import { useAuth } from "../contexts/AuthContext"
import { formatCurrency } from "../utils/formatters"

interface WithdrawDialogProps {
  visible: boolean
  onDismiss: () => void
  storeId: string
  currentBalance: number
  onWithdrawSuccess: () => void
}

const WithdrawDialog = ({ visible, onDismiss, storeId, currentBalance, onWithdrawSuccess }: WithdrawDialogProps) => {
  const [amount, setAmount] = useState("")
  const [remarks, setRemarks] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { withdrawAmount } = useStore()
  const { currentUser } = useAuth()

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    const withdrawalAmount = Number(amount)
    if (withdrawalAmount > currentBalance) {
      setError(`Insufficient balance. Available: ${formatCurrency(currentBalance)}`)
      return
    }

    if (!currentUser) {
      setError("User not authenticated")
      return
    }

    setLoading(true)
    setError("")

    try {
      await withdrawAmount(storeId, withdrawalAmount, remarks)
      setAmount("")
      setRemarks("")
      onDismiss()
      onWithdrawSuccess()
    } catch (err: any) {
      setError(err.message || "Failed to withdraw amount")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Withdraw Amount</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.balanceText}>Available Balance: {formatCurrency(currentBalance)}</Text>

          <TextInput
            label="Amount (₹)"
            value={amount}
            onChangeText={setAmount}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />

          <TextInput
            label="Remarks"
            value={remarks}
            onChangeText={setRemarks}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
          />

          {error ? <HelperText type="error">{error}</HelperText> : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button mode="contained" onPress={handleWithdraw} loading={loading} disabled={loading}>
            Withdraw
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

const styles = StyleSheet.create({
  balanceText: {
    fontSize: 16,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
})

export default WithdrawDialog
