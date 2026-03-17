import styles from "./SettingsTabs.module.scss";
import type { SettingsTab } from "@/types/settings";
import { SETTINGS_TABS } from "@/types/settings";

type Props = {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
};

export function SettingsTabs({ active, onChange }: Props) {
  return (
    <nav className={styles.tabs}>
      {SETTINGS_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`${styles.tab} ${active === tab.id ? styles.active : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
