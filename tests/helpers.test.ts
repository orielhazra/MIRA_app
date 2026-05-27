import { describe, expect, it } from "vitest";
import { clampNumber, cloneJson, parseKeywords, safeFileName } from "../src/utils/helpers";

describe("general helpers", () => {
  it("safeFileName normalizes text into a lowercase slug", () => {
    expect(safeFileName("Mira @ The Station!", "fallback")).toBe("mira-the-station");
    expect(safeFileName("", "fallback")).toBe("fallback");
  });

  it("cloneJson creates a deep copy", () => {
    const original = { story: { title: "Story One" }, ids: [1, 2, 3] };
    const copy = cloneJson(original);

    copy.story.title = "Story Two";
    copy.ids.push(4);

    expect(original).toEqual({ story: { title: "Story One" }, ids: [1, 2, 3] });
    expect(copy).toEqual({ story: { title: "Story Two" }, ids: [1, 2, 3, 4] });
  });

  it("parseKeywords accepts strings and arrays", () => {
    expect(parseKeywords("mira, station, archive")).toEqual(["mira", "station", "archive"]);
    expect(parseKeywords(["mira", " station ", ""])).toEqual(["mira", "station"]);
    expect(parseKeywords(null)).toEqual([]);
  });

  it("clampNumber constrains values to the provided range", () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
    expect(clampNumber(-5, 0, 10)).toBe(0);
    expect(clampNumber(50, 0, 10)).toBe(10);
    expect(clampNumber(Number.NaN, 3, 10)).toBe(3);
  });
});
