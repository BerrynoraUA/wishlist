"use client";

import { useGT } from "gt-next";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginWithEmail, loginWithGoogle, loginWithApple, loginWithFacebook, registerWithEmail } from "@/api/login";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t("Please enter a valid email address.", { $id: "login.form.error.invalidEmail" }));
      return;
    }

    if (password.length < 6) {
      setError(t("Password must be at least 6 characters.", { $id: "login.form.error.passwordTooShort" }));
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError(t("Passwords do not match.", { $id: "register.form.error.passwordMismatch" }));
        return;
      }
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

  const handleSocial = async (provider: "google" | "apple" | "facebook") => {
    setError(null);
    setSocialLoading(provider);

    try {
      if (provider === "google") await loginWithGoogle(redirectTo);
      else if (provider === "apple") await loginWithApple(redirectTo);
      else await loginWithFacebook(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("Social login failed", { $id: "login.form.error.social" }),
      );
      setSocialLoading(null);
    }
  };

  return (
    <div className={styles.card}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.label}>{t("Email", { $id: "login.form.label.email" })}<span className={styles.required}>*</span></label>
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
          {t("Password", { $id: "login.form.label.password" })}<span className={styles.required}>*</span>
        </label>
        <div className={styles.passwordWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder={t("••••••••", {
              $id: "login.form.placeholder.password",
            })}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {!isLogin && (
          <>
            <label className={styles.label}>
              {t("Confirm password", { $id: "register.form.label.confirmPassword" })}<span className={styles.required}>*</span>
            </label>
            <div className={styles.passwordWrapper}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t("••••••••", {
                  $id: "register.form.placeholder.confirmPassword",
                })}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          className={styles.submit}
          disabled={loading || !!socialLoading}
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

      <div className={styles.socialSection}>
        <div className={styles.divider}>
          <span>{t("or", { $id: "login.form.divider.or" })}</span>
        </div>

        <div className={styles.socialIcons}>
          <button
            type="button"
            className={styles.socialIcon}
            onClick={() => handleSocial("google")}
            disabled={!!socialLoading}
            aria-label="Continue with Google"
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </button>

          <button
            type="button"
            className={`${styles.socialIcon} ${styles.socialIconApple}`}
            onClick={() => handleSocial("apple")}
            disabled={!!socialLoading}
            aria-label="Continue with Apple"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
          </button>

          <button
            type="button"
            className={`${styles.socialIcon} ${styles.socialIconFacebook}`}
            onClick={() => handleSocial("facebook")}
            disabled={!!socialLoading}
            aria-label="Continue with Facebook"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
