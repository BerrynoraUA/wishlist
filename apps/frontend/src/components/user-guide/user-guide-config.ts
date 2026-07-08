export type UserGuideRoute = "/home" | "/wishlist/[id]" | "/friends" | "/discover";

export type UserGuideStep = {
  id: number;
  route: UserGuideRoute;
  title: string;
  listTitle: string;
  tooltip: string;
  targetId: string;
  menuTargetId?: string;
  sequenceTargets?: readonly UserGuideStepTarget[];
  screenDescription: string;
  description: string;
  actionRequired?: boolean;
};

export type UserGuideStepTarget = {
  targetId: string;
  tooltip: string;
  activateOnNext?: boolean;
};

export type UserGuideSegment = {
  id: "home-create" | "wishlist-detail" | "friends" | "discover";
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
    route: "/home",
    title: "Explore the main menu",
    listTitle: "Main menu",
    tooltip: "Start with My Wishlists.",
    targetId: "nav-home",
    sequenceTargets: [
      {
        targetId: "nav-home",
        tooltip: "My Wishlists is where your own lists live.",
      },
      {
        targetId: "nav-friends",
        tooltip: "Friends is where invites, requests, and groups live.",
      },
      {
        targetId: "nav-discover",
        tooltip: "Discover is where you can find friends' gifts.",
      },
      {
        targetId: "nav-secret-santa",
        tooltip: "Secret Santa is for group exchanges.",
      },
    ],
    screenDescription:
      "TopNav with My Wishlists, Friends, Discover, Secret Santa, notifications, theme toggle, and profile menu visible.",
    description: "Learn where each main section lives before creating your first wishlist.",
  },
  {
    id: 2,
    route: "/home",
    title: "Start a wishlist",
    listTitle: "Start wishlist",
    tooltip: "Click Add Wishlist to create your first list.",
    targetId: "home-add-wishlist",
    screenDescription:
      "`Add Wishlist` button in the dashboard header and/or `Create wishlist` add card visible.",
    description: "Click `Add Wishlist` to start creating your first wishlist.",
    actionRequired: true,
  },
  {
    id: 3,
    route: "/home",
    title: "Create the wishlist",
    listTitle: "Create wishlist",
    tooltip: "Fill the name, then click Create Wishlist.",
    targetId: "create-wishlist-submit",
    screenDescription: "`Create Wishlist` button visible in the modal footer.",
    description: "Create the wishlist to continue to the wishlist detail page.",
    actionRequired: true,
  },
  {
    id: 4,
    route: "/home",
    title: "Open wishlist details",
    listTitle: "Open details",
    tooltip: "Click your wishlist card to open its details.",
    targetId: "home-wishlist-card",
    screenDescription: "Wishlist grid visible with at least one wishlist card.",
    description: "Open the wishlist detail page to continue adding items.",
    actionRequired: true,
  },
  {
    id: 5,
    route: "/wishlist/[id]",
    title: "Add a gift idea",
    listTitle: "Add item",
    tooltip: "Click Add Item to add a gift idea.",
    targetId: "wishlist-add-item",
    screenDescription: "`Add Item` button visible in the wishlist header.",
    description: "Click `Add Item` to add a product or gift idea.",
    actionRequired: true,
  },
  {
    id: 6,
    route: "/wishlist/[id]",
    title: "Create the item",
    listTitle: "Create item",
    tooltip: "Fill the item name, then click Create Item.",
    targetId: "create-item-submit",
    screenDescription: "`Create Item` button visible in the modal footer.",
    description: "Create the item and return to the wishlist item grid.",
    actionRequired: true,
  },
  {
    id: 7,
    route: "/wishlist/[id]",
    title: "Share the wishlist",
    listTitle: "Share",
    tooltip: "Click Share to copy or create a share link.",
    targetId: "wishlist-share",
    screenDescription: "Share button visible in the wishlist header.",
    description: "Create a link friends can open to view and reserve items.",
    actionRequired: true,
  },
  {
    id: 8,
    route: "/wishlist/[id]",
    title: "Manage sharing access",
    listTitle: "Manage access",
    tooltip: "Open access settings for this wishlist.",
    targetId: "wishlist-manage-access",
    screenDescription: "Manage access button visible in the wishlist header for owners.",
    description: "Grant or revoke access for specific friends and groups.",
    actionRequired: true,
  },
  {
    id: 9,
    route: "/wishlist/[id]",
    title: "Open Friends",
    listTitle: "Open Friends",
    tooltip: "Click Friends in the top navigation.",
    targetId: "nav-friends",
    screenDescription: "Top navigation visible with the Friends tab.",
    description: "Open Friends directly from the wishlist detail page.",
    actionRequired: true,
  },
  {
    id: 10,
    route: "/friends",
    title: "Invite a friend",
    listTitle: "Add friend",
    tooltip: "Click Invite Friends to add someone.",
    targetId: "friends-invite",
    screenDescription: "Friends header invite/add action visible.",
    description: "Invite or add a friend.",
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
    screenDescription: "`Groups` tab and `Create group` action visible.",
    description: "Move from the friends list to the groups tab.",
  },
  {
    id: 12,
    route: "/friends",
    title: "Create a group",
    listTitle: "Create group",
    tooltip: "Click Create group, fill the name, then click Save.",
    targetId: "friends-create-group",
    screenDescription: "`Groups` tab visible with the `Create group` action.",
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
        tooltip: "Sent shows invitations you already sent.",
        activateOnNext: true,
      },
    ],
    screenDescription: "`Requests` and `Sent` tabs visible.",
    description: "Learn where incoming and outgoing friend requests live.",
  },
  {
    id: 14,
    route: "/friends",
    title: "Open Discover",
    listTitle: "Open Discover",
    tooltip: "Click Discover in the top navigation.",
    targetId: "nav-discover",
    screenDescription: "Top navigation visible with the Discover tab.",
    description: "Open Discover from the main navigation.",
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
    screenDescription: "Tabs visible: All Wishlists, Available, Reserved, Purchased.",
    description: "Learn what each Discover tab means and how it helps avoid duplicate gifts.",
  },
] as const;

export const USER_GUIDE_SEGMENTS: readonly UserGuideSegment[] = [
  {
    id: "home-create",
    route: "/home",
    title: "Home",
    stepIds: [1, 2, 3, 4],
    fallbackPath: "/home",
  },
  {
    id: "wishlist-detail",
    route: "/wishlist/[id]",
    title: "Wishlist",
    stepIds: [5, 6, 7, 8, 9],
    fallbackPath: "/home",
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

export function getUserGuideStep(stepId: number): UserGuideStep | undefined {
  return USER_GUIDE_STEPS.find((step) => step.id === stepId);
}

export function getUserGuideSegmentForStep(stepId: number): UserGuideSegment | undefined {
  return USER_GUIDE_SEGMENTS.find((segment) => segment.stepIds.includes(stepId));
}

export function matchesUserGuideRoute(pathname: string, route: UserGuideRoute): boolean {
  if (route === "/wishlist/[id]") return pathname.startsWith("/wishlist/");
  return pathname === route;
}

export function isUserGuideRoute(pathname: string): boolean {
  return USER_GUIDE_SEGMENTS.some((segment) => matchesUserGuideRoute(pathname, segment.route));
}
