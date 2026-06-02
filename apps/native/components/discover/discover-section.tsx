import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { DiscoverItemCard } from "@/components/discover/discover-item-card";
import { formatDiscoverDate, normalizeDiscoverItem } from "@/lib/discover";
import type { DiscoverItem, DiscoverSection as DiscoverSectionType } from "@wishlist/backend/types/discover";
import type { Item } from "@wishlist/backend/types/item";
import { CalendarDays, Gift } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";

export function DiscoverSection({
  section,
  cardWidth,
  gridGap,
  currentUserId,
  avatarUrl,
  headerAccessory,
  onOpenItem,
}: {
  section: DiscoverSectionType;
  cardWidth: number;
  gridGap: number;
  currentUserId?: string | null;
  avatarUrl?: string | null;
  headerAccessory?: React.ReactNode;
  onOpenItem: (item: Item) => void;
}) {
  const t = useGT();
  const items = React.useMemo(() => section.items.map(normalizeDiscoverItem), [section.items]);
  const initials = section.owner.trim().slice(0, 2).toUpperCase() || "?";
  const visibleDate = formatDiscoverDate(section.date);

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <Avatar alt={section.owner} className="size-11">
          {avatarUrl || section.avatar_url ? (
            <AvatarImage source={{ uri: avatarUrl ?? section.avatar_url ?? "" }} />
          ) : null}
          <AvatarFallback>
            <Text className="text-sm font-extrabold text-text-muted">{initials}</Text>
          </AvatarFallback>
        </Avatar>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-extrabold text-text" numberOfLines={1}>
            {section.owner}
          </Text>
          <Text className="text-sm font-semibold text-text-muted" numberOfLines={1}>
            @{section.username} / {section.wishlist}
          </Text>
        </View>
        {visibleDate ? (
          <View className="flex-row items-center gap-1 rounded-full bg-brand-lighter px-2.5 py-1.5">
            <Icon as={CalendarDays} className="size-3.5 text-brand" />
            <Text className="text-xs font-extrabold text-brand">{visibleDate}</Text>
          </View>
        ) : null}
        {headerAccessory}
      </View>

      {items.length > 0 ? (
        <View className="flex-row flex-wrap" style={{ gap: gridGap }}>
          {items.map((item) => (
            <DiscoverItemCard
              key={item.id}
              item={item}
              width={cardWidth}
              currentUserId={currentUserId}
              reservedByName={
                section.items.find((entry: DiscoverItem) => entry.id === item.id)?.reservedByName ??
                null
              }
              onPress={() => onOpenItem(item)}
            />
          ))}
        </View>
      ) : (
        <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-6">
          <Icon as={Gift} className="mb-2 size-8 text-text-light" />
          <Text className="text-sm font-semibold text-text-muted">{t("No gifts here yet.")}</Text>
        </View>
      )}
    </View>
  );
}
