import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

export function SettingsSection({
  title,
  icon,
  children,
  defaultOpen = false,
  headerAction,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerAction?: React.ReactNode;
}) {
  const value = title.toLowerCase().replace(/\s+/g, "-");

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? value : undefined}
      className="rounded-xl border border-border-subtle bg-card-bg px-5 shadow-sm"
    >
      <AccordionItem value={value} className="border-b-0">
        <AccordionTrigger className="py-5">
          <View className="relative flex-1 justify-center">
            <View className="flex-row items-center gap-2">
              {icon ? <Icon as={icon} className="size-5 text-brand" /> : null}
              <Text className="text-title font-bold text-text">{title}</Text>
            </View>
            {headerAction ? (
              <View className="absolute right-0 top-1/2 -translate-y-1/2">{headerAction}</View>
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
