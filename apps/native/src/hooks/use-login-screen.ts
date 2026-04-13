import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import {
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
} from "@/api/login";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export function useLoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await registerWithEmail(email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
      router.replace("/");
    } catch (error: unknown) {
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [email, isSignUp, password]);

  const handleGoogleSignIn = useCallback(async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      router.replace("/");
    } catch (error: unknown) {
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  const toggleSignUp = useCallback(() => {
    setIsSignUp((v) => !v);
  }, []);

  return {
    isSignUp,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    googleLoading,
    handleSubmit,
    handleGoogleSignIn,
    toggleSignUp,
  };
}
