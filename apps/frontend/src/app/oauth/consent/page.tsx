import Link from "next/link";
import { redirect } from "next/navigation";
import { findMcpClient } from "@/mcp/config";
import { oauthSession } from "../session";
import { ConsentForm } from "./consent-form";
import styles from "../oauth.module.scss";

export const metadata = {
  title: "Connect your AI assistant",
  robots: { index: false, follow: false },
};

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: authorizationId } = await searchParams;
  if (!authorizationId)
    return (
      <main className={styles.page}>
        <h1>Connect from your AI assistant</h1>
        <p>
          Start the Wishlane connection in ChatGPT or Claude to receive an authorization request.
        </p>
      </main>
    );
  const { db, user } = await oauthSession(
    `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`,
  );
  const { data, error } = await db.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data)
    return (
      <main className={styles.page}>
        <h1>Connection request expired</h1>
        <p>Return to your AI assistant and connect Wishlane again.</p>
      </main>
    );
  if ("redirect_url" in data) redirect(data.redirect_url);
  const client = findMcpClient(data.client.id);
  if (!client)
    return (
      <main className={styles.page}>
        <h1>Unknown connection</h1>
        <p>This request is not for a Wishlane AI integration.</p>
      </main>
    );
  return (
    <main className={styles.page}>
      <span className={styles.brand}>Wishlane</span>
      <h1>Bring your wishes to {client.name}</h1>
      <p>
        Connect <strong>{user.email}</strong> to <strong>{data.client.name}</strong>.
      </p>
      <p>{client.name} will be able to act with your Wishlane permissions:</p>
      <ul>
        <li>Read, create and edit wishlists and wishes, including images and product links.</li>
        <li>Reserve gifts, mark them bought, and manage sharing, friends and groups.</li>
        <li>Manage Secret Santa events and invitations, and read gifting notifications.</li>
      </ul>
      <p>
        Important changes, including deletion, sharing, invitations and Secret Santa draws, require
        your confirmation in a review card. This integration cannot manage billing, passwords or
        account deletion.
      </p>
      <p>
        Requested sign-in scope: <strong>{data.scope || "Account connection"}</strong>. Data access
        follows your Wishlane permissions.
      </p>
      <ConsentForm authorizationId={authorizationId} />
      <p className={styles.footer}>
        You can disconnect at any time from <Link href="/oauth/connections">connected apps</Link>.
        See our <Link href="/privacy-policy">privacy policy</Link> and{" "}
        <Link href="/terms-of-service">terms</Link>.
      </p>
    </main>
  );
}
