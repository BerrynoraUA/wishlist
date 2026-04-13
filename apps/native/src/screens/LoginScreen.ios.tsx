import {
  Button,
  Host,
  HStack,
  ProgressView,
  ScrollView,
  SecureField,
  Text,
  TextField,
  VStack,
} from "@expo/ui/swift-ui";
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
        <ScrollView>
          <VStack spacing={20} alignment="center">
            <Text>Wishlist</Text>
            <Text>{isSignUp ? "Create your account" : "Sign in to manage your wishlists"}</Text>

            <TextField
              key={`email-${isSignUp}`}
              placeholder="you@example.com"
              defaultValue=""
              onValueChange={setEmail}
            />

            <SecureField
              key={`password-${isSignUp}`}
              placeholder="Password"
              defaultValue=""
              onValueChange={setPassword}
            />

            {loading ? (
              <HStack spacing={8}>
                <ProgressView />
                <Text>{isSignUp ? "Signing up…" : "Signing in…"}</Text>
              </HStack>
            ) : (
              <Button
                onPress={busy ? undefined : handleSubmit}
                label={isSignUp ? "Sign Up" : "Sign In"}
              />
            )}

            <Text>or</Text>

            {googleLoading ? (
              <HStack spacing={8}>
                <ProgressView />
                <Text>Connecting…</Text>
              </HStack>
            ) : (
              <Button
                onPress={busy ? undefined : handleGoogleSignIn}
                label="Continue with Google"
              />
            )}

            <Button
              onPress={busy ? undefined : toggleSignUp}
              label={
                isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"
              }
            />
          </VStack>
        </ScrollView>
      </Host>
    </SafeAreaView>
  );
}
