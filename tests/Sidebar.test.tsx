import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "../src/components/Sidebar";
import Landing from "../src/features/stories/Landing";
import { createAppFixtures } from "./testFixtures";

describe("Sidebar", () => {
  it("calls library story actions from landing", async () => {
    const user = userEvent.setup();
    const { worlds, stories } = createAppFixtures();
    const onSelectStory = vi.fn();
    const onEditStory = vi.fn();

    render(
      <Landing
        storyMetas={stories.map((story) => ({
          id: story.id,
          title: story.title,
          worldId: story.worldId,
          characterIds: story.characterIds,
          characterCount: story.characterIds.length,
          createdAt: story.createdAt,
        }))}
        worlds={worlds}
        onNewStory={vi.fn()}
        onImportStory={vi.fn()}
        onSelectStory={onSelectStory}
        onEditStory={onEditStory}
      />
    );

    // Clicking the story title card calls onEditStory
    await user.click(screen.getByRole("button", { name: /Story Two/i }));
    expect(onEditStory).toHaveBeenCalledWith("story-2");

    // Clicking the Edit action button also calls onEditStory
    await user.click(screen.getAllByText("Edit")[1]);
    expect(onEditStory).toHaveBeenCalledWith("story-2");
  });

  it("renders a collapsed rail and expands when its toggle is clicked", async () => {
    const user = userEvent.setup();
    const { worlds, characters } = createAppFixtures();
    const onToggleCollapse = vi.fn();
    const onSelectCharacter = vi.fn();
    const onNewCharacter = vi.fn();
    const onSelectWorld = vi.fn();
    const getWorld = (id: string) => worlds.find((world) => world.id === id) || null;
    const getCharacter = (id: string) => characters.find((character) => character.id === id) || null;

    render(
      <Sidebar
        activeStory={null}
        activeWorld={null}
        activeStoryCharacters={characters}
        selectedWorldSheetId=""
        selectedCharacterSheetId=""
        getWorld={getWorld}
        getCharacter={getCharacter}
        isGenerating={false}
        isCollapsed
        onToggleCollapse={onToggleCollapse}
        onNewCharacter={onNewCharacter}
        onSelectCharacter={onSelectCharacter}
        onSelectWorld={onSelectWorld}
        onEditStory={vi.fn()}
      />
    );

    expect(screen.getByText(/Library/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Expand sidebar/i }));

    expect(onToggleCollapse).toHaveBeenCalled();
  });
});
