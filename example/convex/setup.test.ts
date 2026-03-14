/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema.js";
import componentSchema from "../../src/component/schema.js";

const modules = import.meta.glob("./**/*.ts");
const componentModules = import.meta.glob("../../src/component/**/*.ts");

export function initConvexTest() {
  const t = convexTest(schema, modules);
  t.registerComponent("convexBrightDataDatasets", componentSchema, componentModules);
  return t;
}

test("setup", () => {
  expect(initConvexTest()).toBeDefined();
});
