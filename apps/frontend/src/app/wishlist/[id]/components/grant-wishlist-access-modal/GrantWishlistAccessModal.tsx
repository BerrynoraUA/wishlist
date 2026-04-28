"use client";

import { useEffect, useMemo, useState } from "react";
import { useGT } from "gt-next";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Search, Shield, SquarePen, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { useSubscription } from "@/hooks/use-subscription";
import { useFriendsWithoutWishlistAccess, useWishlistAccessList } from "@/hooks/use-friends";
import { useGrantWishlistAccess, useRevokeWishlistAccess } from "@/hooks/use-wishlists";
import { hasReachedSearchThreshold, normalizeSearchQuery } from "@/lib/helpers/search";
import { SUBSCRIPTIONS_UI_ENABLED } from "@/lib/features";
import {
  SELECTED_FRIENDS_ACCESS_TYPE,
  SELECTED_GROUPS_ACCESS_TYPE,
} from "@/lib/constants/wishlist";
import type { ProfileSearchResult } from "@/api/types/friends";
import styles from "./GrantWishlistAccessModal.module.scss";

type AccessType = 0 | 1;

type Props = {
  open: boolean;
  onClose: () => void;
  wishlistId: string;
  wishlistTitle: string;
};

const FRIEND_PAGE_SIZE = 100;

export function GrantWishlistAccessModal({ open, onClose, wishlistId, wishlistTitle }: Props) {
  const t = useGT();
  const router = useRouter();
  const { isPro } = useSubscription();
  const [query, setQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<ProfileSearchResult | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accessType, setAccessType] = useState<AccessType>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: friends = [],
    isLoading: friendsLoading,
    isError: friendsError,
  } = useFriendsWithoutWishlistAccess({
    wishlistId,
    search: query,
    skip: 0,
    take: FRIEND_PAGE_SIZE,
  });
  const {
    data: accessList = [],
    isLoading: accessListLoading,
    isError: accessListError,
  } = useWishlistAccessList(wishlistId);
  const grantAccess = useGrantWishlistAccess();
  const revokeAccess = useRevokeWishlistAccess();
  const isGrantAccessGated = SUBSCRIPTIONS_UI_ENABLED && !isPro;

  const accessOptions = useMemo(
    () =>
      [
        {
          value: 0 as const,
          label: t("View access", { $id: "wishlist.grantAccess.viewLabel" }),
          description: t("Can open and follow updates.", {
            $id: "wishlist.grantAccess.viewDescription",
          }),
          icon: Shield,
        },
        {
          value: 1 as const,
          label: t("Edit access", { $id: "wishlist.grantAccess.editLabel" }),
          description: t("Can add and manage items.", {
            $id: "wishlist.grantAccess.editDescription",
          }),
          icon: SquarePen,
        },
      ] as const,
    [t],
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedFriend(null);
      setDropdownOpen(false);
      setAccessType(0);
      setErrorMessage(null);
      grantAccess.reset();
      revokeAccess.reset();
    }
  }, [open]);

  const filteredFriends = useMemo(() => friends, [friends]);
  const visibleAccessList = useMemo(
    () =>
      accessList.filter(
        (user) =>
          user.access_type !== SELECTED_FRIENDS_ACCESS_TYPE &&
          user.access_type !== SELECTED_GROUPS_ACCESS_TYPE,
      ),
    [accessList],
  );
  const canShowFriends = query.trim().length === 0 || hasReachedSearchThreshold(query);

  const canSubmit = Boolean(selectedFriend) && !grantAccess.isPending;
  const showDropdown = dropdownOpen && !selectedFriend && canShowFriends;

  async function handleSubmit() {
    if (!selectedFriend) return;

    setErrorMessage(null);

    try {
      await grantAccess.mutateAsync({
        wishlistId,
        grantedToUserId: selectedFriend.id,
        accessType,
      });
      onClose();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("Failed to grant access.", {
              $id: "wishlist.grantAccess.grantFailedFallback",
            });
      setErrorMessage(message);
    }
  }

  async function handleRevokeAccess(targetUserId: string) {
    if (!targetUserId) {
      setErrorMessage(
        t("Missing target user id for revoke access.", {
          $id: "wishlist.grantAccess.revokeMissingUser",
        }),
      );
      return;
    }

    setErrorMessage(null);

    try {
      await revokeAccess.mutateAsync({
        wishlistId,
        targetUserId,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("Failed to revoke access.", {
              $id: "wishlist.grantAccess.revokeFailedFallback",
            });
      setErrorMessage(message);
    }
  }

  const accessRoleLabel = (role: string) =>
    role === "editor"
      ? t("Editor", { $id: "wishlist.grantAccess.roleEditor" })
      : role === "viewer"
        ? t("Viewer", { $id: "wishlist.grantAccess.roleViewer" })
        : role;

  if (isGrantAccessGated) {
    return (
      <Modal open={open} onClose={onClose}>
        <div className={styles.container}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>
              {t("Pro feature", { $id: "wishlist.grantAccess.proEyebrow" })}
            </p>
            <h2>
              {t("Collaborative wishlists", {
                $id: "wishlist.grantAccess.proTitle",
              })}
            </h2>
            <p className={styles.description}>
              {t(
                "Granting view or edit access to other people is available only on the Pro plan.",
                {
                  $id: "wishlist.grantAccess.proDescription",
                },
              )}
            </p>
            <div className={styles.titleCard}>
              <span className={styles.titleLabel}>
                {t("Wishlist", { $id: "wishlist.grantAccess.wishlistLabel" })}
              </span>
              <strong className={styles.inlineTitle}>{wishlistTitle}</strong>
            </div>
          </div>

          <div className={styles.upgradeCard}>
            <p>
              {t("Upgrade to Pro to invite collaborators and manage wishlist access levels.", {
                $id: "wishlist.grantAccess.upgradeCopy",
              })}
            </p>
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose}>
              {t("Cancel", { $id: "common.cancel" })}
            </Button>
            <Button onClick={() => router.push("/subscription")}>
              {t("Upgrade to Pro", {
                $id: "wishlist.grantAccess.upgradeAction",
              })}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>
            {t("Access control", { $id: "wishlist.grantAccess.eyebrow" })}
          </p>
          <h2>{t("Grant wishlist access", { $id: "wishlist.grantAccess.title" })}</h2>
          <p className={styles.description}>
            {t("Pick a friend and choose whether they can view or edit.", {
              $id: "wishlist.grantAccess.subtitle",
            })}
          </p>
          <div className={styles.titleCard}>
            <span className={styles.titleLabel}>
              {t("Wishlist", { $id: "wishlist.grantAccess.wishlistLabel" })}
            </span>
            <strong className={styles.inlineTitle}>{wishlistTitle}</strong>
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>
            {t("Choose a friend", { $id: "wishlist.grantAccess.chooseFriend" })}
          </label>
          <div className={styles.searchField}>
            <Search size={16} />
            <input
              value={selectedFriend ? `@${selectedFriend.nickname}` : query}
              onChange={(event) => {
                const nextQuery = event.target.value;
                setSelectedFriend(null);
                setQuery(nextQuery);
                setDropdownOpen(
                  nextQuery.trim().length === 0 || hasReachedSearchThreshold(nextQuery),
                );
                setErrorMessage(null);
              }}
              onFocus={() =>
                setDropdownOpen(query.trim().length === 0 || hasReachedSearchThreshold(query))
              }
              placeholder={t("Search among your friends", {
                $id: "wishlist.grantAccess.searchPlaceholder",
              })}
            />
            <button
              type="button"
              className={`${styles.chevronButton} iconTooltipTrigger`}
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label={t("Toggle friend list", {
                $id: "wishlist.grantAccess.toggleFriendList",
              })}
              data-tooltip={
                dropdownOpen
                  ? t("Hide friend list", {
                      $id: "wishlist.grantAccess.hideFriendList",
                    })
                  : t("Show friend list", {
                      $id: "wishlist.grantAccess.showFriendList",
                    })
              }
            >
              <ChevronDown size={16} className={dropdownOpen ? styles.chevronOpen : ""} />
            </button>

            {showDropdown && (
              <div className={styles.searchDropdown}>
                {friendsLoading && (
                  <div className={styles.emptyState}>
                    <Loader2 size={16} className={styles.spinner} />
                  </div>
                )}

                {!friendsLoading && friendsError && (
                  <div className={styles.emptyState}>
                    {t("Could not load your friends right now.", {
                      $id: "wishlist.grantAccess.friendsLoadError",
                    })}
                  </div>
                )}

                {!friendsLoading && !friendsError && filteredFriends.length === 0 && (
                  <div className={styles.emptyState}>
                    {t("No matching friends found.", {
                      $id: "wishlist.grantAccess.noMatchingFriends",
                    })}
                  </div>
                )}

                {!friendsLoading && !friendsError && filteredFriends.length > 0 && (
                  <div className={styles.resultsList}>
                    {filteredFriends.map((friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        className={styles.resultItem}
                        onClick={() => {
                          setSelectedFriend(friend);
                          setQuery(normalizeSearchQuery(friend.nickname));
                          setDropdownOpen(false);
                          setErrorMessage(null);
                        }}
                      >
                        <div className={styles.avatarStub}>
                          {(friend.nickname?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div className={styles.resultMeta}>
                          <span className={styles.resultName}>@{friend.nickname}</span>
                          <span className={styles.resultNickname}>
                            {t("No access yet", {
                              $id: "wishlist.grantAccess.noAccessYet",
                            })}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedFriend && (
            <div className={styles.selectedCard}>
              <div className={styles.selectedIdentity}>
                <div className={styles.avatarStub}>
                  {(selectedFriend.nickname?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <p>@{selectedFriend.nickname}</p>
                  <span>
                    {t("Ready to grant access", {
                      $id: "wishlist.grantAccess.readyToGrant",
                    })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => {
                  setSelectedFriend(null);
                  setQuery("");
                  setDropdownOpen(false);
                }}
              >
                {t("Change", { $id: "wishlist.grantAccess.changeFriend" })}
              </button>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeading}>
            <label className={styles.label}>
              {t("People with access", {
                $id: "wishlist.grantAccess.peopleWithAccess",
              })}
            </label>
            {!accessListLoading && visibleAccessList.length > 0 && (
              <span className={styles.sectionMeta}>
                {t("{n} total", {
                  n: visibleAccessList.length,
                  $id: "wishlist.grantAccess.accessTotal",
                })}
              </span>
            )}
          </div>

          <div className={styles.accessListCard}>
            {accessListLoading && (
              <div className={styles.emptyState}>
                <Loader2 size={16} className={styles.spinner} />
              </div>
            )}

            {!accessListLoading && accessListError && (
              <div className={styles.emptyState}>
                {t("Could not load wishlist access right now.", {
                  $id: "wishlist.grantAccess.accessListError",
                })}
              </div>
            )}

            {!accessListLoading && !accessListError && visibleAccessList.length === 0 && (
              <div className={styles.emptyState}>
                {t("No one has access yet.", {
                  $id: "wishlist.grantAccess.noOneHasAccess",
                })}
              </div>
            )}

            {!accessListLoading && !accessListError && visibleAccessList.length > 0 && (
              <div className={styles.accessList}>
                {visibleAccessList.map((user, index) => {
                  const targetUserId = user.id;
                  const rowKey = `${wishlistId}-${targetUserId || user.nickname}-${user.access_role}-${index}`;

                  return (
                    <div key={rowKey} className={styles.accessUserRow}>
                      <div className={styles.selectedIdentity}>
                        <div className={styles.avatarStub}>
                          {(user.nickname?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div>
                          <p>@{user.nickname}</p>
                          <span>
                            {t("Already has access", {
                              $id: "wishlist.grantAccess.alreadyHasAccess",
                            })}
                          </span>
                        </div>
                      </div>
                      <div className={styles.accessUserActions}>
                        <span className={styles.roleBadge}>
                          {accessRoleLabel(user.access_role)}
                        </span>
                        <button
                          type="button"
                          className={`${styles.revokeButton} iconTooltipTrigger`}
                          onClick={() => handleRevokeAccess(targetUserId)}
                          disabled={
                            revokeAccess.isPending &&
                            revokeAccess.variables?.targetUserId === targetUserId
                          }
                          aria-label={t("Revoke access for {handle}", {
                            handle: `@${user.nickname}`,
                            $id: "wishlist.grantAccess.revokeAria",
                          })}
                          data-tooltip={t("Revoke access for {handle}", {
                            handle: `@${user.nickname}`,
                            $id: "wishlist.grantAccess.revokeTooltip",
                          })}
                        >
                          {revokeAccess.isPending &&
                          revokeAccess.variables?.targetUserId === targetUserId ? (
                            <Loader2 size={14} className={styles.spinner} />
                          ) : (
                            <X size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>
            {t("Access level", { $id: "wishlist.grantAccess.accessLevel" })}
          </label>
          <div className={styles.accessGrid}>
            {accessOptions.map((option) => {
              const Icon = option.icon;
              const active = accessType === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.accessCard} ${active ? styles.accessCardActive : ""}`}
                  onClick={() => setAccessType(option.value)}
                >
                  <div className={styles.accessIcon}>
                    <Icon size={16} />
                  </div>
                  <div className={styles.accessContent}>
                    <span className={styles.accessLabel}>{option.label}</span>
                    <span className={styles.accessDescription}>{option.description}</span>
                  </div>
                  {active && <Check size={16} className={styles.accessCheck} />}
                </button>
              );
            })}
          </div>
        </div>

        {errorMessage && <div className={styles.error}>{errorMessage}</div>}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={grantAccess.isPending}>
            {t("Cancel", { $id: "common.cancel" })}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {grantAccess.isPending
              ? t("Granting access...", {
                  $id: "wishlist.grantAccess.granting",
                })
              : t("Confirm access", {
                  $id: "wishlist.grantAccess.confirmAccess",
                })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
