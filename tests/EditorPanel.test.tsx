import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EditorPanel from "../src/components/EditorPanel";
import { createAppFixtures } from "./testFixtures";

describe("EditorPanel", () => {
  it("renders a collapsed rail and expands when its toggle is clicked", async () => {
    const user = userEvent.setup();
    const { worlds, characters, stories } = createAppFixtures();
    const onToggleCollapse = vi.fn();

    render(
      <EditorPanel
        activeStory={stories[0] as any}
        activeWorld={worlds[0] as any}
        activeCharacter={characters[0] as any}
        activeCharacters={[characters[0]] as any}
        activeLoreMemory={[] as any}
        loreStatusText="Lore: none"
        isCollapsed
        onToggleCollapse={onToggleCollapse}
        onClearDirectorNotes={vi.fn()}
        onSaveSceneControl={vi.fn()}
        onExportStory={vi.fn()}
        onDeleteStory={vi.fn()}
        onSaveCharacterIdentity={vi.fn()}
        onExportCharacterTemplate={vi.fn()}
        onImportCharacterTemplate={vi.fn()}
        onUpdateStoryLore={vi.fn()}
        onUpdateWorldLore={vi.fn()}
        onUpdateCharacterLore={vi.fn()}
        onSaveTemporaryLore={vi.fn()}
        onClearTemporaryLore={vi.fn()}
        onRefreshActiveLore={vi.fn()}
        currentContext={stories[0].currentContext as any}
        storyMemory={stories[0].storyMemory as any}
        castState={stories[0].castState as any}
        onSaveStoryMemory={vi.fn()}
        onSaveCastState={vi.fn()}
        onExtractUpdates={vi.fn()}
      />
    );

    expect(screen.getByText(/Control Panel/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Expand control panel/i }));

    expect(onToggleCollapse).toHaveBeenCalled();
  });
});
