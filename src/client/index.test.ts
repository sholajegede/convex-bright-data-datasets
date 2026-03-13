import { describe, expect, test } from "vitest";
import { BrightDatasets } from "./index.js";
import { components } from "./setup.test.js";

describe("BrightDatasets client", () => {
  test("instantiates with required options", () => {
    const client = new BrightDatasets(components.convexBrightDataDatasets, {
      BRIGHTDATA_API_TOKEN: "test-token",
    });
    expect(client).toBeDefined();
    expect(client.component).toBeDefined();
  });
});
