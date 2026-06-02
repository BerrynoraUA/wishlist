import {
  listKnownAccounts,
  removeKnownAccount,
  upsertKnownAccount,
} from "@/lib/known-accounts";
import { useAuth } from "@/providers/auth-provider";
import type { KnownAccount } from "@wishlist/backend/types/known-accounts";
import * as React from "react";

export function useKnownAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = React.useState<KnownAccount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setAccounts(await listKnownAccounts());
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh, user?.id]);

  const removeAccount = React.useCallback(
    async (userId: string) => {
      await removeKnownAccount(userId);
      await refresh();
    },
    [refresh],
  );

  const rememberAccount = React.useCallback(
    async (account: Parameters<typeof upsertKnownAccount>[0]) => {
      await upsertKnownAccount(account);
      await refresh();
    },
    [refresh],
  );

  return {
    accounts,
    isLoading,
    refresh,
    removeAccount,
    rememberAccount,
  };
}
