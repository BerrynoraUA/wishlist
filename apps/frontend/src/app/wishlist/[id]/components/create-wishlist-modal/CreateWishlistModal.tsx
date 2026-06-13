"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGT } from "gt-next";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/use-subscription";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { DraftBadge } from "@/components/ui/DraftBadge/DraftBadge";
import { Heading, Text } from "@/components/ui/Typography";
import { grantWishlistAccess } from "@/api/wishlist";
import { grantWishlistGroupAccess } from "@/api/friends";
import { useFriendGroups, useFriends } from "@/hooks/use-friends";
import { useCreateWishlist } from "@/hooks/use-wishlists";
import { useCurrentUserId } from "@/hooks/use-user";
import { useSessionDraft } from "@/hooks/use-session-draft";
import { useSettings } from "@/hooks/use-settings";
import { Check, ChevronDown, Lock, Search, X } from "lucide-react";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import { DatePickerField } from "@/components/ui/Calendar/DatePickerField";
import { FileSizeBadge } from "@/components/ui/FileSizeBadge/FileSizeBadge";
import { UploadErrorText } from "@/components/ui/UploadErrorText/UploadErrorText";
import { validateImageUploadFile } from "@/lib/image-upload";
import { useUserGuideStepCompletion } from "@/components/user-guide/UserGuideProvider";
import { WishlistDraft } from "@/types/wishlist";
import type { WishlistAccessUser } from "@/api/types/friends";
import {
  WISHLIST_COLOR_OPTIONS,
  SELECTED_FRIENDS_ACCESS_TYPE,
  WISHLIST_VISIBILITY_BY_PRIVACY,
  getWishlistAccentByColor,
  getWishlistColorByIndex,
  getWishlistPrivacyOptions,
  type WishlistColorOption,
  type WishlistPrivacyOption,
} from "@/lib/constants/wishlist";
import styles from "./CreateWishlistModal.module.scss";

export type WishlistAccessFriendOption = {
  id: string;
  nickname: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreateWishlistModal({ open, onClose }: Props) {
  const { data: settings } = useSettings();
  const defaultColor = getWishlistColorByIndex(settings?.default_wishlist_color);

  if (!open) return null;

  return (
    <CreateWishlistForm
      key={`create-wishlist-${defaultColor}`}
      defaultColor={defaultColor}
      onClose={onClose}
    />
  );
}

function CreateWishlistForm({
  defaultColor,
  onClose,
}: {
  defaultColor: WishlistColorOption;
  onClose: () => void;
}) {
  const t = useGT();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: currentUserId = "" } = useCurrentUserId();
  const { isPro } = useSubscription();
  const completeOpenWishlistStep = useUserGuideStepCompletion(2);
  const completeCreateWishlistStep = useUserGuideStepCompletion(3);
  const privacyOptions = getWishlistPrivacyOptions(t);
  const isColorGated = SUBSCRIPTIONS_UI_ENABLED && !isPro;
  const initialColor = isColorGated ? "pink" : defaultColor;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<WishlistPrivacyOption>("Public");
  const [color, setColor] = useState<WishlistColorOption>(initialColor);
  const [eventDate, setEventDate] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [localImageNeedsReupload, setLocalImageNeedsReupload] = useState(false);
  const [selectedAccessFriends, setSelectedAccessFriends] = useState<WishlistAccessFriendOption[]>(
    [],
  );
  const [selectedAccessGroups, setSelectedAccessGroups] = useState<WishlistAccessFriendOption[]>(
    [],
  );
  const [accessTab, setAccessTab] = useState<"friends" | "groups">("friends");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);

  const {
    data: friends = [],
    isLoading: friendsLoading,
    isError: friendsError,
  } = useFriends({
    skip: 0,
    take: 100,
  });
  const {
    data: groups = [],
    isLoading: groupsLoading,
    isError: groupsError,
  } = useFriendGroups({
    skip: 0,
    take: 100,
  });
  const { mutateAsync, isPending } = useCreateWishlist();

  const friendOptions = useMemo<WishlistAccessFriendOption[]>(
    () =>
      friends
        .map((friend) => ({
          id: friend.friend_id,
          nickname: friend.nickname ?? friend.display_name ?? "friend",
        }))
        .filter((friend) => Boolean(friend.id)),
    [friends],
  );
  const groupOptions = useMemo<WishlistAccessFriendOption[]>(
    () =>
      groups.map((group) => ({
        id: group.id,
        nickname: group.name,
      })),
    [groups],
  );

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
      return Boolean(
        draft.name.trim() ||
        draft.description.trim() ||
        draft.privacy !== "Public" ||
        draft.color !== initialColor ||
        draft.eventDate ||
        draft.imagePreview ||
        draft.hadLocalImage,
      );
    },
    [initialColor],
  );

  const applyDraft = useCallback((draft: WishlistDraft) => {
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
  }, []);

  const { hasDraft, isDraftRestored, clearDraft } = useSessionDraft({
    userId: currentUserId,
    kind: "create-wishlist",
    open: true,
    value: draftValue,
    onRestore: applyDraft,
    isMeaningful: isMeaningfulDraft,
  });

  useEffect(() => {
    completeOpenWishlistStep();
  }, [completeOpenWishlistStep]);

  useEffect(() => {
    return () => {
      if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    };
  }, [imageObjectUrl]);

  useEffect(() => {
    if (privacy !== "SelectedFriends" && selectedAccessFriends.length > 0) {
      setSelectedAccessFriends([]);
    }
    if (privacy !== "SelectedFriends" && selectedAccessGroups.length > 0) {
      setSelectedAccessGroups([]);
    }
  }, [privacy, selectedAccessFriends.length, selectedAccessGroups.length]);

  function resetForm() {
    setName("");
    setDescription("");
    setPrivacy("Public");
    setColor(initialColor);
    setEventDate("");
    setImagePreview("");
    setImageFile(null);
    setImageError(null);
    setLocalImageNeedsReupload(false);
    setSelectedAccessFriends([]);
    setSelectedAccessGroups([]);
    setAccessTab("friends");
    setAccessError(null);
    if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
    setImageObjectUrl(null);
  }

  function handleDiscardDraft() {
    clearDraft();
    resetForm();
  }

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

  async function handleSubmit() {
    if (!name.trim() || isPending || isGrantingAccess) return;

    const nextImageError = validateImageUploadFile(imageFile);
    if (nextImageError) {
      setImageError(nextImageError);
      return;
    }

    const imageUrlToSave = imageFile ? null : imagePreview || null;

    setAccessError(null);

    try {
      const wishlist = await mutateAsync({
        title: name.trim(),
        description: description.trim() || undefined,
        visibility: WISHLIST_VISIBILITY_BY_PRIVACY[privacy],
        image: imageFile,
        imageUrl: imageUrlToSave,
        accent: getWishlistAccentByColor(color),
        event_date: eventDate ? new Date(eventDate) : undefined,
      });

      if (
        privacy === "SelectedFriends" &&
        (selectedAccessFriends.length > 0 || selectedAccessGroups.length > 0)
      ) {
        setIsGrantingAccess(true);
        await Promise.all([
          ...selectedAccessFriends.map((friend) =>
            grantWishlistAccess(wishlist.id, friend.id, SELECTED_FRIENDS_ACCESS_TYPE),
          ),
          ...selectedAccessGroups.map((group) => grantWishlistGroupAccess(wishlist.id, group.id)),
        ]);
        queryClient.invalidateQueries({
          queryKey: ["friends-without-wishlist-access"],
        });
        queryClient.invalidateQueries({
          queryKey: ["friend-groups-without-wishlist-access"],
        });
        queryClient.invalidateQueries({ queryKey: ["wishlist-access-list"] });
      }

      clearDraft();
      resetForm();
      completeCreateWishlistStep();
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

  function handleClose() {
    onClose();
  }

  function handleColorSelect(nextColor: WishlistColorOption) {
    if (isColorGated && nextColor !== "pink") {
      router.push("/subscription");
      return;
    }

    setColor(nextColor);
  }

  return (
    <Modal open onClose={handleClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <Heading>{t("Create New Wishlist", { $id: "wishlist.modal.create.title" })}</Heading>
            <Text variant="caption" tone="muted">
              {t("Give your wishlist a name and customize its appearance.", {
                $id: "wishlist.modal.create.subtitle",
              })}
            </Text>
          </div>
          {hasDraft && (
            <div className={styles.draftBanner}>
              <div className={styles.draftBannerMeta}>
                <DraftBadge label={t("Draft", { $id: "draft.badge" })} />
                <span>
                  {isDraftRestored
                    ? t("Draft restored for this wishlist.", {
                        $id: "draft.createWishlist.restored",
                      })
                    : t("Draft is saved for this wishlist.", {
                        $id: "draft.createWishlist.saved",
                      })}
                </span>
              </div>
              <button type="button" className={styles.draftAction} onClick={handleDiscardDraft}>
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

        {/* Name */}
        <div className={styles.field}>
          <label>{t("Wishlist Name", { $id: "wishlist.modal.nameLabel" })}</label>
          <input
            placeholder={t("e.g. Birthday Wishes, Home Office Setup", {
              $id: "wishlist.modal.namePlaceholder",
            })}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className={styles.field}>
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

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label>
              {t("Cover Image (drag & drop or click)", {
                $id: "wishlist.modal.create.coverLabel",
              })}
            </label>
            <FileSizeBadge />
          </div>
          <div className={styles.upload}>
            <label className={styles.dropArea}>
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

        {/* Event Date */}
        <div className={styles.field}>
          <label>
            {t("Event Date (optional)", {
              $id: "wishlist.modal.eventDateLabel",
            })}
          </label>
          <DatePickerField value={eventDate} onChange={setEventDate} />
        </div>

        {/* Privacy */}
        <div className={styles.section}>
          <label>{t("Privacy", { $id: "wishlist.modal.privacyLabel" })}</label>

          <div className={styles.privacyOptions}>
            {privacyOptions.map((option) => {
              const Icon = option.icon;

              return (
                <div key={option.value}>
                  {option.value === "Private" && privacy === "SelectedFriends" && (
                    <div className={styles.accessSelectorShell}>
                      <div className={styles.accessTabs}>
                        <button
                          type="button"
                          className={`${styles.accessTab} ${accessTab === "friends" ? styles.accessTabActive : ""}`}
                          onClick={() => setAccessTab("friends")}
                        >
                          {t("Friends", {
                            $id: "wishlist.modal.access.friendsTab",
                          })}
                        </button>
                        <button
                          type="button"
                          className={`${styles.accessTab} ${accessTab === "groups" ? styles.accessTabActive : ""}`}
                          onClick={() => setAccessTab("groups")}
                        >
                          {t("Groups", {
                            $id: "wishlist.modal.access.groupsTab",
                          })}
                        </button>
                      </div>
                      {accessTab === "friends" ? (
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
                          isLoading={friendsLoading}
                          isError={friendsError}
                          emptyLabel={t("No friends found yet.", {
                            $id: "wishlist.modal.access.emptyFriends",
                          })}
                          errorLabel={t("Could not load friends right now.", {
                            $id: "wishlist.modal.access.loadError",
                          })}
                        />
                      ) : (
                        <WishlistAccessPicker
                          title={t("Selected groups", {
                            $id: "wishlist.modal.access.groupsTitle",
                          })}
                          friends={groupOptions}
                          selected={selectedAccessGroups}
                          onChange={(nextSelected) => {
                            setSelectedAccessGroups(nextSelected);
                            setAccessError(null);
                          }}
                          isLoading={groupsLoading}
                          isError={groupsError}
                          emptyLabel={t("No groups found yet.", {
                            $id: "wishlist.modal.access.emptyGroups",
                          })}
                          errorLabel={t("Could not load groups right now.", {
                            $id: "wishlist.modal.access.groupsLoadError",
                          })}
                          searchPlaceholder={t("Search groups", {
                            $id: "wishlist.modal.access.searchGroups",
                          })}
                          selectedLabelPrefix=""
                        />
                      )}
                    </div>
                  )}

                  <PrivacyCard
                    icon={<Icon size={18} />}
                    title={option.title}
                    subtitle={option.subtitle}
                    selected={privacy === option.value}
                    onClick={() => setPrivacy(option.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {accessError && <div className={styles.accessError}>{accessError}</div>}

        {/* Colors */}
        <div className={styles.section}>
          <label>{t("Cover Color", { $id: "wishlist.modal.coverColor" })}</label>

          <div className={styles.colors}>
            {WISHLIST_COLOR_OPTIONS.map((c) => {
              const locked = isColorGated && c !== "pink";

              return (
                <button
                  key={c}
                  type="button"
                  className={`${styles.color} ${styles[c]} ${color === c ? styles.active : ""} ${locked ? styles.locked : ""}`}
                  onClick={() => handleColorSelect(c)}
                  title={
                    locked
                      ? t("Upgrade to Pro", {
                          $id: "wishlist.modal.coverColor.upgradeToPro",
                        })
                      : undefined
                  }
                >
                  {locked ? <Lock size={14} /> : color === c && <Check size={16} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleClose}>
            {t("Cancel", { $id: "common.cancel" })}
          </Button>
          <Button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!name.trim() || isPending || isGrantingAccess || Boolean(imageError)}
            data-guide-target="create-wishlist-submit"
          >
            {isPending || isGrantingAccess
              ? t("Creating...", { $id: "wishlist.modal.creating" })
              : t("Create Wishlist", { $id: "wishlist.modal.create.submit" })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function WishlistAccessPicker({
  title,
  friends,
  selected,
  onChange,
  isLoading,
  isError,
  emptyLabel,
  errorLabel,
  existingAccess = [],
  existingAccessTitle,
  existingAccessEmptyLabel,
  onRevokeAccess,
  revokingUserId,
  searchPlaceholder,
  selectedLabelPrefix = "",
}: {
  title: string;
  friends: WishlistAccessFriendOption[];
  selected: WishlistAccessFriendOption[];
  onChange: (friends: WishlistAccessFriendOption[]) => void;
  isLoading: boolean;
  isError: boolean;
  emptyLabel: string;
  errorLabel: string;
  existingAccess?: WishlistAccessUser[];
  existingAccessTitle?: string;
  existingAccessEmptyLabel?: string;
  onRevokeAccess?: (userId: string) => void;
  revokingUserId?: string | null;
  searchPlaceholder?: string;
  selectedLabelPrefix?: string;
}) {
  const t = useGT();
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedIds = useMemo(() => new Set(selected.map((friend) => friend.id)), [selected]);
  const filteredFriends = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 3) return friends;
    return friends.filter((friend) => friend.nickname.toLowerCase().includes(normalizedQuery));
  }, [friends, query]);
  const availableFriends = useMemo(
    () => filteredFriends.filter((friend) => !selectedIds.has(friend.id)),
    [filteredFriends, selectedIds],
  );

  useEffect(() => {
    if (!dropdownOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [dropdownOpen]);

  function toggleFriend(friend: WishlistAccessFriendOption) {
    if (selectedIds.has(friend.id)) {
      onChange(selected.filter((item) => item.id !== friend.id));
      return;
    }

    setQuery("");
    setDropdownOpen(false);
    onChange([...selected, friend]);
  }

  return (
    <div className={styles.accessPanel}>
      <div className={styles.accessPanelHeader}>
        <div>
          <label>{title}</label>
        </div>
        {selected.length > 0 && (
          <span className={styles.accessCount}>
            {t("{n} selected", {
              n: selected.length,
              $id: "wishlist.modal.access.selected",
            })}
          </span>
        )}
      </div>

      <div ref={pickerRef} className={styles.accessSelector}>
        <div className={styles.accessSearchField}>
          <Search size={16} />
          <input
            value={query}
            onFocus={() => setDropdownOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setDropdownOpen(true);
            }}
            placeholder={
              searchPlaceholder ??
              t("Search friends", {
                $id: "wishlist.modal.access.search",
              })
            }
          />
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            aria-label={t("Open access selector", {
              $id: "wishlist.modal.access.openSelector",
            })}
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {dropdownOpen && (
          <div className={styles.accessDropdown}>
            <div className={styles.accessDropdownList}>
              {isLoading && (
                <div className={styles.accessEmpty}>
                  {t("Loading friends...", { $id: "wishlist.modal.access.loading" })}
                </div>
              )}
              {!isLoading && isError && <div className={styles.accessEmpty}>{errorLabel}</div>}
              {!isLoading && !isError && availableFriends.length === 0 && (
                <div className={styles.accessEmpty}>{emptyLabel}</div>
              )}
              {!isLoading &&
                !isError &&
                availableFriends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    className={styles.accessFriend}
                    onClick={() => toggleFriend(friend)}
                  >
                    <span className={styles.accessAvatar}>
                      {friend.nickname[0]?.toUpperCase() ?? "?"}
                    </span>
                    <span className={styles.accessFriendName}>
                      {selectedLabelPrefix}
                      {friend.nickname}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className={styles.accessSelectedList}>
          {selected.map((friend) => (
            <span key={friend.id} className={styles.accessSelectedChip}>
              <span>
                {selectedLabelPrefix}
                {friend.nickname}
              </span>
              <button
                type="button"
                onClick={() => toggleFriend(friend)}
                aria-label={t("Remove access for {handle}", {
                  handle: `${selectedLabelPrefix}${friend.nickname}`,
                  $id: "wishlist.modal.access.removeAria",
                })}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {existingAccessTitle && (
        <div className={styles.currentAccessBlock}>
          <div className={styles.currentAccessHeader}>
            <span>{existingAccessTitle}</span>
            {existingAccess.length > 0 && <strong>{existingAccess.length}</strong>}
          </div>
          {existingAccess.length === 0 ? (
            <div className={styles.accessEmpty}>{existingAccessEmptyLabel}</div>
          ) : (
            <div className={styles.currentAccessList}>
              {existingAccess.map((user) => (
                <div key={user.id} className={styles.currentAccessRow}>
                  <span className={styles.accessFriendName}>
                    {selectedLabelPrefix}
                    {user.nickname}
                  </span>
                  {onRevokeAccess && (
                    <button
                      type="button"
                      className={styles.accessRemoveButton}
                      onClick={() => onRevokeAccess(user.id)}
                      disabled={revokingUserId === user.id}
                      aria-label={t("Remove access for {handle}", {
                        handle: `${selectedLabelPrefix}${user.nickname}`,
                        $id: "wishlist.modal.access.removeAria",
                      })}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrivacyCard({
  icon,
  title,
  subtitle,
  selected,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div className={`${styles.privacyCard} ${selected ? styles.selected : ""}`} onClick={onClick}>
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
