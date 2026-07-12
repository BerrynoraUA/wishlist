import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

export function SettingsControlsLabeledInput({
  label,
  hint,
  error,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "className"> & {
  label: string;
  hint?: string;
  error?: string | null;
  className?: string;
}) {
  return (
    <View className={cn("gap-2", className)}>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-sm font-semibold text-text">{label}</Text>
        {hint ? <Text className="text-xs text-text-muted">{hint}</Text> : null}
      </View>
      <Input {...props} className={cn(error && "border-destructive")} />
      {error ? <Text className="text-xs text-destructive">{error}</Text> : null}
    </View>
  );
}

export function SettingsControlsInfoRow({
  icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="size-9 items-center justify-center rounded-full bg-bg-muted">
        <Icon as={icon} className="size-4 text-brand" />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-text">{title}</Text>
        {subtitle ? <Text className="text-sm text-text-muted">{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function SettingsControlsToggleRow({
  icon,
  title,
  subtitle,
  checked,
  onCheckedChange,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-1 flex-row items-center gap-3">
        <View className="size-9 items-center justify-center rounded-full bg-brand-lighter">
          <Icon as={icon} className="size-4 text-brand" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="font-semibold text-text">{title}</Text>
          {subtitle ? <Text className="text-sm text-text-muted">{subtitle}</Text> : null}
        </View>
      </View>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </View>
  );
}

export function SettingsControlsButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button className={cn("h-11", className)} {...props}>
      {children}
    </Button>
  );
}
