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
        activeCharacters={[characters[0]] as any}
        isCollapsed
        onToggleCollapse={onToggleCollapse}
        onClearDirectorNotes={vi.fn()}
        onSaveSceneControl={vi.fn()}
        onSaveStoryMemory={vi.fn()}
        onSaveCastState={vi.fn()}
        onUpdateUserProfile={vi.fn()}
        onExtractUpdates={vi.fn()}
        currentContext={stories[0].currentContext as any}
        storyMemory={stories[0].storyMemory as any}
      />
    );

    expect(screen.getByText(/Control Panel/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Expand control panel/i }));

    expect(onToggleCollapse).toHaveBeenCalled();
  });
});
