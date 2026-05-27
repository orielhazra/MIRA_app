import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import StoryCreationSheet from "../src/features/stories/StoryCreationSheet";
import { createAppFixtures } from "./testFixtures";

describe("StoryCreationSheet", () => {
  it("edits the draft and passes the updated values to onStart", async () => {
    const user = userEvent.setup();
    const { worlds, characters } = createAppFixtures();
    const onStart = vi.fn(() => ({ ok: true }));

    render(
      <StoryCreationSheet
        worlds={worlds as any}
        characters={characters as any}
        initialDraft={{
          title: "Untitled Story",
          worldId: worlds[0].id,
          characterIds: [characters[0].id],
          scenario: "",
          greeting: "",
          storyLorebook: [],
        }}
        onStart={onStart}
        onCancel={vi.fn()}
        onImportStory={vi.fn()}
      />
    );

    await user.clear(screen.getByDisplayValue("Untitled Story"));
    await user.type(screen.getByRole("textbox", { name: /Story Title/i }), "Night Train");
    await user.click(screen.getByRole("checkbox", { name: /Ari/i }));
    await user.type(screen.getByRole("textbox", { name: /Scenario/i }), "A tense arrival.");
    await user.type(screen.getByRole("textbox", { name: /Opening Greeting/i }), "Mira waits in silence.");
    await user.click(screen.getByRole("button", { name: /Start Story/i }));

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Night Train",
        worldId: worlds[0].id,
        characterIds: [characters[0].id, characters[1].id],
        scenario: "A tense arrival.",
        greeting: "Mira waits in silence.",
      })
    );
  });
});
