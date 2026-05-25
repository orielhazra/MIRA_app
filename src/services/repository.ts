import { localStorageEngine } from "./storage/localStorageEngine";
import { sqliteEngine, isTauri } from "./storage/sqliteEngine";

// ==========================================
// 🎯 Central Gateway: Export the correct engine dynamically!
// ==========================================
export const repository = isTauri ? sqliteEngine : localStorageEngine;
export { isTauri };
