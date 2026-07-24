import { cn } from "@/lib/utils";
import * as React from "react";
import { View } from "react-native";
import { SvgXml } from "react-native-svg";
import { FLAG_SVGS } from "./flag-data";

type FlagProps = {
  /** ISO 3166-1 alpha-2 country code (lowercase), e.g. "ua", "gb", "eu". */
  country?: string | null;
  /** Rendered pixel size of the (square, circular) flag. */
  size?: number;
  className?: string;
};

/**
 * A circular country flag (HatScripts/circle-flags, MIT), rendered from inline SVG
 * via react-native-svg. Falls back to a neutral placeholder circle when the country
 * has no bundled flag.
 */
export function Flag({ country, size = 24, className }: FlagProps) {
  const xml = country ? FLAG_SVGS[country.toLowerCase()] : undefined;

  if (!xml) {
    return (
      <View
        className={cn("rounded-full bg-bg-muted", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return <SvgXml xml={xml} width={size} height={size} />;
}

export function hasFlag(country: string | null | undefined): boolean {
  return Boolean(country && FLAG_SVGS[country.toLowerCase()]);
}
