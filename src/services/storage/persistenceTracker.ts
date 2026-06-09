/**
 * Shared persistence status tracking.
 * Used by both localStorageEngine and sqliteEngine.
 * Single source of truth — do not duplicate status/listener logic in engine files.
 */

export interface PersistenceStatus {
  lastError: string | null;
  lastOperation: string | null;
  lastSavedAt: number | null;
  pendingWrites: number;
}

export interface PersistenceTracker {
  /** Get a snapshot of the current persistence status. */
  getStatus(): PersistenceStatus;
  /** Subscribe to status changes. Returns an unsubscribe function. */
  subscribe(listener: (status: PersistenceStatus) => void): () => void;
  /** Clear the last error. */
  clearError(): void;
  /** Update one or more status fields and notify listeners. */
  update(patch: Partial<PersistenceStatus>): void;
  /** Mark a successful write operation. */
  markSuccess(operationLabel: string): void;
  /** Mark a failed write operation. */
  markFailure(operationLabel: string, error: unknown): void;
  /** Run a synchronous writer with automatic pending-write tracking. */
  withTrackedWrite<T>(operationLabel: string, writer: () => T): T;
}

/**
 * Creates an isolated persistence tracker instance.
 * Each storage engine gets its own instance.
 */
export function createPersistenceTracker(): PersistenceTracker {
  const status: PersistenceStatus = {
    lastError: null,
    lastOperation: null,
    lastSavedAt: null,
    pendingWrites: 0,
  };

  const listeners = new Set<(status: PersistenceStatus) => void>();

  function emit() {
    const snapshot = { ...status };
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function update(patch: Partial<PersistenceStatus>) {
    Object.assign(status, patch);
    emit();
  }

  function markSuccess(operationLabel: string) {
    update({
      lastError: null,
      lastOperation: operationLabel,
      lastSavedAt: Date.now(),
    });
  }

  function markFailure(operationLabel: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${operationLabel} failed:`, error);
    update({
      lastError: `${operationLabel}: ${message}`,
      lastOperation: operationLabel,
    });
  }

  function withTrackedWrite<T>(operationLabel: string, writer: () => T): T {
    update({ pendingWrites: status.pendingWrites + 1, lastOperation: operationLabel });

    try {
      const result = writer();
      update({
        pendingWrites: Math.max(0, status.pendingWrites - 1),
        lastError: null,
        lastOperation: operationLabel,
        lastSavedAt: Date.now(),
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      update({
        pendingWrites: Math.max(0, status.pendingWrites - 1),
        lastError: `${operationLabel}: ${message}`,
        lastOperation: operationLabel,
      });
      throw error;
    }
  }

  return {
    getStatus: () => ({ ...status }),
    subscribe(listener) {
      listeners.add(listener);
      listener({ ...status });
      return () => listeners.delete(listener);
    },
    clearError: () => update({ lastError: null }),
    update,
    markSuccess,
    markFailure,
    withTrackedWrite,
  };
}
