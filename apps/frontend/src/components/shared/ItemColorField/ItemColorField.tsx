"use client";

import { useGT } from "gt-next";
import { Check } from "lucide-react";
import { ITEM_COLORS } from "@wishlist/backend/lib/item-colors";
import styles from "./ItemColorField.module.scss";

/**
 * Card colour for an item: a swatch that opens a small palette, the way Notion picks a
 * colour. The chosen colour is what makes the card glow — priorities no longer do.
 */
export function ItemColorField({
  colorIndex,
  open,
  onOpenChange,
  onSelect,
}: {
  colorIndex: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (colorIndex: number | null) => void;
}) {
  const t = useGT();
  const label = t("Card Color", { $id: "item.modal.colorLabelShort" });
  const selectedColor = colorIndex == null ? null : ITEM_COLORS[colorIndex]?.color;

  function choose(next: number | null) {
    onSelect(next);
    onOpenChange(false);
  }

  return (
    <div className={styles.field}>
      <label>{label}</label>
      <button
        type="button"
        className={styles.trigger}
        style={{ "--selected-color": selectedColor ?? "var(--color-border-light)" } as never}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label={label}
      >
        <span className={styles.triggerSwatch} />
      </button>

      {open && (
        <div className={styles.popover} role="listbox" aria-label={label}>
          <button
            type="button"
            role="option"
            aria-selected={colorIndex === null}
            className={`${styles.swatch} ${styles.swatchNone} ${colorIndex === null ? styles.swatchActive : ""}`}
            onClick={() => choose(null)}
            title={t("No color", { $id: "item.modal.colorNone" })}
          >
            {colorIndex === null && <Check size={12} strokeWidth={3} />}
          </button>
          {ITEM_COLORS.map((color, index) => (
            <button
              key={color.color}
              type="button"
              role="option"
              aria-selected={colorIndex === index}
              className={`${styles.swatch} ${colorIndex === index ? styles.swatchActive : ""}`}
              style={{ "--swatch-color": color.color } as never}
              onClick={() => choose(index)}
              title={color.label}
            >
              {colorIndex === index && <Check size={12} strokeWidth={3} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
