"use client"

import { useState, useEffect } from "react"
import { View, FlatList, StyleSheet, RefreshControl } from "react-native"
import {
  Card,
  Title,
  Button,
  Text,
  Chip,
  Divider,
  ActivityIndicator,
  Searchbar,
  Menu,
  IconButton,
  RadioButton,
} from "react-native-paper"
import { useRoute, useNavigation } from "@react-navigation/native"
import { useStore } from "../../contexts/StoreContext"
import { useAuth } from "../../contexts/AuthContext"
import { formatCurrency, formatDate } from "../../utils/formatters"
import DateTimePicker from "@react-native-community/datetimepicker"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"

const TransactionListScreen = () => {
  const route = useRoute()
  const navigation = useNavigation()
  const { storeId } = route.params as { storeId?: string }
  const { stores, transactions, loadingTransactions, getStoreTransactions, deleteTransaction } = useStore()
  const { currentUser } = useAuth()

  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMenuVisible, setFilterMenuVisible] = useState(false)
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "upi" | "credit">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "collection" | "withdrawal">("all")
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [selectedStore, setSelectedStore] = useState<string | null>(storeId || null)
  const [storeMenuVisible, setStoreMenuVisible] = useState(false)
  const [menuVisible, setMenuVisible] = useState<string | null>(null)

  useEffect(() => {
    loadTransactions()
  }, [selectedStore])

  const loadTransactions = async () => {
    if (selectedStore) {
      await getStoreTransactions(selectedStore, startDate || undefined, endDate || undefined)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadTransactions()
    setRefreshing(false)
  }

  const handleStartDateChange = (event, selectedDate?: Date) => {
    setShowStartDatePicker(false)
    if (selectedDate) {
      setStartDate(selectedDate)
    }
  }

  const handleEndDateChange = (event, selectedDate?: Date) => {
    setShowEndDatePicker(false)
    if (selectedDate) {
      setEndDate(selectedDate)
    }
  }

  const applyFilters = async () => {
    setRefreshing(true)
    await loadTransactions()
    setRefreshing(false)
  }

  const resetFilters = () => {
    setStartDate(null)
    setEndDate(null)
    setPaymentFilter("all")
    setTypeFilter("all")
    setSearchQuery("")
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      await deleteTransaction(transactionId)
      await loadTransactions()
    } catch (error) {
      console.error("Error deleting transaction:", error)
    }
  }

  const exportToCSV = async () => {
    if (!filteredTransactions.length) return

    const headers = "Date,Type,Amount,Payment Method,Remarks,Created By\n"
    const rows = filteredTransactions
      .map((t) => {
        return `"${formatDate(t.createdAt)}","${t.type}","${t.amount}","${t.paymentMethod}","${t.remarks}","${t.createdByName}"`
      })
      .join("\n")

    const csv = headers + rows
    const storeName = stores.find((s) => s.id === selectedStore)?.name || "transactions"
    const fileName = `${FileSystem.documentDirectory}${storeName}_transactions.csv`

    try {
      await FileSystem.writeAsStringAsync(fileName, csv)
      await Sharing.shareAsync(fileName)
    } catch (error) {
      console.error("Error exporting CSV:", error)
    }
  }

  const filteredTransactions = transactions.filter((transaction) => {
    // Apply payment method filter
    if (paymentFilter !== "all" && transaction.paymentMethod !== paymentFilter) {
      return false
    }

    // Apply transaction type filter
    if (typeFilter !== "all" && transaction.type !== typeFilter) {
      return false
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        transaction.remarks.toLowerCase().includes(query) ||
        transaction.createdByName.toLowerCase().includes(query) ||
        transaction.amount.toString().includes(query)
      )
    }

    return true
  })

  const renderTransactionItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.transactionHeader}>
          <View style={styles.typeAndDate}>
            <Text style={styles.transactionType}>{item.type === "collection" ? "Collection" : "Withdrawal"}</Text>
            <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <Text
            style={[
              styles.transactionAmount,
              item.type === "collection" ? styles.positiveAmount : styles.negativeAmount,
            ]}
          >
            {item.type === "collection" ? "+" : "-"}
            {formatCurrency(item.amount)}
          </Text>
        </View>

        <View style={styles.transactionDetails}>
          {item.type === "collection" && (
            <Chip style={styles.paymentMethodChip}>{item.paymentMethod.toUpperCase()}</Chip>
          )}
          <Text style={styles.transactionUser}>By: {item.createdByName}</Text>
        </View>

        {item.remarks && <Text style={styles.transactionRemarks}>{item.remarks}</Text>}
      </Card.Content>

      {(currentUser?.role === "admin" || currentUser?.uid === item.createdBy) && (
        <Card.Actions style={styles.cardActions}>
          <View style={styles.actionsContainer}>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={<IconButton icon="dots-vertical" onPress={() => setMenuVisible(item.id)} />}
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(null)
                  handleDeleteTransaction(item.id)
                }}
                title="Delete"
                icon="delete"
              />
            </Menu>
          </View>
        </Card.Actions>
      )}
    </Card>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search transactions"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <View style={styles.filterBar}>
          <Button
            mode="outlined"
            onPress={() => setFilterMenuVisible(true)}
            icon="filter-variant"
            style={styles.filterButton}
          >
            Filter
          </Button>

          {currentUser?.role === "admin" && (
            <Menu
              visible={storeMenuVisible}
              onDismiss={() => setStoreMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setStoreMenuVisible(true)}
                  icon="store"
                  style={styles.storeButton}
                >
                  {selectedStore
                    ? stores.find((s) => s.id === selectedStore)?.name.substring(0, 10) + "..."
                    : "Select Store"}
                </Button>
              }
            >
              {stores.map((store) => (
                <Menu.Item
                  key={store.id}
                  onPress={() => {
                    setSelectedStore(store.id)
                    setStoreMenuVisible(false)
                  }}
                  title={store.name}
                />
              ))}
            </Menu>
          )}

          <Button
            mode="outlined"
            onPress={exportToCSV}
            icon="file-export"
            style={styles.exportButton}
            disabled={filteredTransactions.length === 0}
          >
            Export
          </Button>
        </View>

        {(startDate || endDate || paymentFilter !== "all" || typeFilter !== "all") && (
          <View style={styles.activeFilters}>
            <Text style={styles.activeFiltersText}>Active filters:</Text>
            <View style={styles.filterChips}>
              {startDate && (
                <Chip onClose={() => setStartDate(null)} style={styles.filterChip}>
                  From: {formatDate(startDate)}
                </Chip>
              )}
              {endDate && (
                <Chip onClose={() => setEndDate(null)} style={styles.filterChip}>
                  To: {formatDate(endDate)}
                </Chip>
              )}
              {paymentFilter !== "all" && (
                <Chip onClose={() => setPaymentFilter("all")} style={styles.filterChip}>
                  {paymentFilter.toUpperCase()}
                </Chip>
              )}
              {typeFilter !== "all" && (
                <Chip onClose={() => setTypeFilter("all")} style={styles.filterChip}>
                  {typeFilter === "collection" ? "Collections" : "Withdrawals"}
                </Chip>
              )}
              <Button mode="text" onPress={resetFilters} style={styles.resetButton}>
                Reset All
              </Button>
            </View>
          </View>
        )}
      </View>

      <Menu
        visible={filterMenuVisible}
        onDismiss={() => setFilterMenuVisible(false)}
        style={styles.filterMenu}
        contentStyle={styles.filterMenuContent}
        anchor={{ x: 0, y: 0 }}
      >
        <Title style={styles.filterTitle}>Filter Transactions</Title>

        <Divider style={styles.filterDivider} />

        <Text style={styles.filterSectionTitle}>Date Range</Text>
        <View style={styles.dateButtons}>
          <Button mode="outlined" onPress={() => setShowStartDatePicker(true)} style={styles.dateButton}>
            {startDate ? formatDate(startDate) : "Start Date"}
          </Button>
          <Button mode="outlined" onPress={() => setShowEndDatePicker(true)} style={styles.dateButton}>
            {endDate ? formatDate(endDate) : "End Date"}
          </Button>
        </View>

        <Text style={styles.filterSectionTitle}>Payment Method</Text>
        <RadioButton.Group onValueChange={(value) => setPaymentFilter(value as any)} value={paymentFilter}>
          <View style={styles.radioRow}>
            <RadioButton.Item label="All" value="all" />
            <RadioButton.Item label="Cash" value="cash" />
          </View>
          <View style={styles.radioRow}>
            <RadioButton.Item label="UPI" value="upi" />
            <RadioButton.Item label="Credit" value="credit" />
          </View>
        </RadioButton.Group>

        <Text style={styles.filterSectionTitle}>Transaction Type</Text>
        <RadioButton.Group onValueChange={(value) => setTypeFilter(value as any)} value={typeFilter}>
          <View style={styles.radioRow}>
            <RadioButton.Item label="All" value="all" />
            <RadioButton.Item label="Collections" value="collection" />
            <RadioButton.Item label="Withdrawals" value="withdrawal" />
          </View>
        </RadioButton.Group>

        <View style={styles.filterActions}>
          <Button
            mode="outlined"
            onPress={() => {
              resetFilters()
              setFilterMenuVisible(false)
            }}
            style={styles.filterActionButton}
          >
            Reset
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              applyFilters()
              setFilterMenuVisible(false)
            }}
            style={styles.filterActionButton}
          >
            Apply Filters
          </Button>
        </View>
      </Menu>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker value={endDate || new Date()} mode="date" display="default" onChange={handleEndDateChange} />
      )}

      {loadingTransactions ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery || startDate || endDate || paymentFilter !== "all" || typeFilter !== "all"
              ? "No transactions match your filters"
              : "No transactions available"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    paddingBottom: 8,
    elevation: 2,
  },
  searchbar: {
    margin: 10,
    elevation: 0,
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  filterButton: {
    flex: 1,
    marginRight: 8,
  },
  storeButton: {
    flex: 1.5,
    marginRight: 8,
  },
  exportButton: {
    flex: 1,
  },
  activeFilters: {
    paddingHorizontal: 10,
  },
  activeFiltersText: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  resetButton: {
    marginBottom: 4,
  },
  filterMenu: {
    width: "100%",
  },
  filterMenuContent: {
    padding: 16,
  },
  filterTitle: {
    marginBottom: 8,
  },
  filterDivider: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 16,
  },
  dateButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  radioRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
  },
  filterActionButton: {
    marginLeft: 8,
  },
  listContent: {
    padding: 10,
  },
  card: {
    marginBottom: 10,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  typeAndDate: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: "bold",
  },
  transactionDate: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  positiveAmount: {
    color: "green",
  },
  negativeAmount: {
    color: "red",
  },
  transactionDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    flexWrap: "wrap",
  },
  paymentMethodChip: {
    marginRight: 8,
  },
  transactionUser: {
    fontSize: 14,
    color: "#666",
  },
  transactionRemarks: {
    marginTop: 8,
    fontSize: 14,
  },
  cardActions: {
    justifyContent: "flex-end",
  },
  actionsContainer: {
    flexDirection: "row",
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
})

export default TransactionListScreen
