import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HeaderSettingsMenu from "../src/components/HeaderSettingsMenu";

describe("HeaderSettingsMenu", () => {
  it("opens the settings menu and saves the Kobold URL", async () => {
    const user = userEvent.setup();
    const onSaveKoboldBaseUrl = vi.fn();

    render(
      <HeaderSettingsMenu
        koboldBaseUrl="http://localhost:5001"
        persistenceInfo={{ lastError: null, pendingWrites: 0, lastSavedAt: null }}
        storageModeLabel="SQLite (Tauri)"
        storageTargetLabel="sqlite:mira.db"
        onSaveKoboldBaseUrl={onSaveKoboldBaseUrl}
        onClearPersistenceError={vi.fn()}
        onFlushPersistence={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Settings/i }));
    const input = screen.getByLabelText(/KoboldCPP Base URL/i);
    await user.clear(input);
    await user.type(input, "http://127.0.0.1:5002");
    await user.click(screen.getByRole("button", { name: /^Save$/i }));

    expect(onSaveKoboldBaseUrl).toHaveBeenCalledWith("http://127.0.0.1:5002");
    expect(screen.getByText(/Settings saved\./i)).toBeInTheDocument();
  });

  it("shows persistence warning actions when an error exists", async () => {
    const user = userEvent.setup();
    const onClearPersistenceError = vi.fn();
    const onFlushPersistence = vi.fn();

    render(
      <HeaderSettingsMenu
        koboldBaseUrl="http://localhost:5001"
        persistenceInfo={{ lastError: "Save chat: disk full", pendingWrites: 2, lastSavedAt: null }}
        storageModeLabel="LocalStorage (Browser fallback)"
        storageTargetLabel="Browser local storage"
        onSaveKoboldBaseUrl={vi.fn()}
        onClearPersistenceError={onClearPersistenceError}
        onFlushPersistence={onFlushPersistence}
      />
    );

    await user.click(screen.getByRole("button", { name: /Settings/i }));
    expect(screen.getByText(/Save chat: disk full/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Dismiss Warning/i }));
    await user.click(screen.getByRole("button", { name: /Flush Pending Writes/i }));

    expect(onClearPersistenceError).toHaveBeenCalled();
    expect(onFlushPersistence).toHaveBeenCalled();
  });
});
