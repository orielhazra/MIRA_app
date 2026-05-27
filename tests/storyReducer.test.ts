import { describe, expect, it } from "vitest";
import { storyInitialState, storyReducer } from "../src/reducers/storyReducer";

describe("storyReducer", () => {
  it("switches the active story and view", () => {
    const next = storyReducer(
      {
        ...storyInitialState,
        activeView: "landing",
        storyDraft: { id: "draft" } as any,
      },
      { type: "SWITCH_STORY", payload: { storyId: "story-2" } }
    );

    expect(next.activeStoryId).toBe("story-2");
    expect(next.activeView).toBe("story");
    expect(next.storyDraft).toBeNull();
  });

  it("clears the active story back to landing", () => {
    const next = storyReducer(
      {
        ...storyInitialState,
        activeStoryId: "story-1",
        activeView: "story",
        storyDraft: { id: "draft" } as any,
      },
      { type: "CLEAR_ACTIVE_STORY" }
    );

    expect(next.activeStoryId).toBeNull();
    expect(next.activeView).toBe("landing");
    expect(next.storyDraft).toBeNull();
  });
});
