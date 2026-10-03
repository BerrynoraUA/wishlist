import { describe, expect, it } from "vitest";
import {
  getNextUserGuideStep,
  getUserGuideSegments,
  getUserGuideSteps,
  USER_GUIDE_STEP_IDS,
} from "./user-guide-config";

const translate = (message: string) => message;

describe("retired guide step", () => {
  it("continues from sharing to Friends for saved progress on either side of step 8", () => {
    const steps = getUserGuideSteps(translate);
    const wishlistSegment = getUserGuideSegments(translate).find(
      (segment) => segment.id === "wishlist-detail",
    );

    expect(steps.some((step) => step.id === 8)).toBe(false);
    expect(wishlistSegment?.stepIds).toEqual([
      USER_GUIDE_STEP_IDS.addItem,
      USER_GUIDE_STEP_IDS.createItem,
      USER_GUIDE_STEP_IDS.shareWishlist,
      USER_GUIDE_STEP_IDS.openFriends,
    ]);
    expect(getNextUserGuideStep(steps, 7)?.id).toBe(USER_GUIDE_STEP_IDS.openFriends);
    expect(getNextUserGuideStep(steps, 8)?.id).toBe(USER_GUIDE_STEP_IDS.openFriends);
  });
});

describe("Friends to Discover guide transition", () => {
  it("asks for a tap on Wishlists after Sent, then points to Discover", () => {
    const steps = getUserGuideSteps(translate);
    const requestsStep = steps.find((step) => step.id === USER_GUIDE_STEP_IDS.reviewFriendRequests);

    expect(requestsStep?.sequenceTargets?.map((target) => target.targetId)).toEqual([
      "friends-tab-requests",
      "friends-tab-sent",
      "nav-wishlists",
    ]);
    expect(requestsStep?.sequenceTargets?.at(-1)?.actionRequired).toBe(true);
    expect(getNextUserGuideStep(steps, USER_GUIDE_STEP_IDS.reviewFriendRequests)?.targetId).toBe(
      "wishlists-discover",
    );
  });
});
