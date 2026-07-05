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

export const USER_GUIDE_STEPS: readonly UserGuideStep[] = [
  {
    id: 1,
    route: "/wishlists",
    title: "Explore the main menu",
    listTitle: "Main menu",
    tooltip: "Start with Wishlists.",
    targetId: "nav-wishlists",
    sequenceTargets: [
      {
        targetId: "nav-wishlists",
        tooltip: "Wishlists is where your own lists live.",
      },
      {
        targetId: "nav-create",
        tooltip: "The + button creates wishlists, wishes, events, and more.",
      },
      {
        targetId: "nav-friends",
        tooltip: "Friends is where invites, requests, and groups live.",
      },
      {
        targetId: "nav-profile",
        tooltip: "Profile is where your account and settings live.",
      },
    ],
    description: "Learn where each main section lives before creating your first wishlist.",
  },
  {
    id: 2,
    route: "/wishlists",
    title: "Start a wishlist",
    listTitle: "Start wishlist",
    tooltip: "Tap + and choose New Wishlist.",
    targetId: "nav-create",
    description: "Tap the + button and choose New Wishlist to start your first wishlist.",
    actionRequired: true,
  },
  {
    id: 3,
    route: "/wishlists",
    title: "Create the wishlist",
    listTitle: "Create wishlist",
    tooltip: "Fill the name, then tap Create wishlist.",
    targetId: "create-wishlist-submit",
    description: "Create the wishlist to continue to the wishlist detail page.",
    actionRequired: true,
  },
  {
    id: 4,
    route: "/wishlists",
    title: "Open wishlist details",
    listTitle: "Open details",
    tooltip: "Tap your wishlist card to open its details.",
    targetId: "home-wishlist-card",
    description: "Open the wishlist detail page to continue adding items.",
    actionRequired: true,
  },
  {
    id: 5,
    route: "/wishlists/[id]",
    title: "Add a gift idea",
    listTitle: "Add item",
    tooltip: "Tap + and choose New Wish.",
    targetId: "nav-create",
    description: "Tap the + button and choose New Wish to add a product or gift idea.",
    actionRequired: true,
  },
  {
    id: 6,
    route: "/wishlists/[id]",
    title: "Create the item",
    listTitle: "Create item",
    tooltip: "Fill the item name, then tap Create item.",
    targetId: "create-item-submit",
    description: "Create the item and return to the wishlist item grid.",
    actionRequired: true,
  },
  {
    id: 7,
    route: "/wishlists/[id]",
    title: "Share the wishlist",
    listTitle: "Share",
    tooltip: "Tap Share to copy a share link.",
    targetId: "wishlist-share",
    description: "Create a link friends can open to view and reserve items.",
    actionRequired: true,
  },
  {
    id: 8,
    route: "/wishlists/[id]",
    title: "Manage sharing access",
    listTitle: "Manage access",
    tooltip: "Open access settings for this wishlist.",
    targetId: "wishlist-manage-access",
    description: "Grant or revoke access for specific friends and groups.",
    actionRequired: true,
  },
  {
    id: 9,
    route: "/wishlists/[id]",
    title: "Open Friends",
    listTitle: "Open Friends",
    tooltip: "Tap Friends in the tab bar.",
    targetId: "nav-friends",
    description: "Open Friends directly from the wishlist detail page.",
    actionRequired: true,
  },
  {
    id: 10,
    route: "/friends",
    title: "Invite a friend",
    listTitle: "Add friend",
    tooltip: "Tap + and choose Invite Friend.",
    targetId: "nav-create",
    description: "Tap the + button and choose Invite Friend to add someone.",
    actionRequired: true,
  },
  {
    id: 11,
    route: "/friends",
    title: "Open friend groups",
    listTitle: "Friends and groups",
    tooltip: "Start with Friends.",
    targetId: "friends-tab-friends",
    sequenceTargets: [
      {
        targetId: "friends-tab-friends",
        tooltip: "Friends shows everyone already connected with you.",
        activateOnNext: true,
      },
      {
        targetId: "friends-tab-groups",
        tooltip: "Groups helps you organize friends for sharing.",
        activateOnNext: true,
      },
    ],
    description: "Move from the friends list to the groups tab.",
  },
  {
    id: 12,
    route: "/friends",
    title: "Create a group",
    listTitle: "Create group",
    tooltip: "Tap +, choose Friend Group, fill the name, then tap Save.",
    targetId: "nav-create",
    description: "Create the group and return to the groups list.",
    actionRequired: true,
  },
  {
    id: 13,
    route: "/friends",
    title: "Review friend requests",
    listTitle: "Requests and sent",
    tooltip: "Start with Requests.",
    targetId: "friends-tab-requests",
    sequenceTargets: [
      {
        targetId: "friends-tab-requests",
        tooltip: "Requests shows people who want to connect with you.",
        activateOnNext: true,
      },
      {
        targetId: "friends-tab-sent",
        tooltip: "Sent shows invitations you already sent. Next, head to Wishlists.",
        activateOnNext: true,
      },
    ],
    description: "Learn where incoming and outgoing friend requests live.",
  },
  {
    id: 14,
    route: "/wishlists",
    title: "Open Discover",
    listTitle: "Open Discover",
    tooltip: "Tap Discover to explore friends' gifts.",
    targetId: "wishlists-discover",
    description: "Open Discover from the Wishlists page.",
    actionRequired: true,
  },
  {
    id: 15,
    route: "/wishlists/discover",
    title: "Explore Discover tabs",
    listTitle: "Discover tabs",
    tooltip: "Start with Wishlists.",
    targetId: "discover-tab-wishlists",
    sequenceTargets: [
      {
        targetId: "discover-tab-wishlists",
        tooltip: "Wishlists shows every shared wishlist.",
        activateOnNext: true,
      },
      {
        targetId: "discover-tab-available",
        tooltip: "Available shows gifts that can still be reserved.",
        activateOnNext: true,
      },
      {
        targetId: "discover-tab-reserved",
        tooltip: "Reserved shows gifts already claimed.",
        activateOnNext: true,
      },
      {
        targetId: "discover-tab-purchased",
        tooltip: "Purchased shows gifts marked as bought.",
        activateOnNext: true,
      },
    ],
    description: "Learn what each Discover tab means and how it helps avoid duplicate gifts.",
  },
] as const;

export const USER_GUIDE_SEGMENTS: readonly UserGuideSegment[] = [
  {
    id: "wishlists-create",
    route: "/wishlists",
    title: "Wishlists",
    stepIds: [1, 2, 3, 4],
    fallbackPath: "/wishlists",
  },
  {
    id: "wishlist-detail",
    route: "/wishlists/[id]",
    title: "Wishlist",
    stepIds: [5, 6, 7, 8, 9],
    fallbackPath: "/wishlists",
  },
  {
    id: "friends",
    route: "/friends",
    title: "Friends",
    stepIds: [10, 11, 12, 13],
    fallbackPath: "/friends",
  },
  {
    id: "discover-open",
    route: "/wishlists",
    title: "Discover",
    stepIds: [14],
    fallbackPath: "/wishlists",
  },
  {
    id: "discover",
    route: "/wishlists/discover",
    title: "Discover",
    stepIds: [15],
    fallbackPath: "/wishlists/discover",
  },
] as const;

export function getUserGuideStep(stepId: number): UserGuideStep | undefined {
  return USER_GUIDE_STEPS.find((step) => step.id === stepId);
}

export function getUserGuideSegmentForStep(stepId: number): UserGuideSegment | undefined {
  return USER_GUIDE_SEGMENTS.find((segment) => segment.stepIds.includes(stepId));
}

export function matchesUserGuideRoute(pathname: string, route: UserGuideRoute): boolean {
  if (route === "/wishlists/[id]") {
    return pathname.startsWith("/wishlists/") && pathname !== "/wishlists/discover";
  }
  return pathname === route;
}
