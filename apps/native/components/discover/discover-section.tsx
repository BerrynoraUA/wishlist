import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { DiscoverItemCard } from "@/components/discover/discover-item-card";
import { formatDiscoverDate, normalizeDiscoverItem } from "@/lib/discover";
import type { DiscoverSection as DiscoverSectionType } from "@wishlist/backend/types/discover";
import type { Item } from "@wishlist/backend/types/item";
import { useReducedMotion } from "@/lib/motion";
import { CalendarDays, Gift } from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

/**
 * Scroll-driven card motion: the card at the left edge stays full size, cards further
 * right shrink and fade slightly, so the row feels alive instead of a static strip.
 * Everything is interpolated from the scroll offset on the UI thread, so it never lags
 * behind the finger.
 */
function CarouselCard({
  index,
  scrollX,
  snapInterval,
  reduceMotion,
  children,
}: {
  index: number;
  scrollX: SharedValue<number>;
  snapInterval: number;
  reduceMotion: boolean;
  children: React.ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};

    // Distance of this card from the left edge of the viewport, in "card" units.
    const offset = index * snapInterval - scrollX.value;
    const progress = offset / snapInterval;

    return {
      opacity: interpolate(progress, [-1, 0, 1.6], [0.6, 1, 0.85], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(progress, [-1, 0, 1.6], [0.93, 1, 0.95], Extrapolation.CLAMP) },
        { translateY: interpolate(progress, [-1, 0, 1.6], [6, 0, 4], Extrapolation.CLAMP) },
      ],
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

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
  onOpenItem: (item: Item, reservedByName?: string | null) => void;
}) {
  const t = useGT();
  const items = React.useMemo(
    () =>
      section.items.map((source) => ({
        item: normalizeDiscoverItem(source),
        reservedByName: source.reservedByName ?? null,
      })),
    [section.items],
  );
  const visibleDate = formatDiscoverDate(section.date);
  const reduceMotion = useReducedMotion();
  const snapInterval = cardWidth + gridGap;
  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <Avatar alt={section.owner} className="size-11">
          {avatarUrl || section.avatar_url ? (
            <AvatarImage source={{ uri: avatarUrl ?? section.avatar_url ?? "" }} />
          ) : null}
          <AvatarFallback initialsClassName="text-sm" />
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
        // One wishlist = one horizontal row; items never wrap onto extra lines.
        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: gridGap, paddingEnd: gridGap }}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          snapToInterval={snapInterval}
          snapToAlignment="start"
          disableIntervalMomentum
          decelerationRate="fast"
        >
          {items.map(({ item, reservedByName }, index) => {
            return (
              <CarouselCard
                key={item.id}
                index={index}
                scrollX={scrollX}
                snapInterval={snapInterval}
                reduceMotion={reduceMotion}
              >
                <DiscoverItemCard
                  item={item}
                  width={cardWidth}
                  currentUserId={currentUserId}
                  reservedByName={reservedByName}
                  onPress={() => onOpenItem(item, reservedByName)}
                />
              </CarouselCard>
            );
          })}
        </Animated.ScrollView>
      ) : (
        <View className="items-center justify-center rounded-xl border border-border-subtle bg-card-bg p-6">
          <Icon as={Gift} className="mb-2 size-8 text-text-light" />
          <Text className="text-sm font-semibold text-text-muted">{t("No gifts here yet.")}</Text>
        </View>
      )}
    </View>
  );
}
