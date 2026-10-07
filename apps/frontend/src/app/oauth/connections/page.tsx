import Link from "next/link";
import { getGT } from "gt-next/server";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text } from "@/components/ui/Typography";
import { getMcpConfig } from "@/mcp/config";
import { oauthSession } from "../session";
import { disconnectClient } from "./actions";
import styles from "../oauth.module.scss";

export const metadata = { title: "Connected apps", robots: { index: false, follow: false } };

export default async function ConnectionsPage() {
  const t = await getGT();
  const { db } = await oauthSession("/oauth/connections");
  const { data, error } = await db.auth.oauth.listGrants();
  const connected = getMcpConfig().clients.filter((client) =>
    data?.some((grant) => grant.client.id === client.id),
  );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Heading level={1}>{t("Connected apps", { $id: "oauth.connections.title" })}</Heading>
        <Text tone="muted">
          {t("AI assistants that can use your Wishlane account.", {
            $id: "oauth.connections.subtitle",
          })}
        </Text>
      </header>
      {error ? (
        <p className={styles.error} role="alert">
          {t("Unable to load connections. Please try again.", {
            $id: "oauth.connections.loadError",
          })}
        </p>
      ) : connected.length ? (
        <ul className={styles.connections}>
          {connected.map((client) => (
            <li key={client.id} className={styles.connection}>
              <Text as="span" variant="subtitle">
                {client.name}
              </Text>
              <form action={disconnectClient}>
                <input type="hidden" name="client_id" value={client.id} />
                <Button type="submit" variant="danger" size="sm">
                  {t("Disconnect", { $id: "oauth.connections.disconnect" })}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <Text tone="muted">
          {t("No AI assistants are connected.", { $id: "oauth.connections.empty" })}
        </Text>
      )}
      <Text variant="caption" tone="muted" className={styles.footer}>
        <Link href="/home">{t("Back to My Wishlists", { $id: "oauth.connections.back" })}</Link>
      </Text>
    </main>
  );
}
