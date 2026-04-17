"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGT } from "gt-next";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Copy, Loader2 } from "lucide-react";
import {
  hasReachedSearchThreshold,
  normalizeSearchQuery,
} from "@/lib/helpers/search";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./AddFriendModal.module.scss";
import {
  useSearchProfilesByNickname,
  useSendFriendRequest,
} from "@/hooks/use-friends";
import type { ProfileSearchResult } from "@/api/types/friends";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddFriendModal({ open, onClose }: Props) {
  const t = useGT();
  const [origin, setOrigin] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [username, setUsername] = useState("");
  const [copied, setCopied] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [skip, setSkip] = useState(0);
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [selected, setSelected] = useState<ProfileSearchResult[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  const take = 10;

  const inviteLink = useMemo(() => {
    if (!origin || !userId) return "";
    return `${origin}/home?friendInvite=${userId}`;
  }, [origin, userId]);

  const search = useSearchProfilesByNickname(debouncedQuery, {
    skip,
    take,
  });
  const canSearch = hasReachedSearchThreshold(username);

  const sendRequest = useSendFriendRequest();
  const showDropdown =
    dropdownOpen && canSearch && (search.isFetching || search.isFetched);
  const hasMore = (search.data?.length ?? 0) === take;
  const inviteDisabled = selected.length === 0 || inviting;

  function resetState({ keepSuccess = false }: { keepSuccess?: boolean } = {}) {
    setSelected([]);
    setUsername("");
    setDebouncedQuery("");
    setResults([]);
    setSkip(0);
    setDropdownOpen(false);
    setInviting(false);
    if (!keepSuccess) setInviteSuccess(false);
    sendRequest.reset();
  }

  useEffect(() => {
    setOrigin(window.location.origin);

    supabaseBrowser.auth
      .getUser()
      .then(({ data }) => {
        const id = data.user?.id;
        if (id) setUserId(id);
      })
      .catch(() => {
        setUserId("");
      });
  }, []);

  // Debounce input to avoid spamming RPC
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(normalizeSearchQuery(username));
    }, 220);

    return () => clearTimeout(handle);
  }, [username]);

  // Reset pagination and selection when query changes
  useEffect(() => {
    setSkip(0);
    setResults([]);
    setSelected([]);
    setDropdownOpen(hasReachedSearchThreshold(username));
  }, [debouncedQuery, username]);

  // Accumulate paginated results
  useEffect(() => {
    if (!search.data) return;

    setResults((prev) => {
      if (skip === 0) return search.data;

      const existingIds = new Set(prev.map((p) => p.id));
      const merged = [...prev];
      search.data.forEach((item) => {
        if (!existingIds.has(item.id)) merged.push(item);
      });
      return merged;
    });
  }, [search.data, skip]);

  // Reset after successful invite
  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  useEffect(() => {
    if (!open || !showDropdown || !inputWrapperRef.current) {
      setDropdownStyle(null);
      return;
    }

    const updateDropdownPosition = () => {
      const rect = inputWrapperRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDropdownStyle({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };

    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);

    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, showDropdown]);

  function handleCopy() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleLoadMore() {
    if (search.isFetching) return;
    if ((search.data?.length ?? 0) < take) return;
    setSkip((prev) => prev + take);
  }

  function handleSelect(profile: ProfileSearchResult) {
    setSelected((prev) => {
      if (prev.some((p) => p.id === profile.id)) return prev;
      return [...prev, profile];
    });
    setDropdownOpen(false);
    setInviteSuccess(false);
  }

  async function handleInvite() {
    if (!selected.length) return;
    try {
      setInviting(true);
      await Promise.all(
        selected.map((profile) => sendRequest.mutateAsync(profile.id)),
      );
      resetState({ keepSuccess: true });
      setInviteSuccess(true);
    } finally {
      setInviting(false);
    }
  }

  const dropdownContent = showDropdown ? (
    <div
      className={`${styles.searchDropdown} ${styles.searchDropdownPortal}`}
      style={dropdownStyle ?? undefined}
    >
      {search.isFetching && results.length === 0 && (
        <div className={styles.empty}>
          {t("Searching...", { $id: "friends.addModal.searching" })}
        </div>
      )}

      {!search.isFetching && results.length === 0 && (
        <div className={styles.empty}>
          {t("No matches", { $id: "friends.addModal.noMatches" })}
        </div>
      )}

      {results.length > 0 && (
        <div className={styles.resultsList}>
          {results.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className={`${styles.resultItem} ${selected.some((p) => p.id === profile.id) ? styles.active : ""}`}
              onClick={() => handleSelect(profile)}
            >
              <div className={styles.avatarStub}>
                {profile.nickname?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className={styles.resultMeta}>
                <span className={styles.nickname}>@{profile.nickname}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          className={styles.loadMore}
          onClick={handleLoadMore}
          disabled={search.isFetching}
        >
          {search.isFetching ? (
            <Loader2
              size={14}
              style={{ animation: "spin 0.8s linear infinite" }}
            />
          ) : (
            t("Load more", { $id: "friends.addModal.loadMore" })
          )}
        </button>
      )}
    </div>
  ) : null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>
            {t("Friends", { $id: "friends.addModal.eyebrow" })}
          </p>
          <h2>{t("Invite friends", { $id: "friends.addModal.title" })}</h2>
          <p>
            {t(
              "Share your personal invite link or look up a friend by handle.",
              {
                $id: "friends.addModal.subtitle",
              },
            )}
          </p>
        </div>

        {/* Invite Link */}
        <div className={styles.field}>
          <label>
            {t("Your invite link", { $id: "friends.addModal.inviteLinkLabel" })}
          </label>

          <div className={styles.linkWrapper}>
            <input value={inviteLink || ""} readOnly placeholder="..." />

            <button
              className={`${styles.copyBtn} iconTooltipTrigger`}
              onClick={handleCopy}
              disabled={!inviteLink}
              aria-label={t("Copy invite link", {
                $id: "friends.addModal.copyAria",
              })}
              data-tooltip={t("Copy invite link", {
                $id: "friends.addModal.copyTooltip",
              })}
            >
              <Copy size={16} />
            </button>
          </div>

          {copied && (
            <span className={styles.copied}>
              {t("Copied to clipboard", {
                $id: "friends.addModal.copied",
              })}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span>{t("OR SEARCH", { $id: "friends.addModal.orSearch" })}</span>
        </div>

        {/* Username Search */}
        <div className={styles.searchRow}>
          <div className={styles.usernameInput} ref={inputWrapperRef}>
            <input
              placeholder={t("@username", {
                $id: "friends.addModal.usernamePlaceholder",
              })}
              value={username}
              onChange={(e) => {
                const nextValue = e.target.value;
                setUsername(nextValue);
                setDropdownOpen(hasReachedSearchThreshold(nextValue));
                setInviteSuccess(false);
              }}
              onFocus={() =>
                setDropdownOpen(hasReachedSearchThreshold(username))
              }
            />
          </div>

          <Button onClick={handleInvite} disabled={inviteDisabled}>
            {sendRequest.isPending
              ? t("Inviting...", { $id: "friends.addModal.inviting" })
              : t("Invite", { $id: "friends.addModal.invite" })}
          </Button>
        </div>

        {dropdownContent && createPortal(dropdownContent, document.body)}

        {selected.length > 0 && (
          <div className={styles.selectedList}>
            {selected.map((profile) => (
              <div key={profile.id} className={styles.selectedBadge}>
                <span>@{profile.nickname}</span>
                <button
                  type="button"
                  className="iconTooltipTrigger"
                  onClick={() =>
                    setSelected((prev) =>
                      prev.filter((p) => p.id !== profile.id),
                    )
                  }
                  aria-label={t("Remove from invite list", {
                    $id: "friends.addModal.removeBadgeAria",
                  })}
                  data-tooltip={t("Remove from invite list", {
                    $id: "friends.addModal.removeBadgeTooltip",
                  })}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {search.isError && (
          <div className={styles.error}>
            {t("Could not search right now. Try again.", {
              $id: "friends.addModal.searchError",
            })}
          </div>
        )}

        {inviteSuccess && (
          <div className={styles.success}>
            {t("Invite sent!", { $id: "friends.addModal.inviteSent" })}
          </div>
        )}
      </div>
    </Modal>
  );
}
