/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api.js";
import { initConvexTest } from "./setup.test.js";

describe("component lib", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("listSnapshots returns empty array initially", async () => {
    const t = initConvexTest();
    const result = await t.query(api.lib.listSnapshots, {});
    expect(result).toEqual([]);
  });

  test("getSnapshot returns null for unknown id", async () => {
    const t = initConvexTest();
    const result = await t.query(api.lib.getSnapshot, { snapshotId: "s_unknown" });
    expect(result).toBeNull();
  });

  test("getRecords returns empty array for unknown snapshot", async () => {
    const t = initConvexTest();
    const result = await t.query(api.lib.getRecords, { snapshotId: "s_unknown" });
    expect(result).toEqual([]);
  });

  test("getDeliveryLogs returns empty array for unknown snapshot", async () => {
    const t = initConvexTest();
    const result = await t.query(api.lib.getDeliveryLogs, { snapshotId: "s_unknown" });
    expect(result).toEqual([]);
  });
});
