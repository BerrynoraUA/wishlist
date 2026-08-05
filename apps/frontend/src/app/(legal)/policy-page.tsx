import Link from "next/link";
import styles from "./policy-page.module.scss";

type PolicySection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

type PolicyPageProps = {
  title: string;
  intro: string;
  sections: PolicySection[];
};

const LAST_UPDATED = "June 1, 2026";
const SUPPORT_EMAIL = "support@berrynora.com";

export function PolicyPage({ title, intro, sections }: PolicyPageProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>♡</span>
            Wishlane
          </Link>
          <Link href="/" className={styles.backLink}>
            Back to home
          </Link>
        </header>

        <article className={styles.document}>
          <p className={styles.eyebrow}>Last updated: {LAST_UPDATED}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.intro}>{intro}</p>

          {sections.map((section) => (
            <section key={section.title} className={styles.section}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
              {section.items && (
                <ul className={styles.list}>
                  {section.items.map((item) => (
                    <li key={item} className={styles.listItem}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <p className={styles.contact}>
            Questions about this policy? Contact us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        </article>
      </div>
    </main>
  );
}
