import { FlashList } from "@shopify/flash-list";
import type * as React from "react";
import { withUniwind } from "uniwind";

const UniwindFlashList = withUniwind(FlashList);

type StyledFlashListProps<T> = React.ComponentProps<typeof FlashList<T>> & {
  className?: string;
  columnWrapperClassName?: string;
  contentContainerClassName?: string;
  ListFooterComponentClassName?: string;
  ListHeaderComponentClassName?: string;
};

function StyledFlashList<T>(props: StyledFlashListProps<T>) {
  return <UniwindFlashList {...(props as React.ComponentProps<typeof UniwindFlashList>)} />;
}

export { StyledFlashList };
