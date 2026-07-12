import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import * as AvatarPrimitive from "@rn-primitives/avatar";
import * as React from "react";

const AvatarNameContext = React.createContext<string | undefined>(undefined);

function Avatar({
  className,
  alt,
  children,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarNameContext.Provider value={alt}>
      <AvatarPrimitive.Root
        className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
        alt={alt}
        {...props}
      >
        {children}
      </AvatarPrimitive.Root>
    </AvatarNameContext.Provider>
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image className={cn("aspect-square size-full", className)} {...props} />;
}

function AvatarFallback({
  className,
  children,
  initialsClassName,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback> & { initialsClassName?: string }) {
  const name = React.useContext(AvatarNameContext);

  return (
    <AvatarPrimitive.Fallback
      className={cn(
        "bg-muted flex size-full flex-row items-center justify-center rounded-full",
        className,
      )}
      {...props}
    >
      {children ?? (
        <Text className={cn("text-xs font-extrabold text-text-muted", initialsClassName)}>
          {getInitials(name)}
        </Text>
      )}
    </AvatarPrimitive.Fallback>
  );
}

function getInitials(name?: string) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();

  return `${words[0].charAt(0)}${words.at(-1)?.charAt(0)}`.toUpperCase();
}

export { Avatar, AvatarFallback, AvatarImage };
