"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Options = {
  key: string;
  debounceMs?: number;
};

export function useDebouncedQueryParam({ key, debounceMs = 300 }: Options) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get(key) ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isTypingRef = useRef(false);
  const searchParamsRef = useRef(searchParams);
  const pathnameRef = useRef(pathname);

  searchParamsRef.current = searchParams;
  pathnameRef.current = pathname;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isTypingRef.current) return;
    setValue(searchParams.get(key) ?? "");
  }, [key, searchParams]);

  const updateValue = useCallback(
    (nextValue: string) => {
      setValue(nextValue);

      if (timerRef.current) clearTimeout(timerRef.current);
      isTypingRef.current = true;

      timerRef.current = setTimeout(() => {
        isTypingRef.current = false;

        const params = new URLSearchParams(searchParamsRef.current.toString());
        if (nextValue.trim()) {
          params.set(key, nextValue);
        } else {
          params.delete(key);
        }

        // History API, not `router.replace` — see `useQueryParams`: replacing the route
        // re-renders it on the server and flashes its `loading.tsx` over the page, which
        // is very visible when it happens on every pause in typing.
        window.history.replaceState(
          null,
          "",
          params.toString() ? `${pathnameRef.current}?${params.toString()}` : pathnameRef.current,
        );
      }, debounceMs);
    },
    [debounceMs, key],
  );

  return {
    value,
    setValue: updateValue,
  };
}
