"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ComponentType,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { Pencil, Share2, Trash2 } from "lucide-react";
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

type Variant = "default" | "edit" | "danger" | "share" | "pin";

type ItemProps = {
  children: ReactNode;
  onClick?: (e: ReactMouseEvent) => void;
  variant?: Variant;
  /** Leading icon. Defaults to a sensible icon for the variant; pass `null` to omit. */
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "disabled" | "onClick">;

const VARIANT_ICON: Partial<Record<Variant, ComponentType<{ size?: number }>>> = {
  edit: Pencil,
  danger: Trash2,
  share: Share2,
};

export function DropdownMenuItem({
  children,
  onClick,
  variant = "default",
  icon,
  disabled = false,
  className,
  ...props
}: ItemProps) {
  const { close } = useContext(DropdownMenuContext);
  const DefaultIcon = VARIANT_ICON[variant];
  const leadingIcon = icon !== undefined ? icon : DefaultIcon ? <DefaultIcon size={16} /> : null;
  return (
    <button
      type="button"
      className={[styles.item, styles[variant], disabled && styles.disabled, className]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) {
          onClick?.(e);
          close();
        }
      }}
      disabled={disabled}
      {...props}
    >
      {leadingIcon}
      {children}
    </button>
  );
}
