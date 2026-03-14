import { action, query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { BrightDatasets } from "../../src/client/index.js";
import { v } from "convex/values";

const brightDatasets = new BrightDatasets(components.convexBrightDataDatasets, {
  BRIGHTDATA_API_TOKEN: process.env.BRIGHTDATA_API_TOKEN ?? "",
});

export const triggerCollection = action({
  args: {
    datasetId: v.string(),
    inputs: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    return await brightDatasets.trigger(ctx, {
      datasetId: args.datasetId,
      inputs: args.inputs,
      webhookUrl: `${process.env.CONVEX_SITE_URL}/webhooks/brightdata`,
    });
  },
});

export const listSnapshots = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.convexBrightDataDatasets.lib.listSnapshots, {});
  },
});

export const getSnapshot = query({
  args: { snapshotId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexBrightDataDatasets.lib.getSnapshot, {
      snapshotId: args.snapshotId,
    });
  },
});

export const getRecords = query({
  args: { snapshotId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexBrightDataDatasets.lib.getRecords, {
      snapshotId: args.snapshotId,
    });
  },
});
