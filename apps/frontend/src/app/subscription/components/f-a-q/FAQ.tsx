"use client";

import { useMemo, useState } from "react";
import { useGT } from "gt-next";
import { ChevronDown } from "lucide-react";
import styles from "./FAQ.module.scss";
import { PRICING } from "@/types/subscription";

type FaqItem = { key: string; question: string; answer: string };

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${styles.item} ${open ? styles.open : ""}`}>
      <button type="button" className={styles.question} onClick={() => setOpen((prev) => !prev)}>
        <span>{question}</span>
        <ChevronDown size={18} className={`${styles.chevron} ${open ? styles.rotated : ""}`} />
      </button>
      {open && (
        <div className={styles.answer}>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export function FAQ() {
  const t = useGT();

  const items = useMemo<FaqItem[]>(
    () => [
      {
        key: "cancel",
        question: t("Can I cancel my subscription anytime?", {
          $id: "subscription.faq.cancel.q",
        }),
        answer: t(
          "Yes! You can cancel at any time from your subscription page. You'll keep Pro access until the end of your current billing period.",
          { $id: "subscription.faq.cancel.a" },
        ),
      },
      {
        key: "downgrade",
        question: t("What happens to my data if I downgrade?", {
          $id: "subscription.faq.downgrade.q",
        }),
        answer: t(
          "Your wishlists and items are never deleted. If you exceed the free limits (5 wishlists, 20 items per wishlist), the extra ones become read-only — you can still view them but won't be able to edit or add new ones until you're within the limits or upgrade again.",
          { $id: "subscription.faq.downgrade.a" },
        ),
      },
      {
        key: "trial",
        question: t("Is there a free trial for Pro?", {
          $id: "subscription.faq.trial.q",
        }),
        answer: t(
          "We don't offer a trial, but the Free plan is fully functional for casual use. You can upgrade to Pro whenever you're ready for unlimited wishlists, sale alerts, and more.",
          { $id: "subscription.faq.trial.a" },
        ),
      },
      {
        key: "payment",
        question: t("What payment methods are accepted?", {
          $id: "subscription.faq.payment.q",
        }),
        answer: t(
          "We accept all major credit cards (Visa, Mastercard, American Express) and other methods through our payment provider. Your subscription will also work across our mobile app when it launches.",
          { $id: "subscription.faq.payment.a" },
        ),
      },
      {
        key: "yearly",
        question: t("How does yearly billing work?", {
          $id: "subscription.faq.yearly.q",
        }),
        answer: t(
          "When you choose yearly billing, you're charged {yearly} once per year instead of {monthly}/month — that's a {percent}% discount. You get all the same Pro features.",
          {
            yearly: `$${PRICING.yearly}`,
            monthly: `$${PRICING.monthly}`,
            percent: String(PRICING.yearlySavingsPercent),
            $id: "subscription.faq.yearly.a",
          },
        ),
      },
      {
        key: "refund",
        question: t("Do I get a refund if I'm not satisfied?", {
          $id: "subscription.faq.refund.q",
        }),
        answer: t(
          "If you're unhappy with Pro, contact us within your first 7 days and we'll issue a full refund. After that, you can cancel anytime and continue using Pro until the end of your billing period.",
          { $id: "subscription.faq.refund.a" },
        ),
      },
    ],
    [t],
  );

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>
        {t("Frequently Asked Questions", {
          $id: "subscription.faq.title",
        })}
      </h2>
      <div className={styles.list}>
        {items.map((item) => (
          <FAQItem key={item.key} question={item.question} answer={item.answer} />
        ))}
      </div>
    </div>
  );
}
