import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CornerDownLeft,
  CornerDownRight,
  CornerUpLeft,
  CornerUpRight,
  type LucideIcon,
  type LucideProps,
  MoveLeft,
  MoveRight,
} from "lucide-react-native";
import { I18nManager } from "react-native";
import { withUniwind } from "uniwind";

type IconProps = LucideProps & {
  as: LucideIcon;
};

/**
 * Icons whose meaning is a horizontal direction (navigation, disclosure). They
 * are mirrored under RTL — a glyph transform the layout engine can't do on its
 * own. Purely iconographic arrows (external-link, send, undo) are intentionally
 * excluded to avoid odd-looking flips.
 */
const RTL_MIRRORED_ICONS: ReadonlySet<LucideIcon> = new Set([
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  MoveLeft,
  MoveRight,
  CornerUpLeft,
  CornerUpRight,
  CornerDownLeft,
  CornerDownRight,
]);

const RTL_MIRROR_STYLE = { transform: [{ scaleX: -1 }] } as const;

function IconImpl({ as: IconComponent, style, ...props }: IconProps) {
  const mirrored = I18nManager.isRTL && RTL_MIRRORED_ICONS.has(IconComponent);
  return <IconComponent {...props} style={mirrored ? [style, RTL_MIRROR_STYLE] : style} />;
}

const StyledIcon = withUniwind(IconImpl, {
  size: {
    fromClassName: "className",
    styleProperty: "width",
  },
  color: {
    fromClassName: "className",
    styleProperty: "color",
  },
});

/**
 * A wrapper component for Lucide icons with Uniwind `className` support via `withUniwind`.
 *
 * This component allows you to render any Lucide icon while applying utility classes
 * using `uniwind`. It avoids the need to wrap or configure each icon individually.
 *
 * @component
 * @example
 * ```tsx
 * import { ArrowRight } from 'lucide-react-native';
 * import { Icon } from '@/registry/components/ui/icon';
 *
 * <Icon as={ArrowRight} className="text-red-500 size-4" />
 * ```
 *
 * @param {LucideIcon} as - The Lucide icon component to render.
 * @param {string} className - Utility classes to style the icon using Uniwind.
 * @param {number} size - Icon size (overrides the size class).
 * @param {...LucideProps} ...props - Additional Lucide icon props passed to the "as" icon.
 */
function Icon({ as: IconComponent, className, ...props }: IconProps) {
  return <StyledIcon as={IconComponent} className={cn("text-text size-5", className)} {...props} />;
}

export { Icon };
