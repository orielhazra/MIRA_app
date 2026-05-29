import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Sidebar from "../src/components/Sidebar";
import Landing from "../src/features/stories/Landing";
import { createAppFixtures } from "./testFixtures";

describe("Landing", () => {
  it("calls play story action from landing", async () => {
    const user = userEvent.setup();
    const { worlds, stories } = createAppFixtures();
    const onSelectStory = vi.fn();

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
        characters={[]}
        onNewStory={vi.fn()}
        onImportStory={vi.fn()}
        onSelectStory={onSelectStory}
        onDeleteStory={vi.fn()}
        onNewCharacter={vi.fn()}
        onSelectCharacter={vi.fn()}
        onDeleteCharacter={vi.fn()}
        onNewWorld={vi.fn()}
        onSelectWorld={vi.fn()}
        onDeleteWorld={vi.fn()}
      />
    );

    // Click the story card itself (aria-label "Play Story Two")
    await user.click(screen.getByRole("button", { name: /Play Story Two/i }));
    expect(onSelectStory).toHaveBeenCalledWith("story-2");
  });

  it("renders tab navigation for stories, characters, and worlds", async () => {
    const { worlds, stories, characters } = createAppFixtures();

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
        characters={characters}
        onNewStory={vi.fn()}
        onImportStory={vi.fn()}
        onSelectStory={vi.fn()}
        onDeleteStory={vi.fn()}
        onNewCharacter={vi.fn()}
        onSelectCharacter={vi.fn()}
        onDeleteCharacter={vi.fn()}
        onNewWorld={vi.fn()}
        onSelectWorld={vi.fn()}
        onDeleteWorld={vi.fn()}
      />
    );

    // All three tabs should be visible
    expect(screen.getByRole("tab", { name: /Stories/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Characters/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Worlds/i })).toBeInTheDocument();

    // Default active tab is Stories
    expect(screen.getByRole("tab", { name: /Stories/i })).toHaveAttribute("aria-selected", "true");

    // Story cards should be visible
    expect(screen.getByText("Story One")).toBeInTheDocument();
    expect(screen.getByText("Story Two")).toBeInTheDocument();
  });

  it("switches between tabs and shows correct content", async () => {
    const user = userEvent.setup();
    const { worlds, characters } = createAppFixtures();

    render(
      <Landing
        storyMetas={[]}
        worlds={worlds}
        characters={characters}
        onNewStory={vi.fn()}
        onImportStory={vi.fn()}
        onSelectStory={vi.fn()}
        onDeleteStory={vi.fn()}
        onNewCharacter={vi.fn()}
        onSelectCharacter={vi.fn()}
        onDeleteCharacter={vi.fn()}
        onNewWorld={vi.fn()}
        onSelectWorld={vi.fn()}
        onDeleteWorld={vi.fn()}
      />
    );

    // Characters tab shows the characters
    await user.click(screen.getByRole("tab", { name: /Characters/i }));
    expect(screen.getByText("Mira")).toBeInTheDocument();
    expect(screen.getByText("Ari")).toBeInTheDocument();

    // Worlds tab shows the worlds
    await user.click(screen.getByRole("tab", { name: /Worlds/i }));
    expect(screen.getByText("World One")).toBeInTheDocument();
    expect(screen.getByText("World Two")).toBeInTheDocument();

    // Stories tab shows empty state
    await user.click(screen.getByRole("tab", { name: /Stories/i }));
    expect(screen.getByText("No stories yet.")).toBeInTheDocument();
  });
});

describe("Sidebar", () => {
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
