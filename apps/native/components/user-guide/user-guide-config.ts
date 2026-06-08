export type UserGuideRoute = "/wishlists" | "/wishlists/[id]" | "/friends" | "/discover";

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
  actionRequired?: boolean;
};

export type UserGuideSegment = {
  id: "wishlists-create" | "wishlist-detail" | "friends" | "discover";
  route: UserGuideRoute;
  title: string;
  stepIds: readonly number[];
  fallbackPath: string;
};

export const USER_GUIDE_COMPLETE_STEP = 15;
export const USER_GUIDE_LAST_WISHLIST_PATH_KEY = "wishlane:native:user-guide:last-wishlist-path";

export const USER_GUIDE_STEPS: readonly UserGuideStep[] = [
  {
    id: 1,
    route: "/wishlists",
    title: "Explore main tabs",
    listTitle: "Main tabs",
    tooltip: "Start with Wishlists.",
    targetId: "nav-wishlists",
    sequenceTargets: [
      { targetId: "nav-wishlists", tooltip: "Wishlists is where your lists live." },
      { targetId: "nav-friends", tooltip: "Friends is where invites and groups live." },
      { targetId: "nav-discover", tooltip: "Discover is where you browse shared gifts." },
      { targetId: "nav-profile", tooltip: "Profile is where account settings live." },
    ],
  },
  {
    id: 2,
    route: "/wishlists",
    title: "Start a wishlist",
    listTitle: "Start wishlist",
    tooltip: "Tap Add Wishlist.",
    targetId: "wishlists-add-wishlist",
    actionRequired: true,
  },
  {
    id: 3,
    route: "/wishlists",
    title: "Create the wishlist",
    listTitle: "Create wishlist",
    tooltip: "Fill the name, then tap Create wishlist.",
    targetId: "create-wishlist-submit",
    actionRequired: true,
  },
  {
    id: 4,
    route: "/wishlists",
    title: "Open wishlist details",
    listTitle: "Open details",
    tooltip: "Tap your wishlist card.",
    targetId: "wishlists-card",
    actionRequired: true,
  },
  {
    id: 5,
    route: "/wishlists/[id]",
    title: "Add a gift idea",
    listTitle: "Add item",
    tooltip: "Tap Add Item.",
    targetId: "wishlist-add-item",
    actionRequired: true,
  },
  {
    id: 6,
    route: "/wishlists/[id]",
    title: "Create the item",
    listTitle: "Create item",
    tooltip: "Fill the name, then tap Create item.",
    targetId: "create-item-submit",
    actionRequired: true,
  },
  {
    id: 7,
    route: "/wishlists/[id]",
    title: "Share the wishlist",
    listTitle: "Share",
    tooltip: "Tap Share to create a link.",
    targetId: "wishlist-share",
    actionRequired: true,
  },
  {
    id: 8,
    route: "/wishlists/[id]",
    title: "Manage sharing access",
    listTitle: "Manage access",
    tooltip: "Tap access settings.",
    targetId: "wishlist-manage-access",
    actionRequired: true,
  },
  {
    id: 9,
    route: "/wishlists/[id]",
    title: "Open Friends",
    listTitle: "Open Friends",
    tooltip: "Tap Friends in the tab bar.",
    targetId: "nav-friends",
    actionRequired: true,
  },
  {
    id: 10,
    route: "/friends",
    title: "Invite a friend",
    listTitle: "Add friend",
    tooltip: "Tap Invite.",
    targetId: "friends-invite",
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
  },
  {
    id: 12,
    route: "/friends",
    title: "Create a group",
    listTitle: "Create group",
    tooltip: "Tap Create.",
    targetId: "friends-create-group",
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
        tooltip: "Sent shows invitations you already sent.",
        activateOnNext: true,
      },
    ],
  },
  {
    id: 14,
    route: "/friends",
    title: "Open Discover",
    listTitle: "Open Discover",
    tooltip: "Tap Discover in the tab bar.",
    targetId: "nav-discover",
    actionRequired: true,
  },
  {
    id: 15,
    route: "/discover",
    title: "Explore Discover tabs",
    listTitle: "Discover tabs",
    tooltip: "Start with All Wishlists.",
    targetId: "discover-tab-wishlists",
    sequenceTargets: [
      {
        targetId: "discover-tab-wishlists",
        tooltip: "All Wishlists shows every shared wishlist.",
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
    stepIds: [10, 11, 12, 13, 14],
    fallbackPath: "/friends",
  },
  {
    id: "discover",
    route: "/discover",
    title: "Discover",
    stepIds: [15],
    fallbackPath: "/discover",
  },
] as const;

export function getUserGuideStep(stepId: number) {
  return USER_GUIDE_STEPS.find((step) => step.id === stepId);
}

export function getUserGuideSegmentForStep(stepId: number) {
  return USER_GUIDE_SEGMENTS.find((segment) => segment.stepIds.includes(stepId));
}

export function matchesUserGuideRoute(pathname: string, route: UserGuideRoute) {
  if (route === "/wishlists/[id]") return pathname.startsWith("/wishlists/");
  return pathname === route;
}
