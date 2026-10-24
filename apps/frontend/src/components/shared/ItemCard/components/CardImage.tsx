import { useState } from "react";
import { useGT } from "gt-next";
import { ShoppingBag } from "lucide-react";
import styles from "../ItemCard.module.scss";

type CardImageProps = {
  image: string | null;
  name: string;
  isWishlist: boolean;
};

export function CardImage({ image, name, isWishlist }: CardImageProps) {
  const t = useGT();
  // Store images are hotlinked, and some stores block that; show the placeholder instead.
  const [failedImage, setFailedImage] = useState<string | null>(null);

  return (
    <div className={styles.imageFrame}>
      {image && failedImage !== image ? (
        <img src={image} alt={name} onError={() => setFailedImage(image)} />
      ) : (
        <div className={styles.placeholder}>
          {isWishlist ? <ShoppingBag size={32} /> : t("No image", { $id: "itemCard.noImage" })}
        </div>
      )}
    </div>
  );
}
