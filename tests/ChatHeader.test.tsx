import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatHeader from "../src/components/ChatHeader";

describe("ChatHeader", () => {
  it("collapses to a single-row header showing title and buttons only", async () => {
    const user = userEvent.setup();
    const onToggleCollapse = vi.fn();

    render(
      <ChatHeader
        activeView="story"
        activeStory={{ id: "story-1", title: "Story One" } as any}
        activeWorld={{ id: "world-1", name: "World One" } as any}
        
        activeCharacters={[{ id: "char-1", name: "Mira" }] as any}
        selectedWorld={null}
        selectedCharacter={null}
        promptTokens="123 tokens"
        persistenceInfo={{ lastError: "Save chat failed" }}
        koboldBaseUrl="http://localhost:5001"
        storageModeLabel="SQLite (Tauri)"
        storageTargetLabel="sqlite:mira.db"
        generationStatus="Generating"
        loreStatusText="Lore: none"
        progressPercent={50}
        isCollapsed
        onToggleCollapse={onToggleCollapse}
        onHome={vi.fn()}
        onDebug={vi.fn()}
        onSaveKoboldBaseUrl={vi.fn()}
        databasePath=""
        onSaveDatabasePath={vi.fn()}
        onClearPersistenceError={vi.fn()}
        onFlushPersistence={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: /Story One/i })).toBeInTheDocument();
    expect(screen.queryByText(/Mira • World One/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Save warning:/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Expand top bar/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Expand top bar/i }));
    expect(onToggleCollapse).toHaveBeenCalled();
  });
});
