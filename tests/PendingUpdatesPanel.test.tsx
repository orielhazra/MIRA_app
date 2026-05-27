import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PendingUpdatesPanel from "../src/components/PendingUpdatesPanel";

describe("PendingUpdatesPanel", () => {
  it("renders suggestions and disables apply when nothing is selected", () => {
    render(
      <PendingUpdatesPanel
        updates={[
          { id: "update-1", category: "location", title: "Move scene", target: "Scene", to: "Platform 9", details: "The cast moved.", confidence: 0.8 },
        ]}
        selectedIds={[]}
        status="1 suggested update ready for review."
        onToggle={vi.fn()}
        onApplySelected={vi.fn()}
        onRejectAll={vi.fn()}
      />
    );

    expect(screen.getByText("Suggested State Updates")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apply selected/i })).toBeDisabled();
    expect(screen.getByText(/80% confidence/i)).toBeInTheDocument();
  });

  it("calls handlers when toggling and applying updates", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onApplySelected = vi.fn();
    const onRejectAll = vi.fn();

    render(
      <PendingUpdatesPanel
        updates={[
          { id: "update-1", category: "location", title: "Move scene", target: "Scene", to: "Platform 9", details: "The cast moved." },
        ]}
        selectedIds={["update-1"]}
        status="1 suggested update ready for review."
        onToggle={onToggle}
        onApplySelected={onApplySelected}
        onRejectAll={onRejectAll}
      />
    );

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Apply selected/i }));
    await user.click(screen.getByRole("button", { name: /Reject all/i }));

    expect(onToggle).toHaveBeenCalledWith("update-1");
    expect(onApplySelected).toHaveBeenCalled();
    expect(onRejectAll).toHaveBeenCalled();
  });
});
