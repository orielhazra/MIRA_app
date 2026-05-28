import { describe, expect, it } from "vitest";
import {
  getMissingColumns,
  SQLITE_CREATE_TABLE_STATEMENTS,
  SQLITE_EXPECTED_COLUMNS,
  SQLITE_SCHEMA_PATCHES,
} from "../src/services/storage/sqliteSchema";

describe("sqliteSchema", () => {
  it("reports missing columns from the schema contract", () => {
    const missing = getMissingColumns(
      ["id", "name", "overview", "description", "rules", "locations", "createdAt"],
      SQLITE_EXPECTED_COLUMNS.worlds
    );

    expect(missing).toEqual(["worldLorebook"]);
  });

  it("defines create statements for every core table", () => {
    expect(Object.keys(SQLITE_CREATE_TABLE_STATEMENTS)).toEqual([
      "worlds",
      "characters",
      "stories",
      "chats",
      "lore_memory",
      "settings",
    ]);

    expect(SQLITE_CREATE_TABLE_STATEMENTS.worlds).toContain("worldLorebook TEXT");
    expect(SQLITE_CREATE_TABLE_STATEMENTS.stories).toContain("storyLorebook TEXT");
  });

  it("declares compatibility patches for drifted schemas", () => {
    expect(SQLITE_SCHEMA_PATCHES).toContainEqual(
      expect.objectContaining({
        table: "worlds",
        column: "worldLorebook",
      })
    );
  });
});
