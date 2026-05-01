import { FadeIn, LinearTransition } from "react-native-reanimated";

/** Grid reflow when items load/filter — matches wishlists index screen */
export const wishlistGridLinearTransition = LinearTransition;

/** Card entrance — matches wishlists WishlistCard */
export const wishlistCardFadeIn = FadeIn.duration(180);
