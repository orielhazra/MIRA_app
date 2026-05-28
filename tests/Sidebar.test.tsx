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

    await user.click(screen.getByRole("button", { name: /Story Two/i }));
    expect(onSelectStory).toHaveBeenCalledWith("story-2");

    await user.click(screen.getAllByText("Edit")[1]);
    expect(onEditStory).toHaveBeenCalledWith("story-2");
  });

  it("renders a collapsed rail and expands when its toggle is clicked", async () => {
    const user = userEvent.setup();
    const { worlds, characters, stories } = createAppFixtures();
    const onToggleCollapse = vi.fn();

    render(
      <Sidebar
        stories={stories}
        worlds={worlds}
        characters={characters}
        activeView="landing"
        selectedWorldSheetId=""
        selectedCharacterSheetId=""
        getWorld={(id: string) => worlds.find((world) => world.id === id) || null}
        getCharacter={(id: string) => characters.find((character) => character.id === id) || null}
        isGenerating={false}
        isCollapsed
        onToggleCollapse={onToggleCollapse}
        onNewStory={vi.fn()}
        onSelectStory={vi.fn()}
        onNewCharacter={vi.fn()}
        onSelectCharacter={vi.fn()}
        onNewWorld={vi.fn()}
        onSelectWorld={vi.fn()}
        onFactoryReset={vi.fn()}
      />
    );

    expect(screen.getByText(/Library/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Expand sidebar/i }));

    expect(onToggleCollapse).toHaveBeenCalled();
  });
});
