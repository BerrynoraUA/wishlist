import { AddFriendSheet } from "@/components/friends/sheets/add-friend-sheet";
import { FriendGroupSheet } from "@/components/friends/sheets/friend-group-sheet";
import { SecretSantaCreateEditSheet } from "@/components/secret-santa/sheets/secret-santa-create-edit-sheet";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useUserGuide } from "@/components/user-guide/user-guide-provider";
import { WishlistItemCreateEditSheet } from "@/components/wishlist-details/sheets/wishlist-item-create-edit-sheet";
import { WishlistCreateEditSheet } from "@/components/wishlists/sheets/wishlist-create-edit-sheet";
import { useCreateFriendGroup, useFriends } from "@/hooks/use-friends";
import { Portal } from "@rn-primitives/portal";
import {
  Gift,
  Link,
  PartyPopper,
  PencilLine,
  Star,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useGT } from "gt-react-native";
import * as React from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type CreateAction =
  | "item-scratch"
  | "item-link"
  | "wishlist"
  | "secret-santa"
  | "friend"
  | "friend-group";
export type ItemCreateSource = "scratch" | "link";
type CreateMenuAction = CreateAction | "item";

/** Matches the nav metrics used by the user guide (`getNavBox`). */
const TAB_BAR_HEIGHT = 58;

type CreateMenuEntry = {
  action: CreateMenuAction;
  icon: LucideIcon;
  label: string;
  /** Completes the matching user-guide step when the action is chosen. */
  guideStep?: number;
};

export function CreateMenuHost({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useGT();
  const { completeStep } = useUserGuide();
  const [action, setAction] = React.useState<CreateAction | null>(null);
  const [itemMenuOpen, setItemMenuOpen] = React.useState(false);

  function handleSelect(entry: CreateMenuEntry) {
    onOpenChange(false);
    if (entry.action === "item") {
      setItemMenuOpen(true);
      return;
    }
    if (entry.guideStep !== undefined) completeStep(entry.guideStep);
    setAction(entry.action);
  }

  function handleItemSelect(entry: CreateMenuEntry) {
    setItemMenuOpen(false);
    if (entry.guideStep !== undefined) completeStep(entry.guideStep);
    setAction(entry.action as CreateAction);
  }

  function closeAction(openState: boolean) {
    if (!openState) setAction(null);
  }

  return (
    <>
      <CreateActionMenu open={open} onClose={() => onOpenChange(false)} onSelect={handleSelect} />
      <CreateItemSourceMenu
        open={itemMenuOpen}
        onClose={() => setItemMenuOpen(false)}
        onSelect={(source) =>
          handleItemSelect({
            action: source === "link" ? "item-link" : "item-scratch",
            icon: source === "link" ? Link : PencilLine,
            label: source === "link" ? t("Create from link") : t("Create from scratch"),
            guideStep: 4,
          })
        }
      />
      <WishlistCreateEditSheet
        mode="create"
        open={action === "wishlist"}
        onOpenChange={closeAction}
      />
      <WishlistItemCreateEditSheet
        mode="create"
        createSource={action === "item-link" ? "link" : "scratch"}
        open={action === "item-scratch" || action === "item-link"}
        onOpenChange={closeAction}
      />
      <SecretSantaCreateEditSheet
        mode="create"
        open={action === "secret-santa"}
        onOpenChange={closeAction}
      />
      {action === "friend" ? <AddFriendSheet open onOpenChange={closeAction} /> : null}
      {action === "friend-group" ? <CreateFriendGroupSheet onOpenChange={closeAction} /> : null}
    </>
  );
}

export function CreateItemSourceMenu({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (source: ItemCreateSource) => void;
}) {
  const t = useGT();
  const entries: CreateMenuEntry[] = [
    {
      action: "item-scratch",
      icon: PencilLine,
      label: t("Create from scratch"),
      guideStep: 4,
    },
    { action: "item-link", icon: Link, label: t("Create from link"), guideStep: 4 },
  ];

  return (
    <CreateFloatingMenu
      open={open}
      onClose={onClose}
      entries={entries}
      onSelect={(entry) => onSelect(entry.action === "item-link" ? "link" : "scratch")}
    />
  );
}

function CreateActionMenu({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (entry: CreateMenuEntry) => void;
}) {
  const t = useGT();

  if (!open) return null;

  // Rendered top-to-bottom; the last entry sits closest to the + button and
  // animates in first, so the menu appears to unfold upwards.
  const entries: CreateMenuEntry[] = [
    { action: "friend-group", icon: Users, label: t("Friend Group"), guideStep: 12 },
    { action: "friend", icon: UserPlus, label: t("Invite Friend"), guideStep: 10 },
    { action: "secret-santa", icon: PartyPopper, label: t("Secret Santa Event") },
    { action: "wishlist", icon: Gift, label: t("New Wishlist"), guideStep: 2 },
    { action: "item", icon: Star, label: t("New Wish") },
  ];

  return <CreateFloatingMenu open={open} onClose={onClose} entries={entries} onSelect={onSelect} />;
}

function CreateFloatingMenu({
  open,
  onClose,
  entries,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  entries: CreateMenuEntry[];
  onSelect: (entry: CreateMenuEntry) => void;
}) {
  const t = useGT();
  const insets = useSafeAreaInsets();

  if (!open) return null;

  const menuBottom = Math.max(insets.bottom, 8) + TAB_BAR_HEIGHT + 12;

  return (
    <Portal name="create-action-menu">
      <View className="absolute inset-0" style={{ zIndex: 9000 }}>
        <Animated.View
          className="absolute inset-0 bg-black/40"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(150)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Close create menu")}
            className="flex-1"
            onPress={onClose}
          />
        </Animated.View>
        <View
          className="absolute left-0 right-0 items-center gap-2.5"
          pointerEvents="box-none"
          style={{ bottom: menuBottom }}
        >
          {entries.map((entry, index) => (
            <Animated.View
              key={entry.action}
              entering={FadeInDown.springify()
                .damping(16)
                .stiffness(240)
                .mass(0.7)
                .delay((entries.length - 1 - index) * 45)
                .withInitialValues({ opacity: 0, transform: [{ translateY: 48 }] })}
              exiting={FadeOutDown.duration(140).delay(index * 20)}
            >
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={entry.label}
                onPress={() => onSelect(entry)}
                className="w-60 flex-row items-center gap-3 rounded-full border border-border-subtle bg-card-bg py-2.5 pl-2.5 pr-5 shadow-[0px_10px_22px_rgba(15,23,42,0.22)]"
              >
                <View className="size-10 items-center justify-center rounded-full bg-brand-lighter">
                  <Icon as={entry.icon} className="size-5 text-brand" />
                </View>
                <Text className="min-w-0 flex-1 text-base font-bold text-text" numberOfLines={1}>
                  {entry.label}
                </Text>
              </AnimatedPressable>
            </Animated.View>
          ))}
        </View>
      </View>
    </Portal>
  );
}

function CreateFriendGroupSheet({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const friendsQuery = useFriends();
  const createGroup = useCreateFriendGroup();

  return (
    <FriendGroupSheet
      open
      group={null}
      friends={friendsQuery.data ?? []}
      isSaving={createGroup.isPending}
      onOpenChange={onOpenChange}
      onSubmit={(payload) => createGroup.mutateAsync(payload).then(() => undefined)}
    />
  );
}
