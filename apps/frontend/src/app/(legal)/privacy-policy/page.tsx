import type { Metadata } from "next";
import { PolicyPage } from "../policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Wishlane collects, uses, and protects personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      intro="This policy explains how Wishlane handles personal information when you use our website, web app, mobile app, browser extension, and related services. We wrote it to be specific about what we collect, why we use it, who helps us process it, and the choices you have."
      sections={[
        {
          title: "Who Is Responsible",
          paragraphs: [
            "Wishlane is responsible for the personal information we process in connection with the service. If you have privacy questions, want to exercise your rights, or want help deleting account data, contact us using the email address at the bottom of this policy.",
            "If you use a third-party service through Wishlane, such as an authentication provider, payment provider, app marketplace, or external store link, that third party may also process your information under its own privacy policy.",
          ],
        },
        {
          title: "Information You Provide",
          items: [
            "Account details, including email address, authentication provider, display name, nickname, avatar, bio, height, shoe size, language, currency, theme, notification preferences, and other profile settings you choose to save.",
            "Wishlist and item details, including wishlist names, descriptions, event dates, visibility settings, item names, links, prices, currencies, images, notes, colors, priorities, votes, reservations, and purchased or reserved status.",
            "Friends and sharing details, including friend requests, accepted friend relationships, friend groups, wishlist access grants, invitation links, public share tokens, and messages or status information connected to sharing flows.",
            "Secret Santa and gift-planning details, including event names, participants, gift preferences, budgets, dates, assignments, and related wishlist or profile information you choose to include.",
            "Support and feedback content, including feature ideas, survey-like feedback, bug reports, support messages, and any files or screenshots you send to us.",
          ],
        },
        {
          title: "Information Collected Automatically",
          items: [
            "Authentication and session information needed to keep you signed in and protect your account.",
            "Device, browser, app, page, and usage events, such as pages viewed, actions taken, feature usage, diagnostics, and product analytics when analytics are configured.",
            "Cookie and local-storage information used for login sessions, redirect flows, theme preferences, accent color, language, dismissed banners, known accounts on your device, and other app preferences.",
            "Technical information from requests to our services, such as IP address, timestamps, user agent, route, error data, and security or performance logs.",
          ],
        },
        {
          title: "Product Extraction and Browser Extension",
          paragraphs: [
            "When you ask Wishlane to save or inspect a product link, we process the product URL and product metadata, such as title, image, price, currency, description, availability, and store-specific information. We use this to prefill item details, keep wishlist items useful, and improve extraction quality.",
            "The Wishlane browser extension reads product information from the active page only when you use the extension to save or inspect a product. It does not collect your full browsing history, personal files, or unrelated tabs.",
          ],
        },
        {
          title: "How We Use Information",
          items: [
            "To create, authenticate, maintain, and secure your account.",
            "To provide wishlist, item, friend, sharing, discovery, notification, Secret Santa, account-switching, and settings features.",
            "To show shared wishlists to the people you choose, apply visibility settings, manage reservations, and prevent duplicate or conflicting gift actions.",
            "To process product URLs, upload and display images, format prices and currencies, and keep product information easier to manage.",
            "To provide subscriptions, paid-feature access, checkout, renewal status, cancellation handling, and payment-provider syncing when paid features are enabled.",
            "To send service messages, in-app notifications, support replies, account notices, and security-related communications.",
            "To understand whether core flows work, fix bugs, measure product usage, improve performance, prevent abuse, and develop better features.",
            "To comply with legal obligations, enforce our terms, resolve disputes, and establish, exercise, or defend legal claims.",
          ],
        },
        {
          title: "Legal Bases Where GDPR Applies",
          paragraphs: [
            "Where the GDPR or similar laws apply, we process personal information under one or more legal bases depending on the context.",
          ],
          items: [
            "Contract: to create your account and provide the Wishlane features you request.",
            "Legitimate interests: to secure, improve, debug, measure, and operate the service; prevent misuse; respond to support requests; and maintain useful product information.",
            "Consent: where we ask for optional permissions or consent, such as certain cookies, analytics choices, marketing communications, or OAuth sign-in flows where applicable.",
            "Legal obligation and legal claims: where processing is necessary to comply with law or protect our legal rights.",
          ],
        },
        {
          title: "Sharing and Visibility",
          paragraphs: [
            "Wishlane is designed for sharing. Depending on your visibility settings and actions, wishlist content may be visible to friends, friend groups, recipients of invitation links, users who have a public share link, Secret Santa participants, or people viewing public discovery surfaces.",
            "You are responsible for choosing visibility settings that match what you want to share. If you include another person's information in a wishlist, event, group, or invitation, you should make sure you have a suitable reason to do so and that the person understands how the information may be used.",
          ],
        },
        {
          title: "Service Providers and Recipients",
          paragraphs: [
            "We use trusted service providers to run Wishlane. These providers may process personal information only as needed to provide services to us or to you.",
          ],
          items: [
            "Supabase for authentication, database, storage, and related backend infrastructure.",
            "PostHog for product analytics, page-view measurement, diagnostics, and product improvement when configured.",
            "Paddle and RevenueCat for checkout, subscription status, billing events, and paid-feature access when subscriptions are enabled.",
            "Hosting, security, email, image, product-extraction, and app-platform providers that help us operate and deliver the service.",
          ],
        },
        {
          title: "Payments",
          paragraphs: [
            "When paid features are available, payment details are handled by third-party payment providers. We do not store full card numbers. We may store subscription plan, billing status, renewal or expiration status, provider customer identifiers, transaction metadata, and account identifiers needed to connect your payment status to your Wishlane account.",
          ],
        },
        {
          title: "Analytics, Cookies, and Local Storage",
          paragraphs: [
            "Wishlane uses cookies and similar technologies for necessary functions such as login sessions, auth redirects, theme settings, localization, account switching, and dismissed interface notices. We may also use analytics tools to understand page views and product usage when configured.",
            "You can manage browser cookies through your browser settings. Removing cookies or local storage may affect login sessions, saved preferences, known-account switching, and other app behavior.",
          ],
        },
        {
          title: "International Transfers",
          paragraphs: [
            "Wishlane and our service providers may process information in countries other than where you live. Where required, we rely on appropriate safeguards such as contractual commitments, data processing agreements, adequacy decisions, or other lawful transfer mechanisms.",
          ],
        },
        {
          title: "Retention and Deletion",
          paragraphs: [
            "We keep personal information for as long as needed to provide Wishlane, maintain your account, support shared wishlist features, comply with legal obligations, resolve disputes, prevent abuse, and enforce our terms.",
            "If you delete your account, we aim to delete or anonymize personal information associated with your account unless we need to keep limited information for security, legal, payment, accounting, backup, or dispute-resolution purposes. Shared content may remain visible for a limited time where needed to complete deletion, preserve another user's legitimate activity, or maintain audit and security records.",
          ],
        },
        {
          title: "Children",
          paragraphs: [
            "Wishlane is not intended for children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided personal information to us without appropriate consent, contact us and we will take appropriate steps to delete it.",
            "Wishlane does not currently offer dedicated kids accounts or child-directed advertising features.",
          ],
        },
        {
          title: "Your Choices and Rights",
          paragraphs: [
            "Depending on where you live, you may have rights to access, correct, delete, restrict, object to, or receive a copy of certain personal information. You may also have the right to withdraw consent where processing is based on consent.",
          ],
          items: [
            "Update your profile, wishlist visibility, notification preferences, language, currency, theme, and account settings in the app.",
            "Delete items, wishlists, avatars, friend relationships, friend groups, saved accounts, and notifications using available controls.",
            "Cancel paid subscriptions through the payment provider, marketplace, or subscription controls made available to you.",
            "Contact us to request access, correction, deletion, portability, restriction, objection, withdrawal of consent, or help with privacy questions.",
          ],
        },
        {
          title: "Data Security",
          paragraphs: [
            "We use reasonable technical and organizational measures to protect personal information, including encrypted transport, access controls, trusted infrastructure providers, and security-focused operational practices. No online service can guarantee perfect security, so you should keep your login credentials private and use a secure authentication method.",
          ],
        },
        {
          title: "Changes to This Policy",
          paragraphs: [
            "We may update this policy as Wishlane changes or as legal, operational, or security requirements evolve. The current version is the one posted on this page, and the last-updated date shows when it was most recently revised.",
          ],
        },
      ]}
    />
  );
}
