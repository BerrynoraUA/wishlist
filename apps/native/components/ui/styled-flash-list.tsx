import { FlashList } from "@shopify/flash-list";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";
import { withUniwind } from "uniwind";

const UniwindFlashList = withUniwind(FlashList);
const DEFAULT_DRAW_DISTANCE = 1600;

type StyledFlashListProps<T> = React.ComponentProps<typeof FlashList<T>> & {
  className?: string;
  columnWrapperClassName?: string;
  contentContainerClassName?: string;
  ListFooterComponentClassName?: string;
  ListHeaderComponentClassName?: string;
  isLoadingMore?: boolean;
  loadingMoreComponent?: React.ReactNode;
};

function StyledFlashList<T>({
  drawDistance = DEFAULT_DRAW_DISTANCE,
  isLoadingMore = false,
  ListFooterComponent,
  loadingMoreComponent,
  onEndReachedThreshold,
  ...props
}: StyledFlashListProps<T>) {
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
      drawDistance={drawDistance}
      ListFooterComponent={FooterComponent}
      onEndReachedThreshold={onEndReachedThreshold ?? (props.onEndReached ? 1.2 : undefined)}
      {...(props as React.ComponentProps<typeof UniwindFlashList>)}
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
