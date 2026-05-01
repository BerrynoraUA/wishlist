"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Options = {
  key: string;
  debounceMs?: number;
};

export function useDebouncedQueryParam({ key, debounceMs = 300 }: Options) {
  const pathname = usePathname();
  const router = useRouter();
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

        router.replace(
          params.toString() ? `${pathnameRef.current}?${params.toString()}` : pathnameRef.current,
          { scroll: false },
        );
      }, debounceMs);
    },
    [debounceMs, key, router],
  );

  return {
    value,
    setValue: updateValue,
  };
}
