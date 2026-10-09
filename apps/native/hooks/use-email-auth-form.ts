import { loginWithEmail, registerWithEmail } from "@/api/login";
import { hapticError, hapticSuccess } from "@/lib/haptics";
import { useGT } from "gt-react-native";
import { useRef } from "react";
import { useForm, type FieldErrors } from "react-hook-form";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 6;

type EmailAuthFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export function useEmailAuthForm(isLogin: boolean) {
  const t = useGT();
  const submitting = useRef(false);
  const form = useForm<EmailAuthFormValues>({
    defaultValues: { email: "", password: "", confirmPassword: "" },
    reValidateMode: "onSubmit",
    resolver: (values) => {
      const errors: FieldErrors<EmailAuthFormValues> = {};
      const email = values.email.trim();
      if (!email || !emailRegex.test(email)) {
        errors.email = {
          type: "validate",
          message: !email ? t("Enter your email.") : t("Please enter a valid email address."),
        };
      } else if (values.password.length < MIN_PASSWORD_LENGTH) {
        errors.password = {
          type: "validate",
          message: !values.password
            ? t("Enter your password.")
            : t("Password must be at least 6 characters."),
        };
      } else if (!isLogin && values.password !== values.confirmPassword) {
        errors.confirmPassword = { type: "validate", message: t("Passwords do not match.") };
      }
      return { values: Object.keys(errors).length ? {} : values, errors };
    },
  });

  async function submit() {
    // Lock before validation awaits: keyboard and button submissions share this path.
    if (submitting.current) return;
    submitting.current = true;
    try {
      await form.handleSubmit(async (values) => {
        try {
          const authenticate = isLogin ? loginWithEmail : registerWithEmail;
          await authenticate(values.email.trim(), values.password);
          hapticSuccess();
        } catch (error) {
          hapticError();
          form.setError("root.server", {
            type: "server",
            message: error instanceof Error ? error.message : t("Something went wrong"),
          });
        }
      }, hapticError)();
    } finally {
      submitting.current = false;
    }
  }

  return { ...form, submit };
}
