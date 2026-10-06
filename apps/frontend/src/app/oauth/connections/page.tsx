import Link from "next/link";
import { getMcpConfig } from "@/mcp/config";
import { oauthSession } from "../session";
import { disconnectClient } from "./actions";
import styles from "../oauth.module.scss";

export const metadata = { title: "Connected apps", robots: { index: false, follow: false } };

export default async function ConnectionsPage() {
  const { db } = await oauthSession("/oauth/connections");
  const { data, error } = await db.auth.oauth.listGrants();
  const connected = getMcpConfig().clients.filter((client) =>
    data?.some((grant) => grant.client.id === client.id),
  );
  return (
    <main className={styles.page}>
      <span className={styles.brand}>Wishlane</span>
      <h1>Connected apps</h1>
      {error ? (
        <p>Unable to load connections. Please try again.</p>
      ) : connected.length ? (
        <>
          <p>Disconnecting prevents further Wishlane access through that connection.</p>
          {connected.map((client) => (
            <form key={client.id} action={disconnectClient}>
              <h2>{client.name}</h2>
              <input type="hidden" name="client_id" value={client.id} />
              <button className={styles.primary}>Disconnect {client.name}</button>
            </form>
          ))}
        </>
      ) : (
        <p>No AI assistants are connected to this Wishlane account.</p>
      )}
      <p>
        <Link href="/home">Back to Wishlane</Link>
      </p>
    </main>
  );
}
