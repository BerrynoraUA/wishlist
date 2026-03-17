"use client";

import { useState } from "react";
import { Chrome } from "lucide-react";
import {
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
} from "@/api/login";
import styles from "./AuthForm.module.scss";

type Props = {
  mode: "login" | "register";
  redirectTo: string;
  onLoginSuccess: (target: string) => void;
};

export function AuthForm({ mode, redirectTo, onLoginSuccess }: Props) {
  const isLogin = mode === "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        onLoginSuccess(redirectTo);
      } else {
        await registerWithEmail(email, password);
        setNotice("Account created. Check your inbox to confirm your email.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setGoogleLoading(true);

    try {
      await loginWithGoogle(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed");
      setGoogleLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <button
        type="button"
        className={styles.googleButton}
        onClick={handleGoogle}
        disabled={googleLoading}
      >
        <Chrome size={16} />
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </button>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>Email</label>
        <input
          type="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />

        <label className={styles.label}>Password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
        />

        {error && <p className={styles.error}>{error}</p>}
        {notice && <p className={styles.notice}>{notice}</p>}

        <button
          type="submit"
          className={styles.submit}
          disabled={loading || googleLoading}
        >
          {loading
            ? isLogin
              ? "Signing in..."
              : "Creating account..."
            : isLogin
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <p className={styles.helper}>
        {isLogin
          ? "New here? Choose Register above to create an account."
          : "Already have an account? Switch back to Login."}
      </p>
    </div>
  );
}
