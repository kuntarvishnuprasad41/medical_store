"use client"
import { createStackNavigator } from "@react-navigation/stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useAuth } from "../contexts/AuthContext"
import LoginScreen from "../screens/auth/LoginScreen"
import RegisterScreen from "../screens/auth/RegisterScreen"
import StoreListScreen from "../screens/stores/StoreListScreen"
import StoreDetailScreen from "../screens/stores/StoreDetailScreen"
import TransactionEntryScreen from "../screens/transactions/TransactionEntryScreen"
import TransactionListScreen from "../screens/transactions/TransactionListScreen"
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen"
import UserManagementScreen from "../screens/admin/UserManagementScreen"
import StoreManagementScreen from "../screens/admin/StoreManagementScreen"
import ReportsScreen from "../screens/reports/ReportsScreen"
import ProfileScreen from "../screens/profile/ProfileScreen"
import LoadingScreen from "../screens/common/LoadingScreen"
import { MaterialCommunityIcons } from "@expo/vector-icons"

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  )
}

const StoreStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="StoreList" component={StoreListScreen} options={{ title: "Stores" }} />
      <Stack.Screen name="StoreDetail" component={StoreDetailScreen} options={{ title: "Store Details" }} />
      <Stack.Screen name="TransactionEntry" component={TransactionEntryScreen} options={{ title: "New Transaction" }} />
    </Stack.Navigator>
  )
}

const TransactionStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TransactionList" component={TransactionListScreen} options={{ title: "Transactions" }} />
    </Stack.Navigator>
  )
}

const AdminStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: "Admin Dashboard" }} />
      <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ title: "Manage Users" }} />
      <Stack.Screen name="StoreManagement" component={StoreManagementScreen} options={{ title: "Manage Stores" }} />
    </Stack.Navigator>
  )
}

const ReportsStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
    </Stack.Navigator>
  )
}

const ProfileStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "My Profile" }} />
    </Stack.Navigator>
  )
}

const AdminTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#6200ee",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminStack}
        options={{
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="StoresTab"
        component={StoreStack}
        options={{
          tabBarLabel: "Stores",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="store" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionStack}
        options={{
          tabBarLabel: "Transactions",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cash-multiple" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsStack}
        options={{
          tabBarLabel: "Reports",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-bar" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  )
}

const EntryPersonTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#6200ee",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="StoresTab"
        component={StoreStack}
        options={{
          tabBarLabel: "Stores",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="store" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="TransactionsTab"
        component={TransactionStack}
        options={{
          tabBarLabel: "Transactions",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cash-multiple" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  )
}

const AppNavigator = () => {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!currentUser ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <Stack.Screen name="Main" component={currentUser.role === "admin" ? AdminTabs : EntryPersonTabs} />
      )}
    </Stack.Navigator>
  )
}

export default AppNavigator
