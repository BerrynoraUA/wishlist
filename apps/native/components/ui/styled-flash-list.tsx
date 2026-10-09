import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { hapticImpact } from "@/lib/haptics";
import { useGT } from "gt-react-native";
import * as React from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { useCSSVariable, withUniwind } from "uniwind";

const UniwindFlashList = withUniwind(FlashList);
const DEFAULT_DRAW_DISTANCE = 1600;

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
  const surface = useCSSVariable("--color-bg-elevated");
  const [refreshing, setRefreshing] = React.useState(false);
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

  return (
    <UniwindFlashList
      ref={listRef as React.ComponentProps<typeof UniwindFlashList>["ref"]}
      drawDistance={drawDistance}
      ListFooterComponent={FooterComponent}
      onEndReachedThreshold={onEndReachedThreshold ?? (props.onEndReached ? 1.2 : undefined)}
      {...(props as React.ComponentProps<typeof UniwindFlashList>)}
      alwaysBounceVertical={onRefresh ? true : props.alwaysBounceVertical}
      progressViewOffset={progressViewOffset}
      onScroll={onScroll}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh().catch(() => {})}
            progressViewOffset={progressViewOffset}
            tintColor={typeof brand === "string" ? brand : undefined}
            colors={typeof brand === "string" ? [brand] : undefined}
            progressBackgroundColor={typeof surface === "string" ? surface : undefined}
            accessibilityLabel={t("Pull to refresh")}
          />
        ) : (
          props.refreshControl
        )
      }
    />
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
