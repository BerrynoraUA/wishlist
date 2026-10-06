"use client";

import { useActionState } from "react";
import { decideConsent } from "./actions";
import styles from "../oauth.module.scss";

export function ConsentForm({ authorizationId }: { authorizationId: string }) {
  const [state, action, pending] = useActionState(decideConsent, { error: "" });
  return (
    <form action={action}>
      <input type="hidden" name="authorization_id" value={authorizationId} />
      {state.error && <p role="alert">{state.error}</p>}
      <div className={styles.actions}>
        <button name="decision" value="deny" disabled={pending}>
          Cancel
        </button>
        <button className={styles.primary} name="decision" value="approve" disabled={pending}>
          {pending ? "Connecting…" : "Connect Wishlane"}
        </button>
      </div>
    </form>
  );
}
