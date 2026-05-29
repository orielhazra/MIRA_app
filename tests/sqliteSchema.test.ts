import { describe, expect, it } from "vitest";
import {
  getMissingColumns,
  SQLITE_CREATE_TABLE_STATEMENTS,
  SQLITE_EXPECTED_COLUMNS,
  SQLITE_SCHEMA_PATCHES,
} from "../src/services/storage/sqliteSchema";

describe("sqliteSchema", () => {
  it("reports missing columns from the schema contract", () => {
    const missingWorldColumns = getMissingColumns(
      ["id", "name", "overview", "description", "rules", "locations", "createdAt"],
      SQLITE_EXPECTED_COLUMNS.worlds
    );
    const missingStoryColumns = getMissingColumns(
      ["id", "title", "worldId", "characterIds", "scenario", "greeting", "storyLorebook", "temporaryLorebook", "storyMemory", "currentContext", "castState", "directorNotes", "createdAt"],
      SQLITE_EXPECTED_COLUMNS.stories
    );

    expect(missingWorldColumns).toEqual(["templateKey", "templateVersion", "worldLorebook"]);
    expect(missingStoryColumns).toEqual(["templateWorldId", "templateWorldKey", "templateWorldVersion", "worldOverlay", "lastPlayedAt"]);
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

    expect(SQLITE_CREATE_TABLE_STATEMENTS.worlds).toContain("templateKey TEXT");
    expect(SQLITE_CREATE_TABLE_STATEMENTS.worlds).toContain("templateVersion INTEGER");
    expect(SQLITE_CREATE_TABLE_STATEMENTS.worlds).toContain("worldLorebook TEXT");
    expect(SQLITE_CREATE_TABLE_STATEMENTS.stories).toContain("templateWorldId TEXT");
    expect(SQLITE_CREATE_TABLE_STATEMENTS.stories).toContain("templateWorldKey TEXT");
    expect(SQLITE_CREATE_TABLE_STATEMENTS.stories).toContain("templateWorldVersion INTEGER");
    expect(SQLITE_CREATE_TABLE_STATEMENTS.stories).toContain("worldOverlay TEXT");
    expect(SQLITE_CREATE_TABLE_STATEMENTS.stories).toContain("storyLorebook TEXT");
  });

  it("declares compatibility patches for drifted schemas", () => {
    expect(SQLITE_SCHEMA_PATCHES).toContainEqual(
      expect.objectContaining({
        table: "worlds",
        column: "templateKey",
      })
    );
    expect(SQLITE_SCHEMA_PATCHES).toContainEqual(
      expect.objectContaining({
        table: "stories",
        column: "templateWorldId",
      })
    );
    expect(SQLITE_SCHEMA_PATCHES).toContainEqual(
      expect.objectContaining({
        table: "stories",
        column: "worldOverlay",
      })
    );
  });
});
