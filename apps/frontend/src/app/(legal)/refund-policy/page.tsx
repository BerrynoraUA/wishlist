import type { Metadata } from "next";
import { PolicyPage } from "../policy-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Wishlane refund and subscription cancellation policy.",
};

export default function RefundPolicyPage() {
  return (
    <PolicyPage
      title="Refund Policy"
      intro="This policy explains how refunds and cancellations work for paid Wishlane plans or paid features when they are available."
      sections={[
        {
          title: "Free Features",
          paragraphs: [
            "Wishlane offers free features that do not require a paid subscription. Free features do not create refund obligations because no payment is collected for them.",
          ],
        },
        {
          title: "Subscriptions",
          paragraphs: [
            "Paid subscriptions renew according to the billing interval shown at checkout. You can cancel a subscription to stop future renewals, but cancellation does not automatically refund previous charges.",
            "Access to paid features may continue until the end of the current paid billing period unless the payment provider or applicable law requires otherwise.",
          ],
        },
        {
          title: "Refund Requests",
          paragraphs: [
            "If you believe a charge was made in error, contact us with the email used for your Wishlane account, the charge date, and any payment-provider receipt or transaction reference.",
            "Refund requests are reviewed case by case. We may approve a refund for duplicate charges, accidental billing, technical issues that prevent access to paid features, or other circumstances we determine are fair.",
          ],
        },
        {
          title: "Payment Providers",
          paragraphs: [
            "Wishlane payments may be processed by third-party providers such as Paddle or an app marketplace. Some refunds must be requested through the provider that processed the purchase, and provider rules may control the final outcome.",
          ],
        },
        {
          title: "No Refund Scenarios",
          items: [
            "A subscription was active and available for use during the paid period.",
            "The request concerns a period that has already ended and was not affected by a verified billing or access issue.",
            "The account was suspended or limited because of misuse, abuse, or violation of the Terms of Service.",
          ],
        },
        {
          title: "Response Time",
          paragraphs: [
            "We aim to review refund requests promptly. Processing times after approval may vary depending on the payment provider, bank, card issuer, or marketplace involved.",
          ],
        },
      ]}
    />
  );
}
