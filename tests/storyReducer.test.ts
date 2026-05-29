import { describe, expect, it } from "vitest";
import { storyInitialState, storyReducer } from "../src/reducers/storyReducer";

describe("storyReducer", () => {
  it("sets the active story directly", () => {
    const story = { id: "story-2", title: "Story Two", templateWorldId: "world-1", characterIds: [] } as any;
    const next = storyReducer(
      {
        ...storyInitialState,
        activeView: "landing",
        storyDraft: { id: "draft" } as any,
      },
      { type: "SET_ACTIVE_STORY", payload: story }
    );

    expect(next.activeStory?.id).toBe("story-2");
  });

  it("clears the active story back to landing", () => {
    const next = storyReducer(
      {
        ...storyInitialState,
        activeStory: { id: "story-1", title: "Story One", templateWorldId: "world-1", characterIds: [] } as any,
        activeView: "story",
        storyDraft: { id: "draft" } as any,
      },
      { type: "CLEAR_ACTIVE_STORY" }
    );

    expect(next.activeStory).toBeNull();
    expect(next.activeView).toBe("landing");
    expect(next.storyDraft).toBeNull();
  });
});
