import {
  infiniteQueryOptions,
  useInfiniteQuery,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import * as React from "react";

type SkipTakePage = {
  skip: number;
  take: number;
};

type InfiniteListQuery<TPage> = {
  data?: InfiniteData<TPage, unknown>;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
};

/** Shared by `useSkipTakeInfiniteQuery` and prefetching, so both land on the same cache entry. */
export function skipTakeInfiniteQueryOptions<T>(opts: {
  queryKey: QueryKey;
  fetchPage: (page: SkipTakePage) => Promise<T[]>;
  pageSize: number;
}) {
  const { queryKey, fetchPage, pageSize } = opts;

  return infiniteQueryOptions<T[], Error, InfiniteData<T[], number>, QueryKey, number>({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchPage({
        skip: pageParam * pageSize,
        take: pageSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === pageSize ? lastPageParam + 1 : undefined,
  });
}

export function useSkipTakeInfiniteQuery<T>(opts: {
  queryKey: QueryKey;
  fetchPage: (page: SkipTakePage) => Promise<T[]>;
  pageSize: number;
  enabled: boolean;
}): UseInfiniteQueryResult<InfiniteData<T[], number>, Error> {
  return useInfiniteQuery({ ...skipTakeInfiniteQueryOptions(opts), enabled: opts.enabled });
}

export function useInfiniteListData<T>(query: InfiniteListQuery<T[]>): {
  items: T[];
  loadMore: () => void;
};
export function useInfiniteListData<T, TPage>(
  query: InfiniteListQuery<TPage>,
  getPageItems: (page: TPage) => T[],
): { items: T[]; loadMore: () => void };
export function useInfiniteListData<T, TPage>(
  query: InfiniteListQuery<T[] | TPage>,
  getPageItems?: (page: TPage) => T[],
) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const items = React.useMemo(
    () =>
      data?.pages.flatMap((page) => (getPageItems ? getPageItems(page as TPage) : (page as T[]))) ??
      [],
    [data, getPageItems],
  );

  const loadMore = React.useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return { items, loadMore };
}
