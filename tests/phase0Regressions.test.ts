/**
 * Phase 0 regression tests — guards against the bugs fixed in Task 0.1 and 0.4.
 *
 * 0.1e: buildOpeningMessage was called with wrong arg order (character in world slot)
 * 0.1f/g: applyUpdatesToCastState / normalizeCastState received Character[] where StoryCastMember[] was expected
 * 0.1h: prompt.ts referenced legacy characterId field on CastMemberState
 * 0.4: FACTORY_RESET dispatch was missing personas in payload
 */

import { describe, expect, it } from "vitest";
import { createAppFixtures } from "./testFixtures";
import { buildOpeningMessage, buildSmartPromptContext } from "../src/services/prompt";
import { applyUpdatesToCastState, getStoryCharactersFromLists } from "../src/utils/appHelpers";
import { normalizeCastState } from "../src/services/normalizers";
import { storyReducer, storyInitialState } from "../src/reducers/storyReducer";
import { normalizeWorld, normalizeCharacter, normalizePersona } from "../src/services/normalizers";

describe("Phase 0 regressions", () => {

  // -- 0.1e: buildOpeningMessage arg order --

  it("buildOpeningMessage uses world and characters correctly (not swapped)", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const story = stories[0];
    const world = worlds[0];

    const message = buildOpeningMessage(story, world, characters);

    // The greeting template is "Opening one" (no placeholders), so it should come through as-is.
    // The key assertion: it should NOT throw, and should NOT contain "undefined".
    expect(message).toBe("Opening one");
    expect(message).not.toContain("undefined");
  });

  it("buildOpeningMessage substitutes template variables from correct args", () => {
    const { worlds, characters } = createAppFixtures();
    const world = worlds[0];
    const story = {
      title: "Test Story",
      greeting: "Welcome to {{worldName}}, {{userName}}! You meet {{cast}}.",
      userProfile: { name: "Hero" },
      castMembers: [],
    } as any;

    const message = buildOpeningMessage(story, world, characters);

    expect(message).toContain("World One");       // world.name in world slot
    expect(message).toContain("Hero");             // userProfile.name
    expect(message).toContain("Mira");             // first character name
    expect(message).not.toContain("{{");           // all placeholders resolved
  });

  // -- 0.1f/g: applyUpdatesToCastState / normalizeCastState type correctness --

  it("applyUpdatesToCastState accepts castMembers (StoryCastMember[]) and characters separately", () => {
    const { stories, characters } = createAppFixtures();
    const story = stories[0];

    const updates = [
      {
        id: "u1",
        category: "character",
        title: "Mood change",
        target: "Mira",
        to: "Worried",
        details: "Mira looks worried.",
      },
    ];

    // This should NOT throw — the 3rd arg must be StoryCastMember[], 4th is Character[]
    const result = applyUpdatesToCastState(
      story.castState,
      updates,
      story.castMembers,    // StoryCastMember[]
      characters            // Character[]
    );

    expect(result).toBeDefined();
    expect(result.activeCharacters).toBeInstanceOf(Array);
    expect(result.relationships).toBeInstanceOf(Array);
    // cast member IDs should be preserved
    expect(result.activeCharacters[0]?.castMemberId).toBe("cast-1");
  });

  it("normalizeCastState accepts castMembers (StoryCastMember[]) and characters separately", () => {
    const { stories, characters } = createAppFixtures();
    const story = stories[0];

    // This should NOT throw — 2nd arg must be StoryCastMember[], 3rd is Character[]
    const result = normalizeCastState(
      story.castState,
      story.castMembers,    // StoryCastMember[]
      characters            // Character[]
    );

    expect(result).toBeDefined();
    expect(result.activeCharacters).toBeInstanceOf(Array);
    expect(result.activeCharacters.length).toBeGreaterThan(0);
    expect(result.activeCharacters[0].castMemberId).toBe("cast-1");
  });

  // -- 0.1h: prompt.ts characterId → castMemberId --

  it("buildSmartPromptContext resolves active characters by castMemberId", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const story = {
      ...stories[0],
      castState: {
        activeCharacters: [
          { castMemberId: "cast-1", presence: "active", present: true, locationId: "with_user" },
        ],
        relationships: [],
      },
    };

    // In real usage, characters passed to buildSmartPromptContext are *effective* story characters
    // (resolved via overlay, with id = castMemberId), not template characters.
    const effectiveCharacters = getStoryCharactersFromLists(story as any, characters);

    const ctx = buildSmartPromptContext({
      story: story as any,
      world: worlds[0] as any,
      characters: effectiveCharacters,
      history: [],
    });

    // The active character should be found using castMemberId, not the removed characterId field
    expect(ctx.fullCharacters.length).toBeGreaterThan(0);
    expect(ctx.fullCharacters[0].name).toBe("Mira");
    expect(ctx.fullCharacters[0].id).toBe("cast-1");
  });

  it("buildSmartPromptContext ignores rows without castMemberId", () => {
    const { worlds, characters, stories } = createAppFixtures();
    const story = {
      ...stories[0],
      castState: {
        activeCharacters: [
          // A malformed row with no castMemberId at all — should be skipped, not crash
          { presence: "active", present: true } as any,
        ],
        relationships: [],
      },
    };

    const effectiveCharacters = getStoryCharactersFromLists(story as any, characters);

    // Should not throw
    const ctx = buildSmartPromptContext({
      story: story as any,
      world: worlds[0] as any,
      characters: effectiveCharacters,
      history: [],
    });

    expect(ctx).toBeDefined();
    expect(ctx.fullCharacters).toBeInstanceOf(Array);
  });

  // -- 0.4: FACTORY_RESET must include personas --

  it("FACTORY_RESET preserves personas in state", () => {
    const nextWorlds = [normalizeWorld({ id: "w1", name: "Reset World" })];
    const nextCharacters = [normalizeCharacter({ id: "c1", name: "Reset Char" })];
    const nextPersonas = [normalizePersona({ id: "p1", name: "Reset Persona" })];

    const state = storyReducer(storyInitialState, {
      type: "FACTORY_RESET",
      payload: {
        worlds: nextWorlds,
        characters: nextCharacters,
        storyMetas: [],
        personas: nextPersonas,
      },
    });

    expect(state.personas).toHaveLength(1);
    expect(state.personas[0].name).toBe("Reset Persona");
    expect(state.personas[0].id).toBe("p1");
  });

  it("FACTORY_RESET with empty personas array results in empty personas, not undefined", () => {
    const state = storyReducer(storyInitialState, {
      type: "FACTORY_RESET",
      payload: {
        worlds: [],
        characters: [],
        storyMetas: [],
        personas: [],
      },
    });

    expect(state.personas).toEqual([]);
    expect(state.personas).not.toBeUndefined();
  });
});
