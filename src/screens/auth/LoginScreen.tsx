"use client"

import { useState } from "react"
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { TextInput, Button, Text, HelperText } from "react-native-paper"
import { useAuth } from "../../contexts/AuthContext"
import { useNavigation } from "@react-navigation/native"

const LoginScreen = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { signIn } = useAuth()
  const navigation = useNavigation()

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required")
      return
    }

    setLoading(true)
    setError("")

    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: "https://placeholder.svg?height=100&width=100&query=medical+store+app+logo" }}
            style={styles.logo}
          />
          <Text style={styles.title}>Medical Store Manager</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          {error ? <HelperText type="error">{error}</HelperText> : null}

          <Button mode="contained" onPress={handleLogin} loading={loading} disabled={loading} style={styles.button}>
            Login
          </Button>

          <View style={styles.registerContainer}>
            <Text>Don't have an account? </Text>
            <Button mode="text" onPress={() => navigation.navigate("Register" as never)} disabled={loading}>
              Register
            </Button>
          </View>
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
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6200ee",
  },
  formContainer: {
    width: "100%",
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  registerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
})

export default LoginScreen
