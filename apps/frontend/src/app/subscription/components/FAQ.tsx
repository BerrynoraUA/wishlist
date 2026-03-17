"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./FAQ.module.scss";

const ITEMS = [
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes! You can cancel at any time from your subscription page. You'll keep Pro access until the end of your current billing period.",
  },
  {
    question: "What happens to my data if I downgrade?",
    answer:
      "Your wishlists and items are never deleted. If you exceed the free limits (5 wishlists, 20 items per wishlist), the extra ones become read-only — you can still view them but won't be able to edit or add new ones until you're within the limits or upgrade again.",
  },
  {
    question: "Is there a free trial for Pro?",
    answer:
      "We don't offer a trial, but the Free plan is fully functional for casual use. You can upgrade to Pro whenever you're ready for unlimited wishlists, sale alerts, and more.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express) and other methods through our payment provider. Your subscription will also work across our mobile app when it launches.",
  },
  {
    question: "How does yearly billing work?",
    answer:
      "When you choose yearly billing, you're charged $30 once per year instead of $2.99/month — that's a 16% discount. You get all the same Pro features.",
  },
  {
    question: "Do I get a refund if I'm not satisfied?",
    answer:
      "If you're unhappy with Pro, contact us within your first 7 days and we'll issue a full refund. After that, you can cancel anytime and continue using Pro until the end of your billing period.",
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${styles.item} ${open ? styles.open : ""}`}>
      <button
        type="button"
        className={styles.question}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{question}</span>
        <ChevronDown
          size={18}
          className={`${styles.chevron} ${open ? styles.rotated : ""}`}
        />
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
  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Frequently Asked Questions</h2>
      <div className={styles.list}>
        {ITEMS.map((item) => (
          <FAQItem
            key={item.question}
            question={item.question}
            answer={item.answer}
          />
        ))}
      </div>
    </div>
  );
}
