"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import {
  SaveToWishlistModal,
  type SaveItemData,
} from "@/components/ui/SaveToWishlistModal/SaveToWishlistModal";
import styles from "./SaveToWishlistButton.module.scss";

type Props = {
  item: SaveItemData;
  className?: string;
  size?: number;
  tooltip?: string;
  /**
   * Anchors the tooltip to the trigger's start/end instead of centering it.
   * Use "start" when the button sits against the left edge of an
   * overflow-clipped container (e.g. a modal footer) so the tooltip isn't cut off.
   */
  tooltipAlign?: "center" | "start" | "end";
};

export function SaveToWishlistButton({
  item,
  className,
  size = 16,
  tooltip = "Save to my wishlist",
  tooltipAlign = "center",
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const stopPropagation = (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.PointerEvent<HTMLButtonElement>
      | React.TouchEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.button} ${className ?? ""} iconTooltipTrigger`.trim()}
        onPointerDown={stopPropagation}
        onMouseDown={stopPropagation}
        onTouchStart={stopPropagation}
        onClick={(e) => {
          e.stopPropagation();
          setModalOpen(true);
        }}
        aria-label={tooltip}
        data-tooltip={tooltip}
        data-tooltip-align={tooltipAlign}
      >
        <Bookmark size={size} />
      </button>

      <SaveToWishlistModal open={modalOpen} onClose={() => setModalOpen(false)} item={item} />
    </>
  );
}
