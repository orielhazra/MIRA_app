import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StoryEditSheet from "../src/features/stories/StoryEditSheet";
import { createAppFixtures } from "./testFixtures";

describe("StoryEditSheet", () => {
  it("edits a loaded full story and saves the updated draft", async () => {
    const user = userEvent.setup();
    const { worlds, characters, stories } = createAppFixtures();
    const onSave = vi.fn(() => ({ ok: true }));

    render(
      <StoryEditSheet
        worlds={worlds as any}
        characters={characters as any}
        initialDraft={stories[0] as any}
        onSave={onSave}
        onCancel={vi.fn()}
        onOpenStory={vi.fn()}
      />
    );

    await user.clear(screen.getByRole("textbox", { name: /Story Title/i }));
    await user.type(screen.getByRole("textbox", { name: /Story Title/i }), "Edited Story");
    await user.selectOptions(screen.getByLabelText(/Story World/i), worlds[1].id);
    await user.click(screen.getByRole("checkbox", { name: /Ari/i }));
    await user.click(screen.getByRole("button", { name: /Save Story/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: stories[0].id,
        title: "Edited Story",
        templateWorldId: worlds[1].id,
        characterIds: [characters[0].id, characters[1].id],
      })
    );
  });

  it("shows the current pinned template version even if it is not the latest", () => {
    const worlds = [
      { id: "world-old", templateKey: "station", templateVersion: 1, name: "Station", shortDescription: "Old" },
      { id: "world-new", templateKey: "station", templateVersion: 2, name: "Station", shortDescription: "Latest" },
    ];

    render(
      <StoryEditSheet
        worlds={worlds as any}
        characters={[] as any}
        initialDraft={{ id: "story-1", title: "Story", templateWorldId: "world-old", characterIds: [] }}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onOpenStory={vi.fn()}
      />
    );

    expect(screen.getByRole("option", { name: /Station \(v1\)/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Station \(v2\)/i })).toBeInTheDocument();
  });
});
