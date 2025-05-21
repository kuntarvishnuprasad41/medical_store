"use client"

import { useState, useEffect } from "react"
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native"
import { Card, Title, Paragraph, Button, Text, Divider, ActivityIndicator } from "react-native-paper"
import { useNavigation } from "@react-navigation/native"
import { useStore } from "../../contexts/StoreContext"
import { formatCurrency } from "../../utils/formatters"
import { collection, query, getDocs, where, Timestamp } from "firebase/firestore"
import { db } from "../../utils/firebase"

const AdminDashboardScreen = () => {
  const navigation = useNavigation()
  const { stores, loadingStores } = useStore()
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState({
    totalStores: 0,
    totalBalance: 0,
    todayCollection: 0,
    todayWithdrawal: 0,
    weekCollection: 0,
    weekWithdrawal: 0,
    monthCollection: 0,
    monthWithdrawal: 0,
    cashCollection: 0,
    upiCollection: 0,
    creditCollection: 0,
    loading: true,
  })

  useEffect(() => {
    loadDashboardData()
  }, [stores])

  const loadDashboardData = async () => {
    if (loadingStores) return

    setSummary((prev) => ({ ...prev, loading: true }))

    try {
      // Calculate total stores and balance
      const totalStores = stores.length
      const totalBalance = stores.reduce((sum, store) => sum + store.currentBalance, 0)

      // Get today's date at midnight
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayTimestamp = Timestamp.fromDate(today)

      // Get date 7 days ago
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 7)
      const weekAgoTimestamp = Timestamp.fromDate(weekAgo)

      // Get date 30 days ago
      const monthAgo = new Date(today)
      monthAgo.setDate(today.getDate() - 30)
      const monthAgoTimestamp = Timestamp.fromDate(monthAgo)

      // Query for today's transactions
      const todayQuery = query(collection(db, "transactions"), where("createdAt", ">=", todayTimestamp))

      // Query for this week's transactions
      const weekQuery = query(collection(db, "transactions"), where("createdAt", ">=", weekAgoTimestamp))

      // Query for this month's transactions
      const monthQuery = query(collection(db, "transactions"), where("createdAt", ">=", monthAgoTimestamp))

      // Execute queries
      const [todaySnapshot, weekSnapshot, monthSnapshot] = await Promise.all([
        getDocs(todayQuery),
        getDocs(weekQuery),
        getDocs(monthQuery),
      ])

      // Process today's transactions
      let todayCollection = 0
      let todayWithdrawal = 0

      todaySnapshot.forEach((doc) => {
        const transaction = doc.data()
        if (transaction.type === "collection") {
          todayCollection += transaction.amount
        } else if (transaction.type === "withdrawal") {
          todayWithdrawal += transaction.amount
        }
      })

      // Process this week's transactions
      let weekCollection = 0
      let weekWithdrawal = 0

      weekSnapshot.forEach((doc) => {
        const transaction = doc.data()
        if (transaction.type === "collection") {
          weekCollection += transaction.amount
        } else if (transaction.type === "withdrawal") {
          weekWithdrawal += transaction.amount
        }
      })

      // Process this month's transactions
      let monthCollection = 0
      let monthWithdrawal = 0
      let cashCollection = 0
      let upiCollection = 0
      let creditCollection = 0

      monthSnapshot.forEach((doc) => {
        const transaction = doc.data()
        if (transaction.type === "collection") {
          monthCollection += transaction.amount

          if (transaction.paymentMethod === "cash") {
            cashCollection += transaction.amount
          } else if (transaction.paymentMethod === "upi") {
            upiCollection += transaction.amount
          } else if (transaction.paymentMethod === "credit") {
            creditCollection += transaction.amount
          }
        } else if (transaction.type === "withdrawal") {
          monthWithdrawal += transaction.amount
        }
      })

      setSummary({
        totalStores,
        totalBalance,
        todayCollection,
        todayWithdrawal,
        weekCollection,
        weekWithdrawal,
        monthCollection,
        monthWithdrawal,
        cashCollection,
        upiCollection,
        creditCollection,
        loading: false,
      })
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      setSummary((prev) => ({ ...prev, loading: false }))
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  const navigateToStores = () => {
    navigation.navigate("StoresTab" as never)
  }

  const navigateToUsers = () => {
    navigation.navigate("UserManagement" as never)
  }

  const navigateToReports = () => {
    navigation.navigate("ReportsTab" as never)
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Admin Dashboard</Title>
        <Paragraph style={styles.headerSubtitle}>Overview of all stores and transactions</Paragraph>
      </View>

      <View style={styles.quickActions}>
        <Button mode="contained" icon="store" onPress={navigateToStores} style={styles.actionButton}>
          Manage Stores
        </Button>
        <Button mode="contained" icon="account-multiple" onPress={navigateToUsers} style={styles.actionButton}>
          Manage Users
        </Button>
        <Button mode="contained" icon="chart-bar" onPress={navigateToReports} style={styles.actionButton}>
          View Reports
        </Button>
      </View>

      {summary.loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading dashboard data...</Text>
        </View>
      ) : (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <Title>Overview</Title>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{summary.totalStores}</Text>
                  <Text style={styles.statLabel}>Total Stores</Text>
                </View>
                <View style={styles.statItem}>
                  <Text
                    style={[styles.statValue, summary.totalBalance < 0 ? styles.negativeValue : styles.positiveValue]}
                  >
                    {formatCurrency(summary.totalBalance)}
                  </Text>
                  <Text style={styles.statLabel}>Total Balance</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title>Today's Summary</Title>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Collections:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary.todayCollection)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Withdrawals:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary.todayWithdrawal)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Net:</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      summary.todayCollection - summary.todayWithdrawal < 0
                        ? styles.negativeValue
                        : styles.positiveValue,
                    ]}
                  >
                    {formatCurrency(summary.todayCollection - summary.todayWithdrawal)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title>This Week's Summary</Title>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Collections:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary.weekCollection)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Withdrawals:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary.weekWithdrawal)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Net:</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      summary.weekCollection - summary.weekWithdrawal < 0 ? styles.negativeValue : styles.positiveValue,
                    ]}
                  >
                    {formatCurrency(summary.weekCollection - summary.weekWithdrawal)}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title>This Month's Summary</Title>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Collections:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary.monthCollection)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Withdrawals:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(summary.monthWithdrawal)}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Net:</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      summary.monthCollection - summary.monthWithdrawal < 0
                        ? styles.negativeValue
                        : styles.positiveValue,
                    ]}
                  >
                    {formatCurrency(summary.monthCollection - summary.monthWithdrawal)}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <Title style={styles.paymentTitle}>Payment Methods</Title>
              <View style={styles.paymentContainer}>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Cash:</Text>
                  <Text style={styles.paymentValue}>{formatCurrency(summary.cashCollection)}</Text>
                  <Text style={styles.paymentPercentage}>
                    {summary.monthCollection > 0
                      ? `(${Math.round((summary.cashCollection / summary.monthCollection) * 100)}%)`
                      : "(0%)"}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>UPI:</Text>
                  <Text style={styles.paymentValue}>{formatCurrency(summary.upiCollection)}</Text>
                  <Text style={styles.paymentPercentage}>
                    {summary.monthCollection > 0
                      ? `(${Math.round((summary.upiCollection / summary.monthCollection) * 100)}%)`
                      : "(0%)"}
                  </Text>
                </View>
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Credit:</Text>
                  <Text style={styles.paymentValue}>{formatCurrency(summary.creditCollection)}</Text>
                  <Text style={styles.paymentPercentage}>
                    {summary.monthCollection > 0
                      ? `(${Math.round((summary.creditCollection / summary.monthCollection) * 100)}%)`
                      : "(0%)"}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "#6200ee",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
  },
  headerSubtitle: {
    color: "#fff",
    opacity: 0.8,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  card: {
    margin: 10,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
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
    marginVertical: 16,
  },
  paymentTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  paymentContainer: {
    marginTop: 10,
  },
  paymentItem: {
    flexDirection: "row",
    paddingVertical: 6,
  },
  paymentLabel: {
    fontSize: 16,
    width: 70,
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  paymentPercentage: {
    fontSize: 16,
    color: "#666",
  },
  positiveValue: {
    color: "green",
  },
  negativeValue: {
    color: "red",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
})

export default AdminDashboardScreen
