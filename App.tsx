import { NavigationContainer } from "@react-navigation/native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Provider as PaperProvider } from "react-native-paper"
import { AuthProvider } from "./src/contexts/AuthContext"
import { StoreProvider } from "./src/contexts/StoreContext"
import AppNavigator from "./src/navigation/AppNavigator"
import { initializeFirebase } from "./src/utils/firebase"

// Initialize Firebase
initializeFirebase()

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <StoreProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </StoreProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  )
}
