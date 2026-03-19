"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Search,
  Shield,
  SquarePen,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import {
  useFriendsWithoutWishlistAccess,
  useWishlistAccessList,
} from "@/hooks/use-friends";
import {
  useGrantWishlistAccess,
  useRevokeWishlistAccess,
} from "@/hooks/use-wishlists";
import type { ProfileSearchResult } from "@/api/types/friends";
import styles from "./GrantWishlistAccessModal.module.scss";

type AccessType = 0 | 1;

type Props = {
  open: boolean;
  onClose: () => void;
  wishlistId: string;
  wishlistTitle: string;
};

const ACCESS_OPTIONS: Array<{
  value: AccessType;
  label: string;
  description: string;
  icon: typeof Shield;
}> = [
  {
    value: 0,
    label: "View access",
    description: "Can open the wishlist and keep track of its updates.",
    icon: Shield,
  },
  {
    value: 1,
    label: "Edit access",
    description: "Can add, update, and manage items in this wishlist.",
    icon: SquarePen,
  },
];

const FRIEND_PAGE_SIZE = 100;

export function GrantWishlistAccessModal({
  open,
  onClose,
  wishlistId,
  wishlistTitle,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedFriend, setSelectedFriend] =
    useState<ProfileSearchResult | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accessType, setAccessType] = useState<AccessType>(1);
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

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedFriend(null);
      setDropdownOpen(false);
      setAccessType(1);
      setErrorMessage(null);
      grantAccess.reset();
      revokeAccess.reset();
    }
  }, [open]);

  const filteredFriends = useMemo(() => friends, [friends]);

  const canSubmit = Boolean(selectedFriend) && !grantAccess.isPending;
  const showDropdown =
    dropdownOpen &&
    !selectedFriend &&
    (Boolean(query.trim()) || friendsLoading || filteredFriends.length > 0);

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
        error instanceof Error ? error.message : "Failed to grant access.";
      setErrorMessage(message);
    }
  }

  async function handleRevokeAccess(targetUserId: string) {
    if (!targetUserId) {
      setErrorMessage("Missing target user id for revoke access.");
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
        error instanceof Error ? error.message : "Failed to revoke access.";
      setErrorMessage(message);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Access control</p>
          <h2>Grant wishlist access</h2>
          <p className={styles.description}>
            Choose a friend and decide whether they can only view this wishlist
            or also edit it.
          </p>
          <div className={styles.titleCard}>
            <span className={styles.titleLabel}>Wishlist</span>
            <strong className={styles.inlineTitle}>{wishlistTitle}</strong>
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>Choose a friend</label>
          <div className={styles.searchField}>
            <Search size={16} />
            <input
              value={selectedFriend ? `@${selectedFriend.nickname}` : query}
              onChange={(event) => {
                setSelectedFriend(null);
                setQuery(event.target.value);
                setDropdownOpen(true);
                setErrorMessage(null);
              }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Search among your friends"
            />
            <button
              type="button"
              className={styles.chevronButton}
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label="Toggle friend list"
            >
              <ChevronDown
                size={16}
                className={dropdownOpen ? styles.chevronOpen : ""}
              />
            </button>

            {showDropdown && (
              <div className={styles.searchDropdown}>
                {friendsLoading && (
                  <div className={styles.emptyState}>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Loading friends...</span>
                  </div>
                )}

                {!friendsLoading && friendsError && (
                  <div className={styles.emptyState}>
                    Could not load your friends right now.
                  </div>
                )}

                {!friendsLoading &&
                  !friendsError &&
                  filteredFriends.length === 0 && (
                    <div className={styles.emptyState}>
                      No matching friends found.
                    </div>
                  )}

                {!friendsLoading &&
                  !friendsError &&
                  filteredFriends.length > 0 && (
                    <div className={styles.resultsList}>
                      {filteredFriends.map((friend) => (
                        <button
                          key={friend.id}
                          type="button"
                          className={styles.resultItem}
                          onClick={() => {
                            setSelectedFriend(friend);
                            setQuery(friend.nickname);
                            setDropdownOpen(false);
                            setErrorMessage(null);
                          }}
                        >
                          <div className={styles.avatarStub}>
                            {(friend.nickname?.[0] ?? "?").toUpperCase()}
                          </div>
                          <div className={styles.resultMeta}>
                            <span className={styles.resultName}>
                              @{friend.nickname}
                            </span>
                            <span className={styles.resultNickname}>
                              Available for access
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
                  <span>Friend without access yet</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => {
                  setSelectedFriend(null);
                  setQuery("");
                  setDropdownOpen(true);
                }}
              >
                Change
              </button>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeading}>
            <label className={styles.label}>People with access</label>
            {!accessListLoading && accessList.length > 0 && (
              <span className={styles.sectionMeta}>
                {accessList.length} total
              </span>
            )}
          </div>

          <div className={styles.accessListCard}>
            {accessListLoading && (
              <div className={styles.emptyState}>
                <Loader2 size={16} className={styles.spinner} />
                <span>Loading access list...</span>
              </div>
            )}

            {!accessListLoading && accessListError && (
              <div className={styles.emptyState}>
                Could not load wishlist access right now.
              </div>
            )}

            {!accessListLoading &&
              !accessListError &&
              accessList.length === 0 && (
                <div className={styles.emptyState}>No one has access yet.</div>
              )}

            {!accessListLoading &&
              !accessListError &&
              accessList.length > 0 && (
                <div className={styles.accessList}>
                  {accessList.map((user, index) => {
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
                            <span>Already has wishlist access</span>
                          </div>
                        </div>
                        <div className={styles.accessUserActions}>
                          <span className={styles.roleBadge}>
                            {user.access_role}
                          </span>
                          <button
                            type="button"
                            className={styles.revokeButton}
                            onClick={() => handleRevokeAccess(targetUserId)}
                            disabled={
                              revokeAccess.isPending &&
                              revokeAccess.variables?.targetUserId ===
                                targetUserId
                            }
                            aria-label={`Revoke access for @${user.nickname}`}
                          >
                            {revokeAccess.isPending &&
                            revokeAccess.variables?.targetUserId ===
                              targetUserId ? (
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
          <label className={styles.label}>Access level</label>
          <div className={styles.accessGrid}>
            {ACCESS_OPTIONS.map((option) => {
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
                    <span className={styles.accessDescription}>
                      {option.description}
                    </span>
                  </div>
                  {active && <Check size={16} className={styles.accessCheck} />}
                </button>
              );
            })}
          </div>
        </div>

        {errorMessage && <div className={styles.error}>{errorMessage}</div>}

        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={grantAccess.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {grantAccess.isPending ? "Granting access..." : "Confirm access"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
