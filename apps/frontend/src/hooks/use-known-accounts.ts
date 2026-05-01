"use client";

import { useCallback, useEffect, useState } from "react";
import { listKnownAccounts, removeKnownAccount } from "@/lib/known-accounts";
import {
  KNOWN_ACCOUNTS_CHANGE_EVENT,
  KNOWN_ACCOUNTS_STORAGE_KEY,
  type KnownAccount,
} from "@/types/known-accounts";

export function useKnownAccounts() {
  const [accounts, setAccounts] = useState<KnownAccount[]>([]);

  useEffect(() => {
    setAccounts(listKnownAccounts());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function syncFromStorage() {
      setAccounts(listKnownAccounts());
    }

    function handleStorageEvent(event: StorageEvent) {
      if (event.key && event.key !== KNOWN_ACCOUNTS_STORAGE_KEY) return;
      syncFromStorage();
    }

    window.addEventListener(KNOWN_ACCOUNTS_CHANGE_EVENT, syncFromStorage);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      window.removeEventListener(KNOWN_ACCOUNTS_CHANGE_EVENT, syncFromStorage);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const removeAccount = useCallback((userId: string) => {
    removeKnownAccount(userId);
  }, []);

  return { accounts, removeAccount };
}
