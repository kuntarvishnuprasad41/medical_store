"use client"

import { useState } from "react"
import { View, FlatList, StyleSheet, RefreshControl } from "react-native"
import { Card, Title, Paragraph, Button, FAB, Text, ActivityIndicator, Searchbar } from "react-native-paper"
import { useNavigation } from "@react-navigation/native"
import { useStore } from "../../contexts/StoreContext"
import { useAuth } from "../../contexts/AuthContext"
import { formatCurrency } from "../../utils/formatters"

const StoreListScreen = () => {
  const { stores, loadingStores, selectStore } = useStore()
  const { currentUser } = useAuth()
  const navigation = useNavigation()
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const onRefresh = async () => {
    setRefreshing(true)
    // The stores are automatically refreshed by the context
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleStorePress = async (storeId: string) => {
    await selectStore(storeId)
    navigation.navigate("StoreDetail" as never, { storeId } as never)
  }

  const handleAddTransaction = (storeId: string) => {
    navigation.navigate("TransactionEntry" as never, { storeId } as never)
  }

  const handleAddStore = () => {
    navigation.navigate("StoreManagement" as never, { mode: "create" } as never)
  }

  const renderStoreItem = ({ item }) => (
    <Card style={styles.card} onPress={() => handleStorePress(item.id)}>
      <Card.Content>
        <Title>{item.name}</Title>
        <Paragraph>{item.address}</Paragraph>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Current Balance:</Text>
          <Text
            style={[styles.balanceValue, item.currentBalance < 0 ? styles.negativeBalance : styles.positiveBalance]}
          >
            {formatCurrency(item.currentBalance)}
          </Text>
        </View>
      </Card.Content>
      <Card.Actions>
        <Button onPress={() => handleStorePress(item.id)}>Details</Button>
        <Button mode="contained" onPress={() => handleAddTransaction(item.id)}>
          Add Transaction
        </Button>
      </Card.Actions>
    </Card>
  )

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search stores"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {loadingStores ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading stores...</Text>
        </View>
      ) : filteredStores.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{searchQuery ? "No stores match your search" : "No stores available"}</Text>
          {currentUser?.role === "admin" && (
            <Button mode="contained" onPress={handleAddStore} style={styles.addButton}>
              Add Store
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredStores}
          renderItem={renderStoreItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {currentUser?.role === "admin" && <FAB style={styles.fab} icon="plus" onPress={handleAddStore} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  searchbar: {
    margin: 10,
    elevation: 2,
  },
  listContent: {
    padding: 10,
  },
  card: {
    marginBottom: 10,
    elevation: 2,
  },
  balanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  balanceLabel: {
    fontSize: 16,
    marginRight: 5,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  positiveBalance: {
    color: "green",
  },
  negativeBalance: {
    color: "red",
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
    marginBottom: 20,
  },
  addButton: {
    marginTop: 10,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: "#6200ee",
  },
})

export default StoreListScreen
