import type { TranslateFn } from "@/lib/translate-fn";
import { isWishlistDetailPath } from "@/lib/routes";

export type UserGuideRoute = "/wishlists" | "/wishlists/[id]" | "/friends" | "/wishlists/discover";

export type UserGuideStepTarget = {
  targetId: string;
  tooltip: string;
  activateOnNext?: boolean;
};

export type UserGuideStep = {
  id: number;
  route: UserGuideRoute;
  title: string;
  listTitle: string;
  tooltip: string;
  targetId: string;
  sequenceTargets?: readonly UserGuideStepTarget[];
  description: string;
  actionRequired?: boolean;
};

export type UserGuideSegment = {
  id: "wishlists-create" | "wishlist-detail" | "friends" | "discover-open" | "discover";
  route: UserGuideRoute;
  title: string;
  stepIds: readonly number[];
  fallbackPath: string;
};

export const USER_GUIDE_COMPLETE_STEP = 15;
export const USER_GUIDE_LAST_WISHLIST_PATH_KEY = "wishlane:user-guide:last-wishlist-path";
export const USER_GUIDE_STEP_IDS = {
  mainMenu: 1,
  startWishlist: 2,
  createWishlist: 3,
  openWishlistDetails: 4,
  addItem: 5,
  createItem: 6,
  shareWishlist: 7,
  manageWishlistAccess: 8,
  openFriends: 9,
  inviteFriend: 10,
  openFriendGroups: 11,
  createGroup: 12,
  reviewFriendRequests: 13,
  openDiscover: 14,
  exploreDiscoverTabs: 15,
} as const;

export function getUserGuideSteps(t: TranslateFn): readonly UserGuideStep[] {
  return [
    {
      id: USER_GUIDE_STEP_IDS.mainMenu,
      route: "/wishlists",
      title: t("Explore the main menu"),
      listTitle: t("Main menu"),
      tooltip: t("Start with Wishlists."),
      targetId: "nav-wishlists",
      sequenceTargets: [
        {
          targetId: "nav-wishlists",
          tooltip: t("Wishlists is where your own lists live."),
        },
        {
          targetId: "nav-create",
          tooltip: t("The + button creates wishlists, wishes, events, and more."),
        },
        {
          targetId: "nav-friends",
          tooltip: t("Friends is where invites, requests, and groups live."),
        },
        {
          targetId: "nav-profile",
          tooltip: t("Profile is where your account and settings live."),
        },
      ],
      description: t("Learn where each main section lives before creating your first wishlist."),
    },
    {
      id: USER_GUIDE_STEP_IDS.startWishlist,
      route: "/wishlists",
      title: t("Start a wishlist"),
      listTitle: t("Start wishlist"),
      tooltip: t("Tap + and choose New Wishlist."),
      targetId: "nav-create",
      description: t("Tap the + button and choose New Wishlist to start your first wishlist."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.createWishlist,
      route: "/wishlists",
      title: t("Create the wishlist"),
      listTitle: t("Create wishlist"),
      tooltip: t("Fill the name, then tap Create wishlist."),
      targetId: "create-wishlist-submit",
      description: t("Create the wishlist to continue to the wishlist detail page."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.openWishlistDetails,
      route: "/wishlists",
      title: t("Open wishlist details"),
      listTitle: t("Open details"),
      tooltip: t("Tap your wishlist card to open its details."),
      targetId: "home-wishlist-card",
      description: t("Open the wishlist detail page to continue adding items."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.addItem,
      route: "/wishlists/[id]",
      title: t("Add a gift idea"),
      listTitle: t("Add item"),
      tooltip: t("Tap + and choose New Wish."),
      targetId: "nav-create",
      description: t("Tap the + button and choose New Wish to add a product or gift idea."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.createItem,
      route: "/wishlists/[id]",
      title: t("Create the item"),
      listTitle: t("Create item"),
      tooltip: t("Fill the item name, then tap Create item."),
      targetId: "create-item-submit",
      description: t("Create the item and return to the wishlist item grid."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.shareWishlist,
      route: "/wishlists/[id]",
      title: t("Share the wishlist"),
      listTitle: t("Share"),
      tooltip: t("Tap Share to copy a share link."),
      targetId: "wishlist-share",
      description: t("Create a link friends can open to view and reserve items."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.manageWishlistAccess,
      route: "/wishlists/[id]",
      title: t("Manage sharing access"),
      listTitle: t("Manage access"),
      tooltip: t("Open access settings for this wishlist."),
      targetId: "wishlist-manage-access",
      description: t("Grant or revoke access for specific friends and groups."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.openFriends,
      route: "/wishlists/[id]",
      title: t("Open Friends"),
      listTitle: t("Open Friends"),
      tooltip: t("Tap Friends in the tab bar."),
      targetId: "nav-friends",
      description: t("Open Friends directly from the wishlist detail page."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.inviteFriend,
      route: "/friends",
      title: t("Invite a friend"),
      listTitle: t("Add friend"),
      tooltip: t("Tap + and choose Invite Friend."),
      targetId: "nav-create",
      description: t("Tap the + button and choose Invite Friend to add someone."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.openFriendGroups,
      route: "/friends",
      title: t("Open friend groups"),
      listTitle: t("Friends and groups"),
      tooltip: t("Start with Friends."),
      targetId: "friends-tab-friends",
      sequenceTargets: [
        {
          targetId: "friends-tab-friends",
          tooltip: t("Friends shows everyone already connected with you."),
          activateOnNext: true,
        },
        {
          targetId: "friends-tab-groups",
          tooltip: t("Groups helps you organize friends for sharing."),
          activateOnNext: true,
        },
      ],
      description: t("Move from the friends list to the groups tab."),
    },
    {
      id: USER_GUIDE_STEP_IDS.createGroup,
      route: "/friends",
      title: t("Create a group"),
      listTitle: t("Create group"),
      tooltip: t("Tap +, choose Friend Group, fill the name, then tap Save."),
      targetId: "nav-create",
      description: t("Create the group and return to the groups list."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.reviewFriendRequests,
      route: "/friends",
      title: t("Review friend requests"),
      listTitle: t("Requests and sent"),
      tooltip: t("Start with Requests."),
      targetId: "friends-tab-requests",
      sequenceTargets: [
        {
          targetId: "friends-tab-requests",
          tooltip: t("Requests shows people who want to connect with you."),
          activateOnNext: true,
        },
        {
          targetId: "friends-tab-sent",
          tooltip: t("Sent shows invitations you already sent. Next, head to Wishlists."),
          activateOnNext: true,
        },
      ],
      description: t("Learn where incoming and outgoing friend requests live."),
    },
    {
      id: USER_GUIDE_STEP_IDS.openDiscover,
      route: "/wishlists",
      title: t("Open Discover"),
      listTitle: t("Open Discover"),
      tooltip: t("Tap Discover to explore friends' gifts."),
      targetId: "wishlists-discover",
      description: t("Open Discover from the Wishlists page."),
      actionRequired: true,
    },
    {
      id: USER_GUIDE_STEP_IDS.exploreDiscoverTabs,
      route: "/wishlists/discover",
      title: t("Explore Discover tabs"),
      listTitle: t("Discover tabs"),
      tooltip: t("Start with Wishlists."),
      targetId: "discover-tab-wishlists",
      sequenceTargets: [
        {
          targetId: "discover-tab-wishlists",
          tooltip: t("Wishlists shows every shared wishlist."),
          activateOnNext: true,
        },
        {
          targetId: "discover-tab-available",
          tooltip: t("Available shows gifts that can still be reserved."),
          activateOnNext: true,
        },
        {
          targetId: "discover-tab-reserved",
          tooltip: t("Reserved shows gifts already claimed."),
          activateOnNext: true,
        },
        {
          targetId: "discover-tab-purchased",
          tooltip: t("Purchased shows gifts marked as bought."),
          activateOnNext: true,
        },
      ],
      description: t("Learn what each Discover tab means and how it helps avoid duplicate gifts."),
    },
  ] as const;
}

export function getUserGuideSegments(t: TranslateFn): readonly UserGuideSegment[] {
  return [
    {
      id: "wishlists-create",
      route: "/wishlists",
      title: t("Wishlists"),
      stepIds: [
        USER_GUIDE_STEP_IDS.mainMenu,
        USER_GUIDE_STEP_IDS.startWishlist,
        USER_GUIDE_STEP_IDS.createWishlist,
        USER_GUIDE_STEP_IDS.openWishlistDetails,
      ],
      fallbackPath: "/wishlists",
    },
    {
      id: "wishlist-detail",
      route: "/wishlists/[id]",
      title: t("Wishlist"),
      stepIds: [
        USER_GUIDE_STEP_IDS.addItem,
        USER_GUIDE_STEP_IDS.createItem,
        USER_GUIDE_STEP_IDS.shareWishlist,
        USER_GUIDE_STEP_IDS.manageWishlistAccess,
        USER_GUIDE_STEP_IDS.openFriends,
      ],
      fallbackPath: "/wishlists",
    },
    {
      id: "friends",
      route: "/friends",
      title: t("Friends"),
      stepIds: [
        USER_GUIDE_STEP_IDS.inviteFriend,
        USER_GUIDE_STEP_IDS.openFriendGroups,
        USER_GUIDE_STEP_IDS.createGroup,
        USER_GUIDE_STEP_IDS.reviewFriendRequests,
      ],
      fallbackPath: "/friends",
    },
    {
      id: "discover-open",
      route: "/wishlists",
      title: t("Discover"),
      stepIds: [USER_GUIDE_STEP_IDS.openDiscover],
      fallbackPath: "/wishlists",
    },
    {
      id: "discover",
      route: "/wishlists/discover",
      title: t("Discover"),
      stepIds: [USER_GUIDE_STEP_IDS.exploreDiscoverTabs],
      fallbackPath: "/wishlists/discover",
    },
  ] as const;
}

export function getUserGuideStep(
  steps: readonly UserGuideStep[],
  stepId: number,
): UserGuideStep | undefined {
  return steps.find((step) => step.id === stepId);
}

export function getUserGuideSegmentForStep(
  segments: readonly UserGuideSegment[],
  stepId: number,
): UserGuideSegment | undefined {
  return segments.find((segment) => segment.stepIds.includes(stepId));
}

export function matchesUserGuideRoute(pathname: string, route: UserGuideRoute): boolean {
  if (route === "/wishlists/[id]") {
    return isWishlistDetailPath(pathname);
  }
  return pathname === route;
}
