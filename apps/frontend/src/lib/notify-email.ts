import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

const DEFAULT_RECIPIENT = "artemhushan0@gmail.com";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  return transporter;
}

/**
 * Best-effort email send. Never throws into the request path — logs and
 * resolves so scraping/recording is never blocked by mail failures.
 */
export async function sendEmail(subject: string, html: string): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    console.warn("[notify-email] SMTP env not configured, skipping email:", subject);
    return;
  }

  const to = process.env.ADMIN_NOTIFY_EMAIL ?? DEFAULT_RECIPIENT;
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? DEFAULT_RECIPIENT;

  try {
    await tx.sendMail({ from, to, subject, html });
  } catch (error) {
    console.error("[notify-email] Failed to send email:", error);
  }
}

interface UnresolvedAlertInput {
  domain: string;
  url: string;
  status: string;
  requestCount: number;
  author: string | null;
  isNew: boolean;
}

export async function sendUnresolvedAlert(input: UnresolvedAlertInput): Promise<void> {
  const { domain, url, status, requestCount, author, isNew } = input;

  const reason = isNew
    ? `A new site was added to unresolved scraper sites`
    : `An unresolved site reached ${requestCount} requests`;

  const subject = isNew
    ? `[Scraper] New unresolved site: ${domain}`
    : `[Scraper] ${domain} reached ${requestCount} requests`;

  const html = `
    <h2>${reason}</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tr><td><strong>Domain</strong></td><td>${escapeHtml(domain)}</td></tr>
      <tr><td><strong>URL</strong></td><td><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></td></tr>
      <tr><td><strong>Status</strong></td><td>${escapeHtml(status)}</td></tr>
      <tr><td><strong>Request count</strong></td><td>${requestCount}</td></tr>
      <tr><td><strong>Author</strong></td><td>${escapeHtml(author ?? "unknown")}</td></tr>
    </table>
  `;

  await sendEmail(subject, html);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
