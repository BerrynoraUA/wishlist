import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { PullRefreshIndicator } from "@/components/ui/pull-refresh-indicator";
import { hapticImpact } from "@/lib/haptics";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, Platform, RefreshControl, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { useCSSVariable, withUniwind } from "uniwind";

const UniwindFlashList = withUniwind(FlashList);
const DEFAULT_DRAW_DISTANCE = 1600;
/**
 * iOS bounces the content down while pulling, so the stock spinner is hidden and a branded
 * indicator rides in the gap. Android's swipe-refresh doesn't move the content; it keeps the
 * Material spinner, tinted with the brand.
 */
const CUSTOM_REFRESH_INDICATOR = Platform.OS === "ios";

type StyledFlashListProps<T> = Omit<React.ComponentProps<typeof FlashList<T>>, "onRefresh"> & {
  onRefresh?: () => Promise<unknown>;
  listRef?: React.Ref<FlashListRef<T>>;
  className?: string;
  columnWrapperClassName?: string;
  contentContainerClassName?: string;
  ListFooterComponentClassName?: string;
  ListHeaderComponentClassName?: string;
  isLoadingMore?: boolean;
  loadingMoreComponent?: React.ReactNode;
};

function StyledFlashList<T>({
  listRef,
  drawDistance = DEFAULT_DRAW_DISTANCE,
  isLoadingMore = false,
  ListFooterComponent,
  loadingMoreComponent,
  onEndReachedThreshold,
  onRefresh,
  onScroll,
  progressViewOffset = 0,
  ...props
}: StyledFlashListProps<T>) {
  const t = useGT();
  const brand = useCSSVariable("--color-brand");
  const [refreshing, setRefreshing] = React.useState(false);
  const pull = useSharedValue(0);
  const refreshPending = React.useRef(false);
  const handleRefresh = React.useCallback(async () => {
    if (!onRefresh || refreshPending.current) return;
    refreshPending.current = true;
    setRefreshing(true);
    hapticImpact();
    try {
      await onRefresh();
    } finally {
      refreshPending.current = false;
      setRefreshing(false);
    }
  }, [onRefresh]);
  const FooterComponent = React.useMemo(
    () =>
      isLoadingMore
        ? () => (
            <>
              {renderFooterComponent(ListFooterComponent)}
              {loadingMoreComponent ?? <DefaultLoadingMore />}
            </>
          )
        : ListFooterComponent,
    [isLoadingMore, ListFooterComponent, loadingMoreComponent],
  );

  const handleScroll = React.useMemo<typeof onScroll>(
    () =>
      onRefresh && CUSTOM_REFRESH_INDICATOR
        ? (event) => {
            pull.value = -event.nativeEvent.contentOffset.y;
            onScroll?.(event);
          }
        : onScroll,
    [onRefresh, onScroll, pull],
  );

  const list = (
    <UniwindFlashList
      ref={listRef as React.ComponentProps<typeof UniwindFlashList>["ref"]}
      drawDistance={drawDistance}
      ListFooterComponent={FooterComponent}
      onEndReachedThreshold={onEndReachedThreshold ?? (props.onEndReached ? 1.2 : undefined)}
      {...(props as React.ComponentProps<typeof UniwindFlashList>)}
      alwaysBounceVertical={onRefresh ? true : props.alwaysBounceVertical}
      progressViewOffset={progressViewOffset}
      onScroll={handleScroll}
      scrollEventThrottle={
        onRefresh && CUSTOM_REFRESH_INDICATOR
          ? (props.scrollEventThrottle ?? 16)
          : props.scrollEventThrottle
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh().catch(() => {})}
            progressViewOffset={progressViewOffset}
            tintColor={
              CUSTOM_REFRESH_INDICATOR
                ? "transparent"
                : typeof brand === "string"
                  ? brand
                  : undefined
            }
            colors={typeof brand === "string" ? [brand] : undefined}
            accessibilityLabel={t("Pull to refresh")}
          />
        ) : (
          props.refreshControl
        )
      }
    />
  );

  if (!onRefresh || !CUSTOM_REFRESH_INDICATOR) return list;
  return (
    <View className="flex-1">
      {list}
      <PullRefreshIndicator pull={pull} refreshing={refreshing} top={progressViewOffset} />
    </View>
  );
}

function renderFooterComponent<T>(
  ListFooterComponent: StyledFlashListProps<T>["ListFooterComponent"],
) {
  if (!ListFooterComponent) return null;
  if (React.isValidElement(ListFooterComponent)) return ListFooterComponent;
  return React.createElement(ListFooterComponent);
}

function DefaultLoadingMore() {
  return (
    <View className="items-center justify-center py-3">
      <ActivityIndicator colorClassName="accent-brand" />
    </View>
  );
}

export { StyledFlashList };
