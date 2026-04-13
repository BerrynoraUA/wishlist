import {
  Button,
  CircularProgressIndicator,
  Host,
  LazyColumn,
  OutlinedTextField,
  Row,
  Text,
} from "@expo/ui/jetpack-compose";
import { useLoginScreen } from "@/hooks/use-login-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const {
    isSignUp,
    setEmail,
    setPassword,
    loading,
    googleLoading,
    handleSubmit,
    handleGoogleSignIn,
    toggleSignUp,
  } = useLoginScreen();

  const busy = loading || googleLoading;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
      <Host style={{ flex: 1 }}>
        <LazyColumn
          verticalArrangement={{ spacedBy: 16 }}
          horizontalAlignment="center"
          contentPadding={{ top: 24, bottom: 32, start: 24, end: 24 }}
        >
          <Text>Wishlist</Text>
          <Text>{isSignUp ? "Create your account" : "Sign in to manage your wishlists"}</Text>

          <OutlinedTextField
            key={`email-${isSignUp}`}
            defaultValue=""
            onValueChange={setEmail}
            singleLine
            keyboardOptions={{
              keyboardType: "email",
              capitalization: "none",
            }}
          >
            <OutlinedTextField.Label>
              <Text>Email</Text>
            </OutlinedTextField.Label>
            <OutlinedTextField.Placeholder>
              <Text>you@example.com</Text>
            </OutlinedTextField.Placeholder>
          </OutlinedTextField>

          <OutlinedTextField
            key={`password-${isSignUp}`}
            defaultValue=""
            onValueChange={setPassword}
            singleLine
            keyboardOptions={{
              keyboardType: "password",
            }}
          >
            <OutlinedTextField.Label>
              <Text>Password</Text>
            </OutlinedTextField.Label>
            <OutlinedTextField.Placeholder>
              <Text>••••••••</Text>
            </OutlinedTextField.Placeholder>
          </OutlinedTextField>

          {loading ? (
            <Row horizontalArrangement={{ spacedBy: 8 }} verticalAlignment="center">
              <CircularProgressIndicator />
              <Text>{isSignUp ? "Signing up…" : "Signing in…"}</Text>
            </Row>
          ) : (
            <Button enabled={!busy} onClick={handleSubmit}>
              <Text>{isSignUp ? "Sign Up" : "Sign In"}</Text>
            </Button>
          )}

          <Text>or</Text>

          {googleLoading ? (
            <Row horizontalArrangement={{ spacedBy: 8 }} verticalAlignment="center">
              <CircularProgressIndicator />
              <Text>Connecting…</Text>
            </Row>
          ) : (
            <Button enabled={!busy} onClick={handleGoogleSignIn}>
              <Text>Continue with Google</Text>
            </Button>
          )}

          <Button enabled={!busy} onClick={toggleSignUp}>
            <Text>
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
            </Text>
          </Button>
        </LazyColumn>
      </Host>
    </SafeAreaView>
  );
}
