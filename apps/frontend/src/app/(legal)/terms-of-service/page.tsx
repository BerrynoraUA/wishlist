import type { Metadata } from "next";
import { PolicyPage } from "../policy-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms that govern your use of Wishlane.",
};

export default function TermsOfServicePage() {
  return (
    <PolicyPage
      title="Terms of Service"
      intro="These terms describe the rules for using Wishlane, including the web app, mobile app, browser extension, and related services."
      sections={[
        {
          title: "Using Wishlane",
          paragraphs: [
            "You may use Wishlane to create wishlists, save items, share lists, manage gift-related events, and connect with friends. You are responsible for the information you add and for keeping your account credentials secure.",
            "You must not use Wishlane to upload unlawful content, violate someone else's rights, abuse the service, interfere with security, or attempt to access accounts or data that are not yours.",
          ],
        },
        {
          title: "Accounts and Content",
          paragraphs: [
            "You retain ownership of the wishlist content you create. By adding content to Wishlane, you give us permission to host, process, display, and share it as needed to provide the service and honor the visibility settings you choose.",
            "If you share a wishlist or invite another person, that person may be able to view information associated with the shared content. Please review your list visibility before sharing.",
          ],
        },
        {
          title: "Subscriptions",
          paragraphs: [
            "Wishlane may offer paid plans or paid features. Prices, billing periods, and feature availability are shown at checkout or in the subscription page when subscriptions are enabled.",
            "Paid subscriptions renew automatically unless canceled according to the checkout provider's process. Canceling a subscription stops future renewals but does not automatically refund charges already processed.",
          ],
        },
        {
          title: "Third-Party Services",
          paragraphs: [
            "Wishlane may rely on third-party services for authentication, payments, analytics, hosting, data storage, or product extraction. Those services may process information according to their own terms and policies.",
            "Wishlane may include links to third-party stores or websites. We do not control those websites, their products, their prices, or their availability.",
          ],
        },
        {
          title: "Service Changes",
          paragraphs: [
            "We may update, suspend, or discontinue parts of Wishlane as the product evolves. We may also update these terms when needed. Continued use of Wishlane after changes means you accept the updated terms.",
          ],
        },
        {
          title: "Disclaimers and Liability",
          paragraphs: [
            "Wishlane is provided on an as-is and as-available basis. We work to keep the service reliable, but we do not guarantee uninterrupted access, exact product data, or that every external store can be parsed correctly.",
            "To the maximum extent permitted by law, Wishlane is not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.",
          ],
        },
      ]}
    />
  );
}
