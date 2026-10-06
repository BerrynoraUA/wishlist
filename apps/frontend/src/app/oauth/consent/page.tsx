import Link from "next/link";
import { redirect } from "next/navigation";
import { getGT } from "gt-next/server";
import { Gift, Lock, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { Eyebrow, Heading, Text } from "@/components/ui/Typography";
import { findMcpClient } from "@/mcp/config";
import { oauthSession } from "../session";
import { ConsentForm } from "./consent-form";
import styles from "../oauth.module.scss";

export const metadata = {
  title: "Connect your AI assistant",
  robots: { index: false, follow: false },
};

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className={styles.page}>
      <Heading level={1}>{title}</Heading>
      <Text tone="muted">{body}</Text>
    </main>
  );
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const t = await getGT();
  const { authorization_id: authorizationId } = await searchParams;
  if (!authorizationId)
    return (
      <Message
        title={t("Connect from your AI assistant", { $id: "oauth.consent.startTitle" })}
        body={t(
          "Start the Wishlane connection in ChatGPT or Claude to receive an authorization request.",
          { $id: "oauth.consent.startBody" },
        )}
      />
    );
  const { db, user } = await oauthSession(
    `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`,
  );
  const { data, error } = await db.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data)
    return (
      <Message
        title={t("Connection request expired", { $id: "oauth.consent.expiredTitle" })}
        body={t("Return to your AI assistant and connect Wishlane again.", {
          $id: "oauth.consent.expiredBody",
        })}
      />
    );
  if ("redirect_url" in data) redirect(data.redirect_url);
  const client = findMcpClient(data.client.id);
  if (!client)
    return (
      <Message
        title={t("Unknown connection", { $id: "oauth.consent.unknownTitle" })}
        body={t("This request is not for a Wishlane AI integration.", {
          $id: "oauth.consent.unknownBody",
        })}
      />
    );

  const assistant = client.name;
  const permissions: { icon: LucideIcon; text: string }[] = [
    {
      icon: Gift,
      text: t("View, create and edit your wishlists and items, including images and links.", {
        $id: "oauth.consent.permissionWishlists",
      }),
    },
    {
      icon: Lock,
      text: t("Reserve gifts, mark them as purchased and manage who can see your wishlists.", {
        $id: "oauth.consent.permissionGifting",
      }),
    },
    {
      icon: Users,
      text: t("Manage friends, groups, Secret Santa events and notifications.", {
        $id: "oauth.consent.permissionSocial",
      }),
    },
  ];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo} aria-hidden="true">
          <Gift size={22} />
        </span>
        <Eyebrow tone="brand">
          {t("Connect {assistant}", { assistant, $id: "oauth.consent.eyebrow" })}
        </Eyebrow>
        <Heading level={1}>
          {t("Use Wishlane in {assistant}", { assistant, $id: "oauth.consent.title" })}
        </Heading>
        <Text tone="muted">
          {t("{assistant} will act as {email}, with the same access you have in Wishlane.", {
            assistant,
            email: user.email ?? "",
            $id: "oauth.consent.subtitle",
          })}
        </Text>
      </header>

      <ul className={styles.permissions}>
        {permissions.map(({ icon: Icon, text }) => (
          <li key={text} className={styles.permission}>
            <span className={styles.permissionIcon} aria-hidden="true">
              <Icon size={16} />
            </span>
            <Text>{text}</Text>
          </li>
        ))}
      </ul>

      <div className={styles.notice}>
        <ShieldCheck size={18} aria-hidden="true" />
        <Text variant="caption" tone="muted">
          {t(
            "You confirm important changes, such as deleting, sharing, inviting or launching Secret Santa, in {assistant} before they happen. {assistant} can't manage your subscription, password or account.",
            { assistant, $id: "oauth.consent.notice" },
          )}
        </Text>
      </div>

      <ConsentForm authorizationId={authorizationId} />

      <Text variant="caption" tone="muted" className={styles.footer}>
        {t("You can disconnect at any time from", { $id: "oauth.consent.disconnectPrefix" })}{" "}
        <Link href="/oauth/connections">
          {t("Connected apps", { $id: "oauth.connections.title" })}
        </Link>
        {" · "}
        <Link href="/privacy-policy">{t("Privacy policy", { $id: "oauth.consent.privacy" })}</Link>
        {" · "}
        <Link href="/terms-of-service">{t("Terms", { $id: "oauth.consent.terms" })}</Link>
      </Text>
    </main>
  );
}
