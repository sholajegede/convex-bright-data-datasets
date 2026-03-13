import { describe, expect, test } from "vitest";
import { initConvexTest } from "./setup.test";
import { api } from "./_generated/api";

describe("convex-bright-data-datasets example", () => {
  test("listSnapshots returns empty array when nothing triggered", async () => {
    const t = initConvexTest();
    const result = await t.query(api.example.listSnapshots, {});
    expect(result).toEqual([]);
  });

  test("getSnapshot returns null for unknown snapshotId", async () => {
    const t = initConvexTest();
    const result = await t.query(api.example.getSnapshot, {
      snapshotId: "s_unknown",
    });
    expect(result).toBeNull();
  });
});
