import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { LucideIcon } from "lucide-react-native";
import * as React from "react";
import { View } from "react-native";

type SettingsSectionContextValue = {
  openSection: string | null;
  setOpenSection: (value: string | null) => void;
};

const SettingsSectionContext = React.createContext<SettingsSectionContextValue | null>(null);

// Sentinel value that no section uses, representing "this section is closed".
const SECTION_CLOSED = "__settings-section-closed__";

/**
 * Coordinates the settings accordions so only one section is open at a time.
 * Opening a section automatically closes any other open section.
 *
 * When `enabled` is false, no context is provided and sections fall back to
 * managing their own open state independently.
 */
export function SettingsSectionProvider({
  enabled = true,
  defaultOpenSection = null,
  children,
}: {
  enabled?: boolean;
  defaultOpenSection?: string | null;
  children: React.ReactNode;
}) {
  const [openSection, setOpenSection] = React.useState<string | null>(defaultOpenSection);
  const value = React.useMemo(() => ({ openSection, setOpenSection }), [openSection]);

  if (!enabled) return <>{children}</>;

  return (
    <SettingsSectionContext.Provider value={value}>{children}</SettingsSectionContext.Provider>
  );
}

export function SettingsSection({
  id,
  title,
  icon,
  children,
  defaultOpen = false,
  headerAction,
}: {
  id: string;
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerAction?: React.ReactNode;
}) {
  const context = React.useContext(SettingsSectionContext);

  // A non-undefined sentinel keeps the accordion in controlled mode when closed.
  // Passing `undefined` would make the primitive fall back to its own internal
  // (uncontrolled) state, which lets multiple sections open at once.
  const accordionProps = context
    ? {
        value: context.openSection === id ? id : SECTION_CLOSED,
        onValueChange: (next: string | undefined) => context.setOpenSection(next ?? null),
      }
    : { defaultValue: defaultOpen ? id : undefined };

  return (
    <Accordion
      type="single"
      collapsible
      {...accordionProps}
      className="rounded-xl border border-border-subtle bg-card-bg px-5 shadow-sm"
    >
      <AccordionItem value={id} className="border-b-0">
        <AccordionTrigger className="py-5">
          <View className="relative flex-1 justify-center">
            <View className="flex-row items-center gap-2">
              {icon ? <Icon as={icon} className="size-5 text-brand" /> : null}
              <Text className="text-title font-bold text-text">{title}</Text>
            </View>
            {headerAction ? (
              <View className="absolute end-0 top-1/2 -translate-y-1/2">{headerAction}</View>
            ) : null}
          </View>
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <View className="gap-4">{children}</View>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
