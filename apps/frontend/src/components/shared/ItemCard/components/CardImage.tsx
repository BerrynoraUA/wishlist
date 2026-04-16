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

  return (
    <div className={styles.imageFrame}>
      {image ? (
        <img src={image} alt={name} />
      ) : (
        <div className={styles.placeholder}>
          {isWishlist ? <ShoppingBag size={32} /> : t("No image", { $id: "itemCard.noImage" })}
        </div>
      )}
    </div>
  );
}
