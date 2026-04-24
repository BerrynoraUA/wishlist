"use client";

import { useState } from "react";
import type { Item } from "@/types/item";

/**
 * Encapsulates every modal the wishlist detail page can open:
 * create/edit/delete item, edit/delete wishlist, and grant-access.
 */
export function useWishlistPageModals() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [editWishlistOpen, setEditWishlistOpen] = useState(false);
  const [deleteWishlistOpen, setDeleteWishlistOpen] = useState(false);
  const [grantAccessOpen, setGrantAccessOpen] = useState(false);

  return {
    createOpen,
    setCreateOpen,
    editItem,
    setEditItem,
    deleteItemId,
    setDeleteItemId,
    editWishlistOpen,
    setEditWishlistOpen,
    deleteWishlistOpen,
    setDeleteWishlistOpen,
    grantAccessOpen,
    setGrantAccessOpen,
  };
}
