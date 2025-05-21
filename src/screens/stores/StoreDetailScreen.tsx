"use client"

import { useEffect, useState } from "react"
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native"
import { Card, Title, Paragraph, Button, Text, Divider, ActivityIndicator, Chip } from "react-native-paper"
import { useRoute, useNavigation } from "@react-navigation/native"
import { useStore } from "../../contexts/StoreContext"
import { useAuth } from "../../contexts/AuthContext"
import { formatCurrency, formatDate } from "../../utils/formatters"
import WithdrawDialog from "../../components/WithdrawDialog"

const StoreDetailScreen = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const { storeId } = route.params as { storeId: string }
  const { selectedStore, transactions, loadingTransactions, selectStore, getStoreTransactions } = useStore()
  const { currentUser } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [withdrawDialogVisible, setWithdrawDialogVisible] = useState(false)
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("today")

  useEffect(() => {
    loadStoreData()
  }, [storeId])

  const loadStoreData = async () => {
    await selectStore(storeId)
    applyDateFilter(dateFilter)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadStoreData()
    setRefreshing(false)
  }

  const applyDateFilter = async (filter: "today" | "week" | "month" | "all") => {
    setDateFilter(filter)

    let startDate: Date | undefined
    const now = new Date()

    if (filter === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (filter === "week") {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
    } else if (filter === "month") {
      startDate = new Date(now)
      startDate.setMonth(now.getMonth() - 1)
    } else {
      startDate = undefined
    }

    await getStoreTransactions(storeId, startDate)
  }

  const handleAddTransaction = () => {
    navigation.navigate("TransactionEntry" as never, { storeId } as never)
  }

  const handleEditStore = () => {
    navigation.navigate("StoreManagement" as never, { mode: "edit", storeId } as never)
  }

  const handleWithdraw = () => {
    setWithdrawDialogVisible(true)
  }

  const calculateSummary = () => {
    const summary = {
      totalCollection: 0,
      totalWithdrawal: 0,
      cashCollection: 0,
      upiCollection: 0,
      creditCollection: 0,
    }

    transactions.forEach((transaction) => {
      if (transaction.type === "collection") {
        summary.totalCollection += transaction.amount

        if (transaction.paymentMethod === "cash") {
          summary.cashCollection += transaction.amount
        } else if (transaction.paymentMethod === "upi") {
          summary.upiCollection += transaction.amount
        } else if (transaction.paymentMethod === "credit") {
          summary.creditCollection += transaction.amount
        }
      } else if (transaction.type === "withdrawal") {
        summary.totalWithdrawal += transaction.amount
      }
    })

    return summary
  }

  if (!selectedStore) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading store details...</Text>
      </View>
    )
  }

  const summary = calculateSummary()

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.storeName}>{selectedStore.name}</Title>
          <Paragraph style={styles.storeAddress}>{selectedStore.address}</Paragraph>

          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Current Balance:</Text>
            <Text
              style={[
                styles.balanceValue,
                selectedStore.currentBalance < 0 ? styles.negativeBalance : styles.positiveBalance,
              ]}
            >
              {formatCurrency(selectedStore.currentBalance)}
            </Text>
          </View>

          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Opening Balance:</Text>
            <Text style={styles.openingBalance}>{formatCurrency(selectedStore.openingBalance)}</Text>
          </View>
        </Card.Content>

        <Card.Actions style={styles.cardActions}>
          <Button onPress={handleAddTransaction} mode="contained">
            Add Transaction
          </Button>
          {currentUser?.role === "admin" && <Button onPress={handleEditStore}>Edit Store</Button>}
          <Button onPress={handleWithdraw} mode="outlined">
            Withdraw
          </Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Transaction Summary</Title>

          <View style={styles.filterContainer}>
            <Chip selected={dateFilter === "today"} onPress={() => applyDateFilter("today")} style={styles.filterChip}>
              Today
            </Chip>
            <Chip selected={dateFilter === "week"} onPress={() => applyDateFilter("week")} style={styles.filterChip}>
              This Week
            </Chip>
            <Chip selected={dateFilter === "month"} onPress={() => applyDateFilter("month")} style={styles.filterChip}>
              This Month
            </Chip>
            <Chip selected={dateFilter === "all"} onPress={() => applyDateFilter("all")} style={styles.filterChip}>
              All Time
            </Chip>
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Collection:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.totalCollection)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Withdrawal:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.totalWithdrawal)}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cash Collection:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.cashCollection)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>UPI Collection:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.upiCollection)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Credit Collection:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.creditCollection)}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Recent Transactions</Title>

          {loadingTransactions ? (
            <ActivityIndicator style={styles.transactionsLoading} />
          ) : transactions.length === 0 ? (
            <Text style={styles.noTransactions}>No transactions found for the selected period.</Text>
          ) : (
            transactions.slice(0, 5).map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.transactionType}>
                    {transaction.type === "collection" ? "Collection" : "Withdrawal"}
                  </Text>
                  <Text
                    style={[
                      styles.transactionAmount,
                      transaction.type === "collection" ? styles.positiveBalance : styles.negativeBalance,
                    ]}
                  >
                    {transaction.type === "collection" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>

                <View style={styles.transactionDetails}>
                  {transaction.type === "collection" && (
                    <Chip style={styles.paymentMethodChip}>{transaction.paymentMethod.toUpperCase()}</Chip>
                  )}
                  <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                </View>

                {transaction.remarks && <Text style={styles.transactionRemarks}>{transaction.remarks}</Text>}

                <Text style={styles.transactionUser}>By: {transaction.createdByName}</Text>

                <Divider style={styles.transactionDivider} />
              </View>
            ))
          )}

          <Button
            mode="text"
            onPress={() => navigation.navigate("TransactionList" as never, { storeId } as never)}
            style={styles.viewAllButton}
          >
            View All Transactions
          </Button>
        </Card.Content>
      </Card>

      <WithdrawDialog
        visible={withdrawDialogVisible}
        onDismiss={() => setWithdrawDialogVisible(false)}
        storeId={storeId}
        currentBalance={selectedStore.currentBalance}
        onWithdrawSuccess={onRefresh}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  card: {
    margin: 10,
    elevation: 2,
  },
  storeName: {
    fontSize: 22,
  },
  storeAddress: {
    fontSize: 16,
    marginBottom: 10,
  },
  balanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 16,
    marginRight: 5,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  openingBalance: {
    fontSize: 16,
    fontWeight: "bold",
  },
  positiveBalance: {
    color: "green",
  },
  negativeBalance: {
    color: "red",
  },
  cardActions: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: 10,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  summaryContainer: {
    marginTop: 10,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    marginVertical: 8,
  },
  transactionsLoading: {
    marginVertical: 20,
  },
  noTransactions: {
    textAlign: "center",
    marginVertical: 20,
    fontStyle: "italic",
  },
  transactionItem: {
    marginVertical: 8,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionType: {
    fontSize: 16,
    fontWeight: "bold",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  transactionDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  paymentMethodChip: {
    height: 24,
    marginRight: 8,
  },
  transactionDate: {
    fontSize: 14,
    color: "#666",
  },
  transactionRemarks: {
    marginTop: 4,
    fontSize: 14,
  },
  transactionUser: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  transactionDivider: {
    marginTop: 8,
  },
  viewAllButton: {
    marginTop: 10,
  },
})

export default StoreDetailScreen
