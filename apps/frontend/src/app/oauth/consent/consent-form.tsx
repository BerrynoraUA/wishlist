"use client";

import { useActionState } from "react";
import { useGT } from "gt-next";
import { Button } from "@/components/ui/Button/Button";
import { decideConsent, type ConsentError } from "./actions";
import styles from "../oauth.module.scss";

export function ConsentForm({ authorizationId }: { authorizationId: string }) {
  const t = useGT();
  const [state, action, pending] = useActionState(decideConsent, { error: null });
  const errors: Record<ConsentError, string> = {
    invalid: t("This request is invalid. Reconnect from your AI assistant.", {
      $id: "oauth.consent.error.invalid",
    }),
    expired: t("This request expired. Reconnect from your AI assistant.", {
      $id: "oauth.consent.error.expired",
    }),
    unknown: t("This request is not for a Wishlane AI integration.", {
      $id: "oauth.consent.unknownBody",
    }),
    failed: t("Unable to connect. Please try again.", { $id: "oauth.consent.error.failed" }),
  };
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="authorization_id" value={authorizationId} />
      {state.error && (
        <p className={styles.error} role="alert">
          {errors[state.error]}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" variant="secondary" name="decision" value="deny" disabled={pending}>
          {t("Cancel", { $id: "common.cancel" })}
        </Button>
        <Button type="submit" name="decision" value="approve" disabled={pending}>
          {pending
            ? t("Please wait...", { $id: "common.pleaseWait" })
            : t("Connect Wishlane", { $id: "oauth.consent.connect" })}
        </Button>
      </div>
    </form>
  );
}
