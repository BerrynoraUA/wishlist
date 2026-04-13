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
};

export function SaveToWishlistButton({
  item,
  className,
  size = 16,
  tooltip = "Save to my wishlist",
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
      >
        <Bookmark size={size} />
      </button>

      <SaveToWishlistModal open={modalOpen} onClose={() => setModalOpen(false)} item={item} />
    </>
  );
}
