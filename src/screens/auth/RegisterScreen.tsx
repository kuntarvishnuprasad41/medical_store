"use client"

import { useState } from "react"
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { TextInput, Button, Text, HelperText, RadioButton } from "react-native-paper"
import { useAuth, type UserRole } from "../../contexts/AuthContext"
import { useNavigation } from "@react-navigation/native"

const RegisterScreen = () => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<UserRole>("entry_person")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { signUp } = useAuth()
  const navigation = useNavigation()

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("All fields are required")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)
    setError("")

    try {
      await signUp(email, password, name, role)
      // Registration successful, user will be automatically logged in
    } catch (err: any) {
      setError(err.message || "Failed to register")
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput label="Full Name" value={name} onChangeText={setName} mode="outlined" style={styles.input} />

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

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />

          <Text style={styles.roleLabel}>Select Role:</Text>
          <RadioButton.Group onValueChange={(value) => setRole(value as UserRole)} value={role}>
            <View style={styles.radioContainer}>
              <RadioButton.Item label="Admin" value="admin" />
              <RadioButton.Item label="Entry Person" value="entry_person" />
            </View>
          </RadioButton.Group>

          {error ? <HelperText type="error">{error}</HelperText> : null}

          <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading} style={styles.button}>
            Register
          </Button>

          <View style={styles.loginContainer}>
            <Text>Already have an account? </Text>
            <Button mode="text" onPress={() => navigation.navigate("Login" as never)} disabled={loading}>
              Login
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
    padding: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6200ee",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  formContainer: {
    width: "100%",
  },
  input: {
    marginBottom: 16,
  },
  roleLabel: {
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
  loginContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
})

export default RegisterScreen
