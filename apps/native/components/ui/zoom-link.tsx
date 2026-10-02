import { Link, type Href } from "expo-router";
import * as React from "react";

/**
 * Opens `href` with the iOS 18+ zoom transition: the tapped element grows into the next
 * screen, and swiping back (or going back) shrinks the screen into it again. Elsewhere it
 * is a plain `Link`. `children` must be one pressable element; its own `onPress` still runs.
 * The destination needs the default stack animation (`detailScreenAnimation`).
 */
export function ZoomLink({ href, children }: { href: Href; children: React.ReactElement }) {
  return (
    <Link href={href} asChild>
      <Link.AppleZoom>{children}</Link.AppleZoom>
    </Link>
  );
}
