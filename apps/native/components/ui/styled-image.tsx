import { cn } from "@/lib/utils";
import { Image as ExpoImage } from "expo-image";
import * as React from "react";
import { withUniwind } from "uniwind";

const UniwindExpoImage = withUniwind(ExpoImage);

export type StyledImageProps = React.ComponentProps<typeof UniwindExpoImage>;

const StyledImage = React.forwardRef<ExpoImage, StyledImageProps>(function StyledImage(
  { className, ...props },
  ref,
) {
  return <UniwindExpoImage ref={ref} className={cn(className)} {...props} />;
});

StyledImage.displayName = "StyledImage";

export { StyledImage };
