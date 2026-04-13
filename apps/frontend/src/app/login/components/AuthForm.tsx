"use client";

import { useGT } from "gt-next";
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
  const t = useGT();
  const isLogin = mode === "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(
        t("Email and password are required.", {
          $id: "login.form.error.required",
        }),
      );
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }

      onLoginSuccess(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("Something went wrong", { $id: "login.form.error.generic" }),
      );
    } finally {
      setLoading(false);
    }
  }

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      await loginWithGoogle(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("Google login failed", { $id: "login.form.error.google" }),
      );
      setGoogleLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>
          {t("Email", { $id: "login.form.label.email" })}
        </label>
        <input
          type="email"
          placeholder={t("you@email.com", {
            $id: "login.form.placeholder.email",
          })}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
        />

        <label className={styles.label}>
          {t("Password", { $id: "login.form.label.password" })}
        </label>
        <input
          type="password"
          placeholder={t("••••••••", {
            $id: "login.form.placeholder.password",
          })}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          className={styles.submit}
          disabled={loading || googleLoading}
        >
          {loading
            ? isLogin
              ? t("Signing in...", { $id: "login.form.submit.signingIn" })
              : t("Creating account...", {
                  $id: "login.form.submit.creatingAccount",
                })
            : isLogin
              ? t("Sign in", { $id: "login.form.submit.signIn" })
              : t("Create account", { $id: "login.form.submit.createAccount" })}
        </button>
      </form>

      <p className={styles.helper}>
        {isLogin
          ? t("New here? Choose Register above to create an account.", {
              $id: "login.form.helper.register",
            })
          : t("Already have an account? Switch back to Login.", {
              $id: "login.form.helper.login",
            })}
      </p>

      <div className={styles.googleSection}>
        <div className={styles.divider}>
          <span>{t("or", { $id: "login.form.divider.or" })}</span>
        </div>

        <button
          type="button"
          className={styles.googleButton}
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          <Chrome size={16} />
          {googleLoading
            ? t("Redirecting...", { $id: "login.form.google.redirecting" })
            : t("Continue with Google", { $id: "login.form.google.continue" })}
        </button>
      </div>
    </div>
  );
}
