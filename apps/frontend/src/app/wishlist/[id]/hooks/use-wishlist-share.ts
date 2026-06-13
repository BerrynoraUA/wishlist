"use client";

import { useCallback, useState } from "react";
import { useGT } from "gt-next";
import { createWishlistShareToken } from "@/api/share";
import { getShareBaseUrl } from "../helpers";

type ShareFeedback = {
  open: boolean;
  variant: "success" | "error";
  title: string;
  description: string;
  link?: string | null;
};

const CLOSED_FEEDBACK: ShareFeedback = {
  open: false,
  variant: "success",
  title: "",
  description: "",
  link: null,
};

/**
 * Owns the "share wishlist" flow: generating a token, copying the URL to
 * the clipboard, and the resulting feedback modal state.
 */
export function useWishlistShare(wishlistId: string) {
  const t = useGT();
  const [shareFeedback, setShareFeedback] = useState<ShareFeedback>(CLOSED_FEEDBACK);

  const closeShareFeedback = useCallback(() => {
    setShareFeedback((current) => ({ ...current, open: false }));
  }, []);

  const handleShare = useCallback(async (): Promise<boolean> => {
    try {
      const shareBaseUrl = getShareBaseUrl();
      const { shareUrl } = await createWishlistShareToken(wishlistId, {
        shareBaseUrl,
      });
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        setShareFeedback({
          open: true,
          variant: "success",
          title: t("Link copied", { $id: "wishlist.share.linkCopiedTitle" }),
          description: t("Your wishlist share link is ready to send.", {
            $id: "wishlist.share.linkCopiedDescription",
          }),
          link: shareUrl,
        });
        return true;
      }

      setShareFeedback({
        open: true,
        variant: "error",
        title: t("Could not create link", {
          $id: "wishlist.share.createLinkErrorTitle",
        }),
        description: t("We couldn't generate a share link for this wishlist.", {
          $id: "wishlist.share.createLinkErrorDescription",
        }),
        link: null,
      });
      return false;
    } catch {
      setShareFeedback({
        open: true,
        variant: "error",
        title: t("Share failed", { $id: "wishlist.share.shareFailedTitle" }),
        description: t("Something went wrong while creating the share link.", {
          $id: "wishlist.share.shareFailedDescription",
        }),
        link: null,
      });
      return false;
    }
  }, [wishlistId, t]);

  return {
    shareFeedback,
    closeShareFeedback,
    handleShare,
  };
}
