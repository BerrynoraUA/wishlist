import Link from "next/link";
import { getMcpConfig } from "@/mcp/config";
import { oauthSession } from "../session";
import { disconnectChatGPT } from "./actions";
import styles from "../oauth.module.scss";

export const metadata = { title: "Connected apps", robots: { index: false, follow: false } };

export default async function ConnectionsPage() {
  const { db } = await oauthSession("/oauth/connections");
  const { data, error } = await db.auth.oauth.listGrants();
  const grant = data?.find((value) => value.client.id === getMcpConfig().clientId);
  return (
    <main className={styles.page}>
      <span className={styles.brand}>Wishlane</span>
      <h1>Connected apps</h1>
      {error ? (
        <p>Unable to load connections. Please try again.</p>
      ) : grant ? (
        <>
          <h2>{grant.client.name}</h2>
          <p>Disconnecting prevents further Wishlane access through this connection.</p>
          <form action={disconnectChatGPT}>
            <button className={styles.primary}>Disconnect ChatGPT</button>
          </form>
        </>
      ) : (
        <p>ChatGPT is not connected to this Wishlane account.</p>
      )}
      <p>
        <Link href="/home">Back to Wishlane</Link>
      </p>
    </main>
  );
}
