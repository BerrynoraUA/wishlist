"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal/Modal";
import { Button } from "@/components/ui/Button/Button";
import { Copy } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import styles from "./AddFriendModal.module.scss";
import { useSearchProfilesByNickname, useSendFriendRequest } from "@/hooks/use-friends";
import type { ProfileSearchResult } from "@/api/types/friends";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddFriendModal({ open, onClose }: Props) {
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

  const take = 10;

  const inviteLink = useMemo(() => {
    if (!origin || !userId) return "";
    return `${origin}/home?friendInvite=${userId}`;
  }, [origin, userId]);

  const search = useSearchProfilesByNickname(debouncedQuery, {
    skip,
    take,
  });

  const sendRequest = useSendFriendRequest();

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
      setDebouncedQuery(username.trim());
    }, 220);

    return () => clearTimeout(handle);
  }, [username]);

  // Reset pagination and selection when query changes
  useEffect(() => {
    setSkip(0);
    setResults([]);
    setSelected([]);
    setDropdownOpen(Boolean(username.trim()));
  }, [debouncedQuery]);

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
      await Promise.all(selected.map((profile) => sendRequest.mutateAsync(profile.id)));
      resetState({ keepSuccess: true });
      setInviteSuccess(true);
    } finally {
      setInviting(false);
    }
  }

  const showDropdown = dropdownOpen && Boolean(debouncedQuery) && (search.isFetching || search.isFetched);
  const hasMore = (search.data?.length ?? 0) === take;
  const inviteDisabled = selected.length === 0 || inviting;

  return (
    <Modal open={open} onClose={onClose}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Friends</p>
          <h2>Invite friends</h2>
          <p>Share your personal invite link or look up a friend by handle.</p>
        </div>

        {/* Invite Link */}
        <div className={styles.field}>
          <label>Your invite link</label>

          <div className={styles.linkWrapper}>
            <input value={inviteLink || "Loading..."} readOnly />

            <button
              className={styles.copyBtn}
              onClick={handleCopy}
              disabled={!inviteLink}
            >
              <Copy size={16} />
            </button>
          </div>

          {copied && <span className={styles.copied}>Copied to clipboard</span>}
        </div>

        {/* Divider */}
        <div className={styles.divider}>
          <span>OR SEARCH</span>
        </div>

        {/* Username Search */}
        <div className={styles.searchRow}>
          <div className={styles.usernameInput}>
            <input
              placeholder="@username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setDropdownOpen(true);
                setInviteSuccess(false);
              }}
              onFocus={() => setDropdownOpen(true)}
            />

            {showDropdown && (
              <div className={styles.searchDropdown}>
                {search.isFetching && results.length === 0 && (
                  <div className={styles.empty}>Searching...</div>
                )}

                {!search.isFetching && results.length === 0 && (
                  <div className={styles.empty}>No matches</div>
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
                        <div className={styles.avatarStub}>{profile.nickname?.[0]?.toUpperCase() ?? "?"}</div>
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
                    {search.isFetching ? "Loading..." : "Load more"}
                  </button>
                )}
              </div>
            )}
          </div>

          <Button onClick={handleInvite} disabled={inviteDisabled} loading={sendRequest.isPending}>
            Invite
          </Button>
        </div>

        {selected.length > 0 && (
          <div className={styles.selectedList}>
            {selected.map((profile) => (
              <div key={profile.id} className={styles.selectedBadge}>
                <span>@{profile.nickname}</span>
                <button
                  type="button"
                  onClick={() => setSelected((prev) => prev.filter((p) => p.id !== profile.id))}
                  aria-label="Remove from invite list"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {search.isError && (
          <div className={styles.error}>Could not search right now. Try again.</div>
        )}

        {inviteSuccess && (
          <div className={styles.success}>Invite sent!</div>
        )}
      </div>
    </Modal>
  );
}
