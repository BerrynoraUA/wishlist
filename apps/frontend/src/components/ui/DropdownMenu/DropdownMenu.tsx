"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./DropdownMenu.module.scss";

const DropdownMenuContext = createContext<{ close: () => void }>({
  close: () => {},
});

type Props = {
  trigger: (opts: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
};

export function DropdownMenu({ trigger, children, align = "right", className }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ close }}>
      <div className={`${styles.wrapper} ${className ?? ""}`} ref={wrapperRef}>
        {trigger({ open, toggle: () => setOpen((p) => !p) })}
        {open && <div className={`${styles.dropdown} ${styles[align]}`}>{children}</div>}
      </div>
    </DropdownMenuContext.Provider>
  );
}

type ItemProps = {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "default" | "edit" | "danger" | "share";
  disabled?: boolean;
  className?: string;
};

export function DropdownMenuItem({
  children,
  onClick,
  variant = "default",
  disabled = false,
  className,
}: ItemProps) {
  const { close } = useContext(DropdownMenuContext);
  return (
    <button
      type="button"
      className={`${styles.item} ${styles[variant]} ${disabled ? styles.disabled : ""} ${className ?? ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onClick?.(e);
          close();
        }
      }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
