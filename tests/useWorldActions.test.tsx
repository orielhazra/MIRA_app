import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import useWorldActions from "../src/hooks/useWorldActions";
import { createAppFixtures, TestProviders } from "./testFixtures";

describe("useWorldActions", () => {


  it("first save of a blank starter world replaces version 1 instead of creating hidden version clutter", () => {
    const blankStarter = {
      id: "world_blank_v1",
      templateKey: "world_blank_v1",
      templateVersion: 1,
      name: "New World",
      shortDescription: "Blank world template",
      overview: "",
      description: "",
      rules: "",
      locations: [],
      worldLorebook: [],
      createdAt: 100,
    } as any;
    const saveWorldList = vi.fn();
    const setSelectedWorldSheetId = vi.fn();
    const setActiveView = vi.fn();
    const { result } = renderHook(() => useWorldActions(), { wrapper: TestProviders });

    let returnedWorld: any;
    act(() => {
      returnedWorld = result.current.saveWorldSheetEdits({
        worldDraft: { ...blankStarter, name: "Ashen World", shortDescription: "First saved version" },
        worlds: [blankStarter] as any,
        saveWorldList,
        setSelectedWorldSheetId,
        setActiveView,
      });
    });

    const nextWorlds = saveWorldList.mock.calls[0][0];
    expect(nextWorlds).toHaveLength(1);
    expect(returnedWorld).toMatchObject({
      id: "world_blank_v1",
      templateKey: "world_blank_v1",
      templateVersion: 1,
      name: "Ashen World",
      shortDescription: "First saved version",
    });
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith("world_blank_v1");
  });
  it("saveWorldSheetEdits creates a new template version instead of mutating the old one", () => {
    const { worlds } = createAppFixtures();
    const baseWorld = { ...worlds[0], templateKey: "world-one", templateVersion: 1 } as any;
    const oldVersion = { ...baseWorld, id: "world-1-old", templateVersion: 2 } as any;
    const saveWorldList = vi.fn();
    const setSelectedWorldSheetId = vi.fn();
    const setActiveView = vi.fn();
    const { result } = renderHook(() => useWorldActions(), { wrapper: TestProviders });

    let returnedWorld: any;
    act(() => {
      returnedWorld = result.current.saveWorldSheetEdits({
        worldDraft: { ...oldVersion, name: "World One Revised" },
        worlds: [baseWorld, oldVersion] as any,
        saveWorldList,
        setSelectedWorldSheetId,
        setActiveView,
      });
    });

    const nextWorlds = saveWorldList.mock.calls[0][0];
    expect(nextWorlds).toHaveLength(3);
    expect(returnedWorld).toMatchObject({
      name: "World One Revised",
      templateKey: "world-one",
      templateVersion: 3,
    });
    expect(returnedWorld.id).not.toBe(oldVersion.id);
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith(returnedWorld.id);
    expect(setActiveView).toHaveBeenCalledWith("world");
  });

  it("deleteSelectedWorld removes the whole template family only when no stories use any version", () => {
    const { worlds } = createAppFixtures();
    const familyV1 = { ...worlds[0], id: "world_family_v1", templateKey: "world-family", templateVersion: 1 } as any;
    const familyV2 = { ...worlds[0], id: "world_family_v2", templateKey: "world-family", templateVersion: 2 } as any;
    const unrelated = { ...worlds[1], id: "world_other_v1", templateKey: "world-other", templateVersion: 1 } as any;
    const saveWorldList = vi.fn();
    const setSelectedWorldSheetId = vi.fn();
    const setActiveView = vi.fn();
    const getWorld = (id: string) => [familyV1, familyV2, unrelated].find((world) => world.id === id);
    const { result } = renderHook(() => useWorldActions(), { wrapper: TestProviders });

    act(() => {
      result.current.deleteSelectedWorld({
        worlds: [familyV1, familyV2, unrelated] as any,
        storyMetas: [] as any,
        worldId: familyV2.id,
        getWorld,
        saveWorldList,
        setSelectedWorldSheetId,
        setActiveView,
      });
    });

    expect(saveWorldList).toHaveBeenCalledWith([unrelated]);
    expect(setSelectedWorldSheetId).toHaveBeenCalledWith(unrelated.id);
    expect(setActiveView).toHaveBeenCalledWith("landing");
  });

  it("deleteSelectedWorld blocks deleting a template family if any version is still used", () => {
    const { worlds } = createAppFixtures();
    const familyV1 = { ...worlds[0], id: "world_family_v1", templateKey: "world-family", templateVersion: 1, name: "World Family" } as any;
    const familyV2 = { ...worlds[0], id: "world_family_v2", templateKey: "world-family", templateVersion: 2, name: "World Family" } as any;
    const saveWorldList = vi.fn();
    const getWorld = (id: string) => [familyV1, familyV2].find((world) => world.id === id);
    const { result } = renderHook(() => useWorldActions(), { wrapper: TestProviders });

    act(() => {
      result.current.deleteSelectedWorld({
        worlds: [familyV1, familyV2] as any,
        storyMetas: [{ id: "story-1", title: "Story One", templateWorldId: familyV1.id, characterIds: [], characterCount: 0 }] as any,
        worldId: familyV2.id,
        getWorld,
        saveWorldList,
      });
    });

    expect(saveWorldList).not.toHaveBeenCalled();
    // showToast is called with the error message (was alert before)
  });
});
