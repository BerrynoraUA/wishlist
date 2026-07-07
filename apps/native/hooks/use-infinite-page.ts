import {
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

export function useSkipTakeInfiniteQuery<T>(opts: {
  queryKey: QueryKey;
  fetchPage: (page: SkipTakePage) => Promise<T[]>;
  pageSize: number;
  enabled: boolean;
}): UseInfiniteQueryResult<InfiniteData<T[], number>, Error> {
  const { queryKey, fetchPage, pageSize, enabled } = opts;

  return useInfiniteQuery<T[], Error, InfiniteData<T[], number>, QueryKey, number>({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchPage({
        skip: pageParam * pageSize,
        take: pageSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === pageSize ? lastPageParam + 1 : undefined,
    enabled,
  });
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
  const items = React.useMemo(
    () =>
      query.data?.pages.flatMap((page) =>
        getPageItems ? getPageItems(page as TPage) : (page as T[]),
      ) ?? [],
    [getPageItems, query.data],
  );

  const loadMore = React.useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  return { items, loadMore };
}
