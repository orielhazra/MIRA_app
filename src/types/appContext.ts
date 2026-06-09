/**
 * Type for the AppContext value.
 * Derived from the return type of useAppManager().
 * This ensures compile-time type checking for all context consumers.
 */
import type useAppManager from "../hooks/useAppManager";

export type AppContextValue = ReturnType<typeof useAppManager>;
