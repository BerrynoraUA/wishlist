import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_TEMPLATES,
  type NotificationTemplateKey,
  interpolateTemplate,
  renderNotificationText,
} from "./templates";
import { NOTIFICATION_TRANSLATIONS } from "./translations";

const KEYS = Object.keys(NOTIFICATION_TEMPLATES) as NotificationTemplateKey[];

/** Placeholders each template must always keep, e.g. `{name}` / `{title}`. */
function placeholdersOf(text: string): string[] {
  return (text.match(/\{(\w+)\}/g) ?? []).sort();
}

describe("notification templates", () => {
  it("interpolates named placeholders and leaves unknown ones intact", () => {
    expect(interpolateTemplate("{name} reserved your item", { name: "Anna" })).toBe(
      "Anna reserved your item",
    );
    expect(interpolateTemplate("{a} {b}", { a: "x" })).toBe("x {b}");
  });

  it("falls back to English source for missing locale/template", () => {
    expect(renderNotificationText("item_reserved", { name: "Anna" }, "en")).toBe(
      "Anna reserved your item",
    );
    expect(renderNotificationText("item_reserved", { name: "Anna" }, null)).toBe(
      "Anna reserved your item",
    );
    expect(renderNotificationText("item_reserved", { name: "Anna" }, "xx")).toBe(
      "Anna reserved your item",
    );
  });

  it("renders a translated locale", () => {
    expect(renderNotificationText("item_reserved", { name: "Anna" }, "de")).toBe(
      "Anna hat deinen Artikel reserviert",
    );
    expect(
      renderNotificationText("group_added", { name: "Bob", group: "Family" }, "uk"),
    ).toBe('Bob додав вас до групи "Family"');
  });

  it("every translation keeps the exact placeholders of its English source", () => {
    for (const [locale, entries] of Object.entries(NOTIFICATION_TRANSLATIONS)) {
      for (const key of KEYS) {
        const translated = entries[key];
        if (translated === undefined) continue;
        expect(placeholdersOf(translated), `${locale}.${key} placeholders`).toEqual(
          placeholdersOf(NOTIFICATION_TEMPLATES[key].source),
        );
      }
    }
  });

  it("every locale translates all templates (no partial locales)", () => {
    for (const [locale, entries] of Object.entries(NOTIFICATION_TRANSLATIONS)) {
      for (const key of KEYS) {
        expect(entries[key], `${locale} is missing ${key}`).toBeTruthy();
      }
    }
  });
});
