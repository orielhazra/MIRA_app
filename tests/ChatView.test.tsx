import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ChatView from "../src/features/chat/ChatView";

describe("ChatView", () => {
  it("shows assistant option buttons and forwards selection events", async () => {
    const user = userEvent.setup();
    const onSelectAssistantOption = vi.fn();

    render(
      <ChatView
        messages={[
          {
            role: "assistant",
            content: "Option two",
            alternatives: ["Option one", "Option two"],
            selectedIndex: 1,
          },
        ] as any}
        editingMessageIndex={null}
        isGenerating={false}
        onStartEdit={vi.fn()}
        onCancelEdit={vi.fn()}
        onSaveEdit={vi.fn()}
        onDeleteFromHere={vi.fn()}
        onRegenerateFromHere={vi.fn()}
        onSelectAssistantOption={onSelectAssistantOption}
      />
    );

    expect(screen.getByText("Option two")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Option 1/i }));

    expect(onSelectAssistantOption).toHaveBeenCalledWith(0, 0);
  });

  it("starts editing when the edit button is clicked", async () => {
    const user = userEvent.setup();
    const onStartEdit = vi.fn();

    render(
      <ChatView
        messages={[
          { role: "user", content: "Hello there" },
        ] as any}
        editingMessageIndex={null}
        isGenerating={false}
        onStartEdit={onStartEdit}
        onCancelEdit={vi.fn()}
        onSaveEdit={vi.fn()}
        onDeleteFromHere={vi.fn()}
        onRegenerateFromHere={vi.fn()}
        onSelectAssistantOption={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Edit/i }));

    expect(onStartEdit).toHaveBeenCalledWith(0);
  });
});
