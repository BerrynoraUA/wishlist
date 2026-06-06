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
};

export type UserGuideSegment = {
  id: "home-create" | "wishlist-detail" | "home-cards" | "friends" | "discover";
  route: UserGuideRoute;
  title: string;
  stepIds: readonly number[];
  fallbackPath: string;
};

export const USER_GUIDE_COMPLETE_STEP = 20;
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
        tooltip: "Hover My Wishlists.",
      },
      {
        targetId: "nav-friends",
        tooltip: "Now hover Friends.",
      },
      {
        targetId: "nav-discover",
        tooltip: "Now hover Discover.",
      },
      {
        targetId: "nav-secret-santa",
        tooltip: "Finally hover Secret Santa.",
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
    title: "Edit wishlist",
    listTitle: "Edit wishlist",
    tooltip: "Open More options, then choose Edit.",
    targetId: "wishlist-more-options",
    menuTargetId: "wishlist-edit-action",
    screenDescription:
      "More options menu open in the wishlist header with the `Edit` action visible.",
    description: "Open the edit modal to update wishlist details.",
    actionRequired: true,
  },
  {
    id: 10,
    route: "/wishlist/[id]",
    title: "Delete wishlist",
    listTitle: "Delete wishlist",
    tooltip: "Open More options, then choose Delete.",
    targetId: "wishlist-more-options",
    menuTargetId: "wishlist-delete-action",
    screenDescription:
      "More options menu open in the wishlist header with the `Delete` action visible.",
    description: "Open the delete confirmation flow for the wishlist.",
    actionRequired: true,
  },
  {
    id: 11,
    route: "/home",
    title: "Open a wishlist card",
    listTitle: "Open card",
    tooltip: "Click a wishlist card to open it.",
    targetId: "home-wishlist-card",
    screenDescription: "Wishlist grid visible with at least one wishlist card.",
    description: "Clicking a wishlist card opens its detail page.",
    actionRequired: true,
  },
  {
    id: 12,
    route: "/home",
    title: "Open Friends",
    listTitle: "Open Friends",
    tooltip: "Click Friends in the top navigation.",
    targetId: "nav-friends",
    screenDescription: "Top navigation visible with the Friends tab.",
    description: "Open Friends from the main navigation.",
    actionRequired: true,
  },
  {
    id: 13,
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
    id: 14,
    route: "/friends",
    title: "Review friend requests",
    listTitle: "Requests",
    tooltip: "Open Requests to review incoming friend requests.",
    targetId: "friends-tab-requests",
    screenDescription: "`Requests` tab visible.",
    description: "Incoming requests can be accepted or rejected.",
  },
  {
    id: 15,
    route: "/friends",
    title: "Check sent requests",
    listTitle: "Sent",
    tooltip: "Open Sent to track outgoing requests.",
    targetId: "friends-tab-sent",
    screenDescription: "`Sent` tab visible.",
    description: "Outgoing requests can be tracked or canceled.",
  },
  {
    id: 16,
    route: "/friends",
    title: "Open friend groups",
    listTitle: "Groups",
    tooltip: "Open Groups to manage friend groups.",
    targetId: "friends-tab-groups",
    screenDescription: "`Groups` tab and `Create group` action visible.",
    description: "Groups make it easier to share wishlists with several friends at once.",
  },
  {
    id: 17,
    route: "/friends",
    title: "Create a group",
    listTitle: "Create group",
    tooltip: "Click Create group to open the group modal.",
    targetId: "friends-create-group",
    screenDescription: "`Groups` tab visible with the `Create group` action.",
    description: "Open the create group modal from the Groups tab.",
    actionRequired: true,
  },
  {
    id: 18,
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
    id: 19,
    route: "/discover",
    title: "Explore Discover tabs",
    listTitle: "Discover tabs",
    tooltip: "Start with All Wishlists.",
    targetId: "discover-tab-wishlists",
    sequenceTargets: [
      {
        targetId: "discover-tab-wishlists",
        tooltip: "Hover All Wishlists.",
      },
      {
        targetId: "discover-tab-available",
        tooltip: "Now hover Available.",
      },
      {
        targetId: "discover-tab-reserved",
        tooltip: "Now hover Reserved.",
      },
      {
        targetId: "discover-tab-purchased",
        tooltip: "Finally hover Purchased.",
      },
    ],
    screenDescription: "Tabs visible: All Wishlists, Available, Reserved, Purchased.",
    description: "Learn what each Discover tab means and how it helps avoid duplicate gifts.",
  },
  {
    id: 20,
    route: "/discover",
    title: "Reserve a gift",
    listTitle: "Reserve gift",
    tooltip: "Click Reserve this gift on an available item.",
    targetId: "discover-reserve-action",
    screenDescription: "Available friend item card visible with reserve action.",
    description: "Reserve an item so others know it is being handled.",
    actionRequired: true,
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
    stepIds: [5, 6, 7, 8, 9, 10],
    fallbackPath: "/home",
  },
  {
    id: "home-cards",
    route: "/home",
    title: "Wishlists",
    stepIds: [11, 12],
    fallbackPath: "/home",
  },
  {
    id: "friends",
    route: "/friends",
    title: "Friends",
    stepIds: [13, 14, 15, 16, 17, 18],
    fallbackPath: "/friends",
  },
  {
    id: "discover",
    route: "/discover",
    title: "Discover",
    stepIds: [19, 20],
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
