import { Icon } from "@/components/ui/icon";
import { GiftIcon } from "lucide-react-native";
import { View } from "react-native";

type AuthBackgroundVariant = "sign-in" | "email";

type SkeletonConfig = {
  className: string;
  compact?: boolean;
};

const SKELETONS: Record<AuthBackgroundVariant, readonly SkeletonConfig[]> = {
  "sign-in": [
    { className: "-left-10 top-16 rotate-[-10deg] opacity-55" },
    { className: "right-[-84px] bottom-24 rotate-10 opacity-42", compact: true },
  ],
  email: [
    { className: "left-[-92px] top-20 rotate-8 opacity-42", compact: true },
    { className: "right-[-44px] bottom-28 rotate-[-9deg] opacity-56" },
  ],
};

export function AuthWishlistBackground({
  variant = "sign-in",
}: {
  variant?: AuthBackgroundVariant;
}) {
  return (
    <View pointerEvents="none" className="absolute inset-0">
      <View className="absolute inset-0 bg-linear-[135deg,#16111f_0%,#2a1630_42%,#6f1f54_74%,#c0267e_100%]" />
      {SKELETONS[variant].map((skeleton) => (
        <WishlistSkeleton
          key={skeleton.className}
          className={skeleton.className}
          compact={skeleton.compact}
          variant={variant}
        />
      ))}
      <View className="absolute inset-x-0 top-0 h-[56%] bg-linear-[180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.05)_48%,rgba(255,255,255,0)_100%]" />
      <View className="absolute inset-x-0 bottom-0 h-[72%] bg-linear-[180deg,rgba(22,17,31,0)_0%,rgba(22,17,31,0.56)_56%,rgba(22,17,31,0.9)_100%]" />
    </View>
  );
}

function WishlistSkeleton({
  className,
  compact = false,
  variant,
}: {
  className: string;
  compact?: boolean;
  variant: AuthBackgroundVariant;
}) {
  const itemCount = compact ? 2 : 3;

  return (
    <View
      className={`absolute w-82.5 rounded-[32px] border border-white/12 bg-white/10 p-5 ${className}`}
    >
      <View className="mb-5 flex-row items-center gap-3">
        <View className="size-11 items-center justify-center rounded-2xl bg-white/16">
          <Icon as={GiftIcon} className="size-5 text-white/50" />
        </View>
        <View className="flex-1 gap-2">
          <View className="h-3.5 w-[62%] rounded-full bg-white/24" />
          <View className="h-2.5 w-[40%] rounded-full bg-white/14" />
        </View>
      </View>

      <View className="gap-3">
        {Array.from({ length: itemCount }).map((_, index) => (
          <SkeletonItem
            key={index}
            short={variant === "email" ? index === 1 : index === 2}
            wide={variant === "email" ? index !== 1 : index === 0}
          />
        ))}
      </View>
    </View>
  );
}

function SkeletonItem({ short = false, wide = false }: { short?: boolean; wide?: boolean }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-white/10 p-3">
      <View className="size-12 rounded-xl bg-white/14" />
      <View className="flex-1 gap-2">
        <View className={`h-3 rounded-full bg-white/24 ${short ? "w-[48%]" : "w-[76%]"}`} />
        <View className={`h-2.5 rounded-full bg-white/13 ${wide ? "w-[58%]" : "w-[36%]"}`} />
      </View>
      <View className="size-8 rounded-full border border-white/14 bg-white/8" />
    </View>
  );
}
