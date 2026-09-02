"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Hook for managing URL query parameters with page-reset semantics.
 * Extracts the repetitive updateQueryParams / setPage / setSingleValueParam / setMultiValueParam
 * pattern used across filtered list pages.
 */
export function useQueryParams(basePath: string) {
  const routeSearchParams = useSearchParams();
  const routeSearchParamsString = routeSearchParams.toString();
  const [optimisticParamsString, setOptimisticParamsString] = useState(routeSearchParamsString);

  useEffect(() => {
    setOptimisticParamsString(routeSearchParamsString);
  }, [routeSearchParamsString]);

  const searchParams = useMemo(
    () => new URLSearchParams(optimisticParamsString),
    [optimisticParamsString],
  );

  const updateQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const nextParams = new URLSearchParams(optimisticParamsString);
      updater(nextParams);
      const nextQuery = nextParams.toString();
      setOptimisticParamsString(nextQuery);
      // The History API rather than `router.replace`: replacing the route makes Next
      // re-render it on the server, and the route's `loading.tsx` flashes over the whole
      // page on the way. Filters are client state — the URL only has to record them, and
      // the list re-fetches from its own query key.
      window.history.replaceState(null, "", nextQuery ? `${basePath}?${nextQuery}` : basePath);
    },
    [basePath, optimisticParamsString],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      updateQueryParams((p) => {
        if (nextPage <= 1) {
          p.delete("page");
        } else {
          p.set("page", String(nextPage));
        }
      });
    },
    [updateQueryParams],
  );

  const setSingleValueParam = useCallback(
    (key: string, value: string, defaultValue?: string) => {
      updateQueryParams((p) => {
        if (!value || (defaultValue !== undefined && value === defaultValue)) {
          p.delete(key);
        } else {
          p.set(key, value);
        }
        p.delete("page");
      });
    },
    [updateQueryParams],
  );

  const setMultiValueParam = useCallback(
    (key: string, values: string[]) => {
      updateQueryParams((p) => {
        p.delete(key);
        values.forEach((v) => p.append(key, v));
        p.delete("page");
      });
    },
    [updateQueryParams],
  );

  return {
    searchParams,
    updateQueryParams,
    setPage,
    setSingleValueParam,
    setMultiValueParam,
  };
}
