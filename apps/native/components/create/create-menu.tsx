import { AddFriendSheet } from "@/components/friends/sheets/add-friend-sheet";
import { FriendGroupSheet } from "@/components/friends/sheets/friend-group-sheet";
import { SecretSantaCreateEditSheet } from "@/components/secret-santa/sheets/secret-santa-create-edit-sheet";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useUserGuide } from "@/components/user-guide/user-guide-provider";
import { WishlistItemCreateEditSheet } from "@/components/wishlist-details/sheets/wishlist-item-create-edit-sheet";
import { WishlistCreateEditSheet } from "@/components/wishlists/sheets/wishlist-create-edit-sheet";
import { USER_GUIDE_STEP_IDS } from "@/components/user-guide/user-guide-config";
import { useCreateFriendGroup, useFriends } from "@/hooks/use-friends";
import { useProGate } from "@/hooks/use-pro-gate";
import { useInfiniteSecretSantaEvents } from "@/hooks/use-secret-santa";
import { useMyStatistics, useWishlistById } from "@/hooks/use-wishlists";
import { NAV_TAB_BAR_HEIGHT } from "@/lib/layout";
import { isWishlistDetailPath } from "@/lib/routes";
import { Portal } from "@rn-primitives/portal";
import { useGlobalSearchParams, usePathname } from "expo-router";
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
import { Platform, Pressable, View, useWindowDimensions } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FREE_LIMITS } from "@wishlist/backend/types/subscription";

export type CreateAction =
  | "item-scratch"
  | "item-link"
  | "wishlist"
  | "secret-santa"
  | "friend"
  | "friend-group";
export type ItemCreateSource = "scratch" | "link";
type CreateMenuAction = CreateAction | "item";

const MENU_ROW_HEIGHT = 60;
const MENU_ROW_GAP = 10;

/** Row height (40 icon + 2×10 padding) plus the 10px stack gap. */
const MENU_ROW_STRIDE = MENU_ROW_HEIGHT + MENU_ROW_GAP;
/** Approximate center of the trailing "+" action button, from the right edge. */
const IOS_PLUS_BUTTON_RIGHT_OFFSET = 40;

/**
 * On iOS the "+" lives in the tab bar's trailing action slot, so rows spring
 * out of that bottom-right origin instead of fading up from the center.
 */
function iosEnteringFromPlusButton(windowWidth: number, indexFromBottom: number) {
  const springConfig = { damping: 18, stiffness: 220, mass: 0.7 };
  const delay = indexFromBottom * 45;
  const fromX = windowWidth / 2 - IOS_PLUS_BUTTON_RIGHT_OFFSET;
  // Rows are centered above the tab bar; the button center is one stride below the
  // bottom row's center, one stride further per row up the stack.
  const fromY = indexFromBottom * MENU_ROW_STRIDE + MENU_ROW_STRIDE;

  return () => {
    "worklet";
    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateX: fromX }, { translateY: fromY }, { scale: 0.3 }],
      },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: 160 })),
        transform: [
          { translateX: withDelay(delay, withSpring(0, springConfig)) },
          { translateY: withDelay(delay, withSpring(0, springConfig)) },
          { scale: withDelay(delay, withSpring(1, springConfig)) },
        ],
      },
    };
  };
}

type CreateMenuEntry = {
  action: CreateMenuAction;
  icon: LucideIcon;
  label: string;
  /** Completes the matching user-guide step when the action is chosen. */
  guideStep?: number;
};

/**
 * Wishlist detail route id while the user is viewing one, so items created
 * from the global "+" menu default to that wishlist.
 */
function useContextualWishlistId() {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ id?: string | string[] }>();

  if (!isWishlistDetailPath(pathname)) return undefined;

  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  return routeId || undefined;
}

/**
 * Current data for a query, waiting for the first fetch if it has not landed yet.
 * Resolves to `undefined` rather than throwing when the fetch fails.
 */
async function settledData<TData>(query: {
  data: TData | undefined;
  refetch: () => Promise<{ data: TData | undefined }>;
}): Promise<TData | undefined> {
  if (query.data !== undefined) return query.data;

  return query
    .refetch()
    .then((result) => result.data)
    .catch(() => undefined);
}

export function CreateMenuHost({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const { completeStep } = useUserGuide();
  const [action, setAction] = React.useState<CreateAction | null>(null);
  const [itemMenuOpen, setItemMenuOpen] = React.useState(false);
  const contextualWishlistId = useContextualWishlistId();
  const { isGated, openPaywall } = useProGate();

  // This host is mounted for the entire session — expo-router evaluates every `_layout`
  // eagerly to read `unstable_settings`, so it is on the cold-start path — but the three
  // queries below only exist to evaluate free-tier limits when a row is tapped. Latch on
  // first open rather than tracking `open` directly, so they stay warm afterwards instead
  // of being torn down and refetched every time the menu closes.
  const [limitsEnabled, setLimitsEnabled] = React.useState(false);
  const menuVisible = open || itemMenuOpen;

  React.useEffect(() => {
    if (menuVisible) setLimitsEnabled(true);
  }, [menuVisible]);

  const statisticsQuery = useMyStatistics({ enabled: limitsEnabled });
  const contextualWishlistQuery = useWishlistById(contextualWishlistId ?? "", {
    enabled: limitsEnabled,
  });
  const secretSantaQuery = useInfiniteSecretSantaEvents({}, 1, { enabled: limitsEnabled });

  async function handleSelect(entry: CreateMenuEntry) {
    onOpenChange(false);

    if (isGated && (await isLimitReached(entry))) {
      openPaywall();
      return;
    }

    if (entry.guideStep !== undefined) completeStep(entry.guideStep);
    if (entry.action === "item") {
      setItemMenuOpen(true);
      return;
    }
    setAction(entry.action);
  }

  /**
   * The limit queries start when the menu opens, so a fast tap can arrive before they
   * resolve. Await the in-flight fetch instead of reading `undefined` as zero, which let a
   * free account past the limit. A fetch that genuinely fails still falls through to zero —
   * blocking creation while offline would be a worse trade than the occasional bypass.
   */
  async function isLimitReached(entry: CreateMenuEntry) {
    switch (entry.action) {
      case "wishlist": {
        const data = await settledData(statisticsQuery);
        return (data?.wishlists_count ?? 0) >= FREE_LIMITS.maxWishlists;
      }
      case "item": {
        if (!contextualWishlistId) return false;
        const data = await settledData(contextualWishlistQuery);
        return (data?.items_count ?? 0) >= FREE_LIMITS.maxItemsPerWishlist;
      }
      case "secret-santa": {
        const data = await settledData(secretSantaQuery);
        return (data?.pages[0]?.total ?? 0) >= FREE_LIMITS.maxSecretSantaEvents;
      }
      default:
        return false;
    }
  }

  function handleItemSelect(source: ItemCreateSource) {
    setItemMenuOpen(false);
    setAction(source === "link" ? "item-link" : "item-scratch");
  }

  function closeAction(openState: boolean) {
    if (!openState) setAction(null);
  }

  return (
    <>
      {children}
      <CreateActionMenu open={open} onClose={() => onOpenChange(false)} onSelect={handleSelect} />
      <CreateItemSourceMenu
        open={itemMenuOpen}
        onClose={() => setItemMenuOpen(false)}
        onSelect={handleItemSelect}
      />
      <WishlistCreateEditSheet
        mode="create"
        open={action === "wishlist"}
        onOpenChange={closeAction}
      />
      <WishlistItemCreateEditSheet
        mode="create"
        createSource={action === "item-link" ? "link" : "scratch"}
        wishlistId={contextualWishlistId}
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
    },
    { action: "item-link", icon: Link, label: t("Create from link") },
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
    { action: "friend-group", icon: Users, label: t("Friend Group") },
    {
      action: "friend",
      icon: UserPlus,
      label: t("Invite Friend"),
      guideStep: USER_GUIDE_STEP_IDS.inviteFriend,
    },
    { action: "secret-santa", icon: PartyPopper, label: t("Secret Santa Event") },
    {
      action: "wishlist",
      icon: Gift,
      label: t("New Wishlist"),
      guideStep: USER_GUIDE_STEP_IDS.startWishlist,
    },
    { action: "item", icon: Star, label: t("New Wish"), guideStep: USER_GUIDE_STEP_IDS.addItem },
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
  if (!open) return null;

  return (
    <Portal name="create-action-menu">
      <CreateFloatingMenuContent onClose={onClose} entries={entries} onSelect={onSelect} />
    </Portal>
  );
}

function CreateFloatingMenuContent({
  onClose,
  entries,
  onSelect,
}: {
  onClose: () => void;
  entries: CreateMenuEntry[];
  onSelect: (entry: CreateMenuEntry) => void;
}) {
  const t = useGT();
  // Mounted under the root PortalHost, so these are the window insets. Reading
  // them in the component that opens the menu would include the native tab bar
  // on iOS when triggered from inside a tab screen, pushing the menu up.
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const menuBottom = Math.max(insets.bottom, 8) + NAV_TAB_BAR_HEIGHT + 12;

  return (
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
        className="absolute start-0 end-0 items-center gap-2.5"
        pointerEvents="box-none"
        style={{ bottom: menuBottom }}
      >
        {entries.map((entry, index) => (
          <Animated.View
            key={entry.action}
            entering={
              Platform.OS === "ios"
                ? iosEnteringFromPlusButton(width, entries.length - 1 - index)
                : FadeInDown.springify()
                    .damping(16)
                    .stiffness(240)
                    .mass(0.7)
                    .delay((entries.length - 1 - index) * 45)
                    .withInitialValues({ opacity: 0, transform: [{ translateY: 48 }] })
            }
            exiting={FadeOutDown.duration(140).delay(index * 20)}
          >
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={entry.label}
              onPress={() => onSelect(entry)}
              className="w-60 flex-row items-center gap-3 rounded-full border border-border-subtle bg-card-bg py-2.5 ps-2.5 pe-5 shadow-[0px_10px_22px_rgba(15,23,42,0.22)]"
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
  );
}

function CreateFriendGroupSheet({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { completeStep } = useUserGuide();
  const friendsQuery = useFriends();
  const createGroup = useCreateFriendGroup();

  return (
    <FriendGroupSheet
      open
      group={null}
      friends={friendsQuery.data ?? []}
      isSaving={createGroup.isPending}
      onOpenChange={onOpenChange}
      onSubmit={(payload) =>
        createGroup.mutateAsync(payload).then(() => {
          completeStep(USER_GUIDE_STEP_IDS.createGroup);
        })
      }
    />
  );
}
