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
          templateWorldId: worlds[0].id,
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
        templateWorldId: worlds[0].id,
        characterIds: [characters[0].id, characters[1].id],
        scenario: "A tense arrival.",
        greeting: "Mira waits in silence.",
      })
    );
  });

  it("shows only the latest template versions in the world picker and updates template metadata", async () => {
    const user = userEvent.setup();
    const { characters } = createAppFixtures();
    const worlds = [
      { id: "world-old", templateKey: "station", templateVersion: 1, name: "Station", shortDescription: "Old" },
      { id: "world-new", templateKey: "station", templateVersion: 2, name: "Station", shortDescription: "New" },
      { id: "world-two", templateKey: "harbor", templateVersion: 1, name: "Harbor", shortDescription: "Only" },
    ];
    const onStart = vi.fn(() => ({ ok: true }));

    render(
      <StoryCreationSheet
        worlds={worlds as any}
        characters={characters as any}
        initialDraft={{
          title: "Untitled Story",
          templateWorldId: "world-new",
          templateWorldKey: "station",
          templateWorldVersion: 2,
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

    expect(screen.queryByRole("option", { name: /Station \(v1\)/i })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Station \(v2\)/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Harbor \(v1\)/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Story World/i), "world-two");
    await user.click(screen.getByRole("button", { name: /Start Story/i }));

    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({
      templateWorldId: "world-two",
      templateWorldKey: "harbor",
      templateWorldVersion: 1,
    }));
  });
});
