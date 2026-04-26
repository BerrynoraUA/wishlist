"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGT } from "gt-next";
import { useSubscription } from "@/hooks/use-subscription";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Heading, Text } from "@/components/ui/Typography";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import { grantWishlistAccess } from "@/api/wishlist";
import {
  useFriendsWithoutWishlistAccess,
  useWishlistAccessList,
} from "@/hooks/use-friends";
import { useCurrentUserId } from "@/hooks/use-user";
import { useSessionDraft } from "@/hooks/use-session-draft";
import {
  useRevokeWishlistAccess,
  useUpdateWishlist,
} from "@/hooks/use-wishlists";
import { Check } from "lucide-react";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import { DatePickerField } from "@/components/ui/Calendar/DatePickerField";
import { FileSizeBadge } from "@/components/ui/FileSizeBadge/FileSizeBadge";
import { UploadErrorText } from "@/components/ui/UploadErrorText/UploadErrorText";
import { validateImageUploadFile } from "@/lib/image-upload";
import {
  RestoredEditWishlistFields,
  WishlistDraft,
  Wishlist,
  WishlistVisibility,
} from "@/types/wishlist";
import {
  WISHLIST_COLOR_OPTIONS,
  SELECTED_FRIENDS_ACCESS_TYPE,
  WISHLIST_PRIVACY_BY_VISIBILITY,
  WISHLIST_VISIBILITY_BY_PRIVACY,
  getWishlistAccentByColor,
  getWishlistColorByAccent,
  getWishlistPrivacyOptions,
  type WishlistColorOption,
  type WishlistPrivacyOption,
  EMPTY_RESTORED_EDIT_WISHLIST_FIELDS,
} from "@/lib/constants/wishlist";
import {
  WishlistAccessPicker,
  type WishlistAccessFriendOption,
} from "../create-wishlist-modal/CreateWishlistModal";
import styles from "../create-wishlist-modal/CreateWishlistModal.module.scss";

type Props = {
  open: boolean;
  onClose: () => void;
  wishlist: Wishlist;
};

export function EditWishlistModal({ open, onClose, wishlist }: Props) {
  if (!open) return null;

  return (
    <EditWishlistForm
      open={open}
      key={`${wishlist.id}-${wishlist.event_date ?? "no-date"}-${wishlist.image_url ?? "no-image"}`}
      wishlist={wishlist}
      onClose={onClose}
    />
  );
}

function EditWishlistForm({
  open,
  wishlist,
  onClose,
}: {
  open: boolean;
  wishlist: Wishlist;
  onClose: () => void;
}) {
  const t = useGT();
  const queryClient = useQueryClient();
  const { data: currentUserId = "" } = useCurrentUserId();
  const { isPro } = useSubscription();
  const privacyOptions = getWishlistPrivacyOptions(t);
  const isColorGated = SUBSCRIPTIONS_UI_ENABLED && !isPro;
  const [name, setName] = useState(wishlist.title ?? "");
  const [description, setDescription] = useState(wishlist.description ?? "");
  const [privacy, setPrivacy] = useState<WishlistPrivacyOption>(
    WISHLIST_PRIVACY_BY_VISIBILITY[wishlist.visibility_type] ?? "Public",
  );
  const [color, setColor] = useState<WishlistColorOption>(
    getWishlistColorByAccent(wishlist.accent_type),
  );
  const [eventDate, setEventDate] = useState(() => {
    const raw =
      wishlist.event_date ??
      (wishlist as Wishlist & { event_date?: string }).event_date;
    return raw ? String(raw).split("T")[0] : "";
  });
  const [imagePreview, setImagePreview] = useState(wishlist.image_url ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [localImageNeedsReupload, setLocalImageNeedsReupload] = useState(false);
  const [selectedAccessFriends, setSelectedAccessFriends] = useState<
    WishlistAccessFriendOption[]
  >([]);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [restoredFields, setRestoredFields] =
    useState<RestoredEditWishlistFields>(EMPTY_RESTORED_EDIT_WISHLIST_FIELDS);
  const availableColors = useMemo(() => {
    if (!isColorGated) {
      return WISHLIST_COLOR_OPTIONS;
    }

    return color === "pink" ? (["pink"] as const) : ([color] as const);
  }, [color, isColorGated]);

  const {
    data: friendsWithoutAccess = [],
    isLoading: friendsWithoutAccessLoading,
    isError: friendsWithoutAccessError,
  } = useFriendsWithoutWishlistAccess({
    wishlistId: wishlist.id,
    skip: 0,
    take: 100,
  });
  const friendOptions = useMemo<WishlistAccessFriendOption[]>(
    () =>
      friendsWithoutAccess.map((friend) => ({
        id: friend.id,
        nickname: friend.nickname,
      })),
    [friendsWithoutAccess],
  );
  const { data: accessList = [], isLoading: accessListLoading } =
    useWishlistAccessList(wishlist.id);
  const specificAccessList = useMemo(
    () => accessList.filter((user) => user.access_type === SELECTED_FRIENDS_ACCESS_TYPE),
    [accessList],
  );
  const canManageSelectedFriendsAccess = wishlist.is_owner;
  const initialPrivacy = useMemo<WishlistPrivacyOption>(() => {
    if (
      (wishlist.visibility_type === WishlistVisibility.Private ||
        wishlist.visibility_type === WishlistVisibility.SelectedFriends) &&
      specificAccessList.length > 0
    ) {
      return "SelectedFriends";
    }

    return WISHLIST_PRIVACY_BY_VISIBILITY[wishlist.visibility_type] ?? "Public";
  }, [specificAccessList.length, wishlist.visibility_type]);
  const initialDraft = useMemo<WishlistDraft>(() => {
    const rawEventDate =
      wishlist.event_date ??
      (wishlist as Wishlist & { event_date?: string }).event_date;

    return {
      name: wishlist.title ?? "",
      description: wishlist.description ?? "",
      privacy: initialPrivacy,
      color: getWishlistColorByAccent(wishlist.accent_type),
      eventDate: rawEventDate ? String(rawEventDate).split("T")[0] : "",
      imagePreview: wishlist.image_url ?? "",
      hadLocalImage: false,
    };
  }, [initialPrivacy, wishlist]);

  const { mutateAsync, isPending } = useUpdateWishlist();
  const revokeAccess = useRevokeWishlistAccess();

  const draftValue = useMemo<WishlistDraft>(
    () => ({
      name,
      description,
      privacy,
      color,
      eventDate,
      imagePreview: imageFile ? "" : imagePreview,
      hadLocalImage: Boolean(imageFile),
    }),
    [color, description, eventDate, imageFile, imagePreview, name, privacy],
  );

  const isMeaningfulDraft = useCallback(
    (draft: WishlistDraft) => {
      return (
        draft.name.trim() !== initialDraft.name.trim() ||
        draft.description.trim() !== initialDraft.description.trim() ||
        draft.privacy !== initialDraft.privacy ||
        draft.color !== initialDraft.color ||
        draft.eventDate !== initialDraft.eventDate ||
        draft.imagePreview !== initialDraft.imagePreview ||
        draft.hadLocalImage
      );
    },
    [initialDraft],
  );

  const getRestoredFields = useCallback(
    (draft: WishlistDraft): RestoredEditWishlistFields => ({
      name: draft.name.trim() !== initialDraft.name.trim(),
      description: draft.description.trim() !== initialDraft.description.trim(),
      privacy: draft.privacy !== initialDraft.privacy,
      color: draft.color !== initialDraft.color,
      eventDate: draft.eventDate !== initialDraft.eventDate,
      image:
        draft.imagePreview !== initialDraft.imagePreview || draft.hadLocalImage,
    }),
    [initialDraft],
  );

  const applyDraft = useCallback(
    (draft: WishlistDraft) => {
      setName(draft.name);
      setDescription(draft.description);
      setPrivacy(draft.privacy);
      setColor(draft.color);
      setEventDate(draft.eventDate);
      setImageObjectUrl(null);
      setImageFile(null);
      setImagePreview(draft.imagePreview);
      setImageError(null);
      setLocalImageNeedsReupload(draft.hadLocalImage);
      setRestoredFields(getRestoredFields(draft));
    },
    [getRestoredFields],
  );

  const { isDraftRestored, clearDraft } = useSessionDraft({
    userId: currentUserId,
    kind: "edit-wishlist",
    scopeId: wishlist.id,
    open,
    value: draftValue,
    onRestore: applyDraft,
    isMeaningful: isMeaningfulDraft,
  });

  const hasChanges = useMemo(() => {
    const initialTitle = wishlist.title?.trim() ?? "";
    const initialDescription = wishlist.description?.trim() ?? "";
    const initialPrivacy =
      WISHLIST_PRIVACY_BY_VISIBILITY[wishlist.visibility_type] ?? "Public";
    const initialColor = getWishlistColorByAccent(wishlist.accent_type);
    const initialEventDate = (() => {
      const raw =
        wishlist.event_date ??
        (wishlist as Wishlist & { event_date?: string }).event_date;
      return raw ? String(raw).split("T")[0] : "";
    })();
    const initialImage = wishlist.image_url ?? "";

    return (
      name.trim() !== initialTitle ||
      description.trim() !== initialDescription ||
      privacy !== initialPrivacy ||
      color !== initialColor ||
      eventDate !== initialEventDate ||
      Boolean(imageFile) ||
      imagePreview !== initialImage
    );
  }, [
    color,
    description,
    eventDate,
    imageFile,
    imagePreview,
    name,
    privacy,
    wishlist,
  ]);
  const hasAccessChanges =
    canManageSelectedFriendsAccess &&
    privacy === "SelectedFriends" &&
    selectedAccessFriends.length > 0;

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

  useEffect(() => {
    if (privacy !== "SelectedFriends" && selectedAccessFriends.length > 0) {
      setSelectedAccessFriends([]);
    }
  }, [privacy, selectedAccessFriends.length]);

  useEffect(() => {
    setPrivacy((currentPrivacy) => {
      if (currentPrivacy === initialPrivacy) return currentPrivacy;

      if (
        currentPrivacy === "Private" &&
        initialPrivacy === "SelectedFriends" &&
        specificAccessList.length > 0
      ) {
        return initialPrivacy;
      }

      return currentPrivacy;
    });
  }, [initialPrivacy, specificAccessList.length]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const nextImageError = validateImageUploadFile(file);
    if (nextImageError) {
      setImageError(nextImageError);
      e.target.value = "";
      return;
    }

    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    const objectUrl = URL.createObjectURL(file);
    setImageObjectUrl(objectUrl);

    setImageError(null);
    setImageFile(file);
    setImagePreview(objectUrl);
    setLocalImageNeedsReupload(false);
  }

  function restoreInitialState() {
    setName(initialDraft.name);
    setDescription(initialDraft.description);
    setPrivacy(initialDraft.privacy);
    setColor(initialDraft.color);
    setEventDate(initialDraft.eventDate);
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(null);
    setImageFile(null);
    setImagePreview(initialDraft.imagePreview);
    setImageError(null);
    setLocalImageNeedsReupload(false);
    setSelectedAccessFriends([]);
    setAccessError(null);
    setRestoredFields(EMPTY_RESTORED_EDIT_WISHLIST_FIELDS);
  }

  function handleDiscardDraft() {
    clearDraft();
    restoreInitialState();
  }

  async function handleSubmit() {
    if (
      !name.trim() ||
      isPending ||
      isGrantingAccess ||
      (!hasChanges && !hasAccessChanges)
    )
      return;

    const nextImageError = validateImageUploadFile(imageFile);
    if (nextImageError) {
      setImageError(nextImageError);
      return;
    }

    const imageUrlToSave = imageFile ? null : imagePreview || null;

    setAccessError(null);

    try {
      if (hasChanges) {
        await mutateAsync({
          id: wishlist.id,
          updates: {
            title: name.trim(),
            description: description.trim() || undefined,
            visibility: WISHLIST_VISIBILITY_BY_PRIVACY[privacy],
            image: imageFile,
            imageUrl: imageUrlToSave,
            accent: getWishlistAccentByColor(color),
            event_date: eventDate ? new Date(eventDate) : undefined,
          },
        });
      }

      if (privacy !== "SelectedFriends" && specificAccessList.length > 0) {
        setIsGrantingAccess(true);
        await Promise.all(
          specificAccessList.map((friend) =>
            revokeAccess.mutateAsync({
              wishlistId: wishlist.id,
              targetUserId: friend.id,
            }),
          ),
        );
      }

      if (hasAccessChanges) {
        setIsGrantingAccess(true);
        await Promise.all(
          selectedAccessFriends.map((friend) =>
            grantWishlistAccess(wishlist.id, friend.id, SELECTED_FRIENDS_ACCESS_TYPE),
          ),
        );
        queryClient.invalidateQueries({
          queryKey: ["friends-without-wishlist-access", wishlist.id],
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: ["wishlist-access-list", wishlist.id],
          exact: false,
        });
      }

      clearDraft();
      onClose();
    } catch (error) {
      setAccessError(
        error instanceof Error
          ? error.message
          : t("Could not save selected access.", {
              $id: "wishlist.modal.accessSaveError",
            }),
      );
    } finally {
      setIsGrantingAccess(false);
    }
  }

  async function handleRevokeSpecificAccess(targetUserId: string) {
    setAccessError(null);

    try {
      await revokeAccess.mutateAsync({
        wishlistId: wishlist.id,
        targetUserId,
      });
    } catch (error) {
      setAccessError(
        error instanceof Error
          ? error.message
          : t("Could not remove access.", {
              $id: "wishlist.modal.accessRemoveError",
            }),
      );
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Heading>
              {t("Edit Wishlist", { $id: "wishlist.modal.edit.title" })}
            </Heading>
            <Text variant="caption" tone="muted">
              {t("Update your wishlist details and customize its appearance.", {
                $id: "wishlist.modal.edit.subtitle",
              })}
            </Text>
          </div>
          {isDraftRestored && (
            <div className={styles.draftBanner}>
              <div className={styles.draftBannerMeta}>
                <DraftBadge label={t("Draft", { $id: "draft.badge" })} />
                <span>
                  {isDraftRestored
                    ? t("Draft restored for this wishlist.", {
                        $id: "draft.editWishlist.restored",
                      })
                    : t("Draft is saved for this wishlist.", {
                        $id: "draft.editWishlist.saved",
                      })}
                </span>
              </div>
              <button
                type="button"
                className={styles.draftAction}
                onClick={handleDiscardDraft}
              >
                {t("Discard", { $id: "draft.discard" })}
              </button>
            </div>
          )}
          {isDraftRestored && localImageNeedsReupload && (
            <p className={styles.draftNote}>
              {t("Local image needs to be added again.", {
                $id: "draft.localImageReupload",
              })}
            </p>
          )}
        </div>

        <div
          className={`${styles.field} ${isDraftRestored && restoredFields.name ? styles.draftField : ""}`.trim()}
        >
          <label>
            {t("Wishlist Name", { $id: "wishlist.modal.nameLabel" })}
          </label>
          <input
            placeholder={t("e.g. Birthday Wishes, Home Office Setup", {
              $id: "wishlist.modal.namePlaceholder",
            })}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div
          className={`${styles.field} ${isDraftRestored && restoredFields.description ? styles.draftField : ""}`.trim()}
        >
          <label>
            {t("Description (optional)", {
              $id: "wishlist.modal.descriptionLabel",
            })}
          </label>
          <textarea
            placeholder={t("Add a note for your friends...", {
              $id: "wishlist.modal.descriptionPlaceholder",
            })}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div
          className={`${styles.field} ${isDraftRestored && restoredFields.image ? styles.draftField : ""}`.trim()}
        >
          <div className={styles.labelRow}>
            <label>
              {t("Cover Image", { $id: "wishlist.modal.coverLabel" })}
            </label>
            <FileSizeBadge />
          </div>
          <div className={styles.upload}>
            <label
              className={`${styles.dropArea} ${isDraftRestored && restoredFields.image ? styles.draftDropArea : ""}`.trim()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={t("Wishlist cover preview", {
                    $id: "wishlist.modal.coverAlt",
                  })}
                  className={styles.preview}
                />
              ) : (
                <span>
                  {t("Drop an image or click to upload", {
                    $id: "wishlist.modal.dropImage",
                  })}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFile}
              />
            </label>
          </div>
          <UploadErrorText message={imageError} />
        </div>

        <div
          className={`${styles.field} ${isDraftRestored && restoredFields.eventDate ? styles.draftField : ""}`.trim()}
        >
          <label>
            {t("Event Date (optional)", {
              $id: "wishlist.modal.eventDateLabel",
            })}
          </label>
          <DatePickerField
            value={eventDate}
            onChange={setEventDate}
            triggerClassName={
              isDraftRestored && restoredFields.eventDate
                ? styles.draftDateTrigger
                : undefined
            }
          />
        </div>

        <div
          className={`${styles.section} ${isDraftRestored && restoredFields.privacy ? styles.draftSection : ""}`.trim()}
        >
          <label>{t("Privacy", { $id: "wishlist.modal.privacyLabel" })}</label>
          <div className={styles.privacyOptions}>
            {privacyOptions.map((option) => {
              const Icon = option.icon;

              return (
                <div key={option.value}>
                  {option.value === "Private" &&
                    privacy === "SelectedFriends" &&
                    canManageSelectedFriendsAccess && (
                      <WishlistAccessPicker
                        title={t("Selected friends", {
                          $id: "wishlist.modal.access.title",
                        })}
                        friends={friendOptions}
                        selected={selectedAccessFriends}
                        onChange={(nextSelected) => {
                          setSelectedAccessFriends(nextSelected);
                          setAccessError(null);
                        }}
                        isLoading={friendsWithoutAccessLoading}
                        isError={friendsWithoutAccessError}
                        emptyLabel={t(
                          "All available friends already have access.",
                          {
                            $id: "wishlist.modal.access.emptyFriendsWithoutAccess",
                          },
                        )}
                        errorLabel={t("Could not load friends right now.", {
                          $id: "wishlist.modal.access.loadError",
                        })}
                        existingAccess={specificAccessList}
                        existingAccessTitle={t("Already selected", {
                          $id: "wishlist.modal.access.currentTitle",
                        })}
                        existingAccessEmptyLabel={
                          accessListLoading
                            ? t("Loading current access...", {
                                $id: "wishlist.modal.access.currentLoading",
                              })
                            : t("No selected friends yet.", {
                                $id: "wishlist.modal.access.currentEmpty",
                              })
                        }
                        onRevokeAccess={handleRevokeSpecificAccess}
                        revokingUserId={
                          revokeAccess.variables?.targetUserId ?? null
                        }
                      />
                    )}

                  <PrivacyCard
                    icon={<Icon size={18} />}
                    title={option.title}
                    subtitle={option.subtitle}
                    selected={privacy === option.value}
                    draftHighlighted={
                      isDraftRestored &&
                      restoredFields.privacy &&
                      privacy === option.value
                    }
                    onClick={() => setPrivacy(option.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {canManageSelectedFriendsAccess && accessError && (
          <div className={styles.accessError}>{accessError}</div>
        )}

        <div
          className={`${styles.section} ${isDraftRestored && restoredFields.color ? styles.draftSection : ""}`.trim()}
        >
          <label>
            {t("Cover Color", { $id: "wishlist.modal.coverColor" })}
          </label>
          <div className={styles.colors}>
            {availableColors.map((c) => (
              <div
                key={c}
                className={`${styles.color} ${styles[c]} ${color === c ? styles.active : ""} ${isDraftRestored && restoredFields.color && color === c ? styles.draftColorActive : ""}`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            {t("Cancel", { $id: "common.cancel" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !name.trim() ||
              (!hasChanges && !hasAccessChanges) ||
              isPending ||
              isGrantingAccess ||
              (canManageSelectedFriendsAccess && revokeAccess.isPending) ||
              Boolean(imageError)
            }
          >
            {isPending || isGrantingAccess
              ? t("Saving...", { $id: "common.saving" })
              : t("Save Changes", { $id: "wishlist.modal.saveChanges" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PrivacyCard({
  icon,
  title,
  subtitle,
  selected,
  draftHighlighted,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  draftHighlighted?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`${styles.privacyCard} ${selected ? styles.selected : ""} ${draftHighlighted ? styles.draftPrivacySelected : ""}`.trim()}
      onClick={onClick}
    >
      <div className={styles.privacyIcon}>{icon}</div>
      <div>
        <strong>{title}</strong>
        <p>{subtitle}</p>
      </div>
      {selected && (
        <div className={styles.check}>
          <Check size={16} />
        </div>
      )}
    </div>
  );
}
