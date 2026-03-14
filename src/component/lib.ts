import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";

const statusValidator = v.union(
  v.literal("pending"),
  v.literal("running"),
  v.literal("collecting"),
  v.literal("digesting"),
  v.literal("ready"),
  v.literal("failed"),
  v.literal("canceled"),
);

const relationshipValidator = v.object({
  sourceTable: v.string(),
  targetTable: v.string(),
  indexName: v.string(),
  fieldName: v.string(),
});

const snapshotValidator = v.object({
  _id: v.id("snapshots"),
  _creationTime: v.number(),
  snapshotId: v.string(),
  datasetId: v.string(),
  status: statusValidator,
  inputs: v.string(),
  triggeredAt: v.number(),
  format: v.optional(v.string()),
  recordCount: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
  completedAt: v.optional(v.number()),
  notifyUrl: v.optional(v.string()),
  webhookUrl: v.optional(v.string()),
  discoveryMode: v.optional(v.string()),
  limitPerInput: v.optional(v.number()),
  totalLimit: v.optional(v.number()),
  customOutputFields: v.optional(v.string()),
});

const recordValidator = v.object({
  _id: v.id("records"),
  _creationTime: v.number(),
  snapshotId: v.string(),
  datasetId: v.string(),
  data: v.string(),
  receivedAt: v.number(),
});

const deliveryLogValidator = v.object({
  _id: v.id("deliveryLogs"),
  _creationTime: v.number(),
  snapshotId: v.string(),
  event: v.string(),
  payload: v.string(),
  receivedAt: v.number(),
});

const inputValidator = v.object({
  url: v.optional(v.string()),
  keyword: v.optional(v.string()),
});

// ─── Internal helpers ────────────────────────────────────────────────────────

export const upsertSnapshot = internalMutation({
  args: {
    snapshotId: v.string(),
    datasetId: v.string(),
    status: statusValidator,
    inputs: v.string(),
    format: v.optional(v.string()),
    recordCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    triggeredAt: v.number(),
    completedAt: v.optional(v.number()),
    notifyUrl: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    discoveryMode: v.optional(v.string()),
    limitPerInput: v.optional(v.number()),
    totalLimit: v.optional(v.number()),
    customOutputFields: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("snapshots")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", args.snapshotId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        recordCount: args.recordCount,
        errorMessage: args.errorMessage,
        completedAt: args.completedAt,
      });
    } else {
      await ctx.db.insert("snapshots", args);
    }
    return null;
  },
});

export const updateSnapshotStatus = internalMutation({
  args: {
    snapshotId: v.string(),
    status: statusValidator,
    recordCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("snapshots")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", args.snapshotId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        recordCount: args.recordCount,
        errorMessage: args.errorMessage,
        completedAt: args.completedAt,
      });
    }
    return null;
  },
});

export const getSnapshotBySnapshotId = internalQuery({
  args: { snapshotId: v.string() },
  returns: v.union(v.null(), snapshotValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("snapshots")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", args.snapshotId))
      .first();
  },
});

// ─── Public queries ───────────────────────────────────────────────────────────

export const getSnapshot = query({
  args: { snapshotId: v.string() },
  returns: v.union(v.null(), snapshotValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("snapshots")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", args.snapshotId))
      .first();
  },
});

export const listSnapshots = query({
  args: {
    datasetId: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(snapshotValidator),
  handler: async (ctx, args) => {
    if (args.datasetId) {
      return await ctx.db
        .query("snapshots")
        .withIndex("by_datasetId", (q) => q.eq("datasetId", args.datasetId!))
        .order("desc")
        .take(args.limit ?? 50);
    }
    if (args.status) {
      return await ctx.db
        .query("snapshots")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .order("desc")
        .take(args.limit ?? 50);
    }
    return await ctx.db
      .query("snapshots")
      .order("desc")
      .take(args.limit ?? 50);
  },
});

export const getRecords = query({
  args: {
    snapshotId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(recordValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("records")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", args.snapshotId))
      .order("desc")
      .take(args.limit ?? 100);
  },
});

export const getDeliveryLogs = query({
  args: { snapshotId: v.string() },
  returns: v.array(deliveryLogValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deliveryLogs")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", args.snapshotId))
      .order("desc")
      .collect();
  },
});

// ─── Public actions ───────────────────────────────────────────────────────────

export const trigger = action({
  args: {
    datasetId: v.string(),
    inputs: v.array(inputValidator),
    brightdataApiToken: v.string(),
    format: v.optional(v.string()),
    webhookUrl: v.optional(v.string()),
    notifyUrl: v.optional(v.string()),
    discoveryMode: v.optional(v.string()),
    discoverBy: v.optional(v.string()),
    limitPerInput: v.optional(v.number()),
    totalLimit: v.optional(v.number()),
    customOutputFields: v.optional(v.string()),
    includeErrors: v.optional(v.boolean()),
  },
  returns: v.object({
    snapshotId: v.string(),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    const params = new URLSearchParams({
      dataset_id: args.datasetId,
      format: args.format ?? "json",
      include_errors: String(args.includeErrors ?? true),
    });

    if (args.webhookUrl) {
      params.set("endpoint", args.webhookUrl);
      params.set("uncompressed_webhook", "true");
    }
    if (args.notifyUrl) params.set("notify", args.notifyUrl);
    if (args.discoveryMode) params.set("type", args.discoveryMode);
    if (args.discoverBy) params.set("discover_by", args.discoverBy);
    if (args.limitPerInput) params.set("limit_per_input", String(args.limitPerInput));
    if (args.totalLimit) params.set("limit_multiple_urls", String(args.totalLimit));
    if (args.customOutputFields) params.set("custom_output_fields", args.customOutputFields);

    const response = await fetch(
      `https://api.brightdata.com/datasets/v3/trigger?${params.toString()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.brightdataApiToken}`,
        },
        body: JSON.stringify(args.inputs),
      }
    );

    if (!response.ok) {
      throw new Error(`Bright Data trigger failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as { snapshot_id: string };
    const snapshotId = data.snapshot_id;

    await ctx.runMutation(internal.lib.upsertSnapshot, {
      snapshotId,
      datasetId: args.datasetId,
      status: "pending",
      inputs: JSON.stringify(args.inputs),
      format: args.format,
      triggeredAt: Date.now(),
      notifyUrl: args.notifyUrl,
      webhookUrl: args.webhookUrl,
      discoveryMode: args.discoveryMode,
      limitPerInput: args.limitPerInput,
      totalLimit: args.totalLimit,
      customOutputFields: args.customOutputFields,
    });

    return { snapshotId, status: "pending" };
  },
});

export const scrape = action({
  args: {
    datasetId: v.string(),
    inputs: v.array(inputValidator),
    brightdataApiToken: v.string(),
    format: v.optional(v.string()),
    customOutputFields: v.optional(v.string()),
    includeErrors: v.optional(v.boolean()),
  },
  returns: v.object({
    records: v.array(v.string()),
    snapshotId: v.optional(v.string()),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    const response = await fetch(
      `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${args.datasetId}&format=${args.format ?? "json"}${args.customOutputFields ? `&custom_output_fields=${args.customOutputFields}` : ""}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.brightdataApiToken}`,
        },
        body: JSON.stringify({ input: args.inputs }),
      }
    );

    if (!response.ok) {
      throw new Error(`Bright Data scrape failed: ${response.status} ${await response.text()}`);
    }

    const text = await response.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = {}; }

    if (data.snapshot_id) {
      await ctx.runMutation(internal.lib.upsertSnapshot, {
        snapshotId: data.snapshot_id,
        datasetId: args.datasetId,
        status: "running",
        inputs: JSON.stringify(args.inputs),
        format: args.format,
        triggeredAt: Date.now(),
      });
      return { records: [], snapshotId: data.snapshot_id, status: "running" };
    }

    const lines = text.trim().split("\n").filter(Boolean);
    return { records: lines, status: "ready" };
  },
});

export const pollStatus = action({
  args: {
    snapshotId: v.string(),
    brightdataApiToken: v.string(),
  },
  returns: v.object({
    snapshotId: v.string(),
    status: v.string(),
    datasetId: v.string(),
  }),
  handler: async (ctx, args) => {
    const response = await fetch(
      `https://api.brightdata.com/datasets/v3/progress/${args.snapshotId}`,
      {
        headers: { Authorization: `Bearer ${args.brightdataApiToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Bright Data progress check failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as {
      snapshot_id: string;
      dataset_id: string;
      status: string;
    };

    const validStatuses = ["ready", "failed", "canceled", "running", "collecting", "digesting", "pending"];
    const status = validStatuses.includes(data.status) ? data.status : "running";

    await ctx.runMutation(internal.lib.updateSnapshotStatus, {
      snapshotId: args.snapshotId,
      status: status as any,
      completedAt: status === "ready" ? Date.now() : undefined,
    });

    return {
      snapshotId: args.snapshotId,
      status: data.status,
      datasetId: data.dataset_id ?? "",
    };
  },
});

export const cancelSnapshot = action({
  args: {
    snapshotId: v.string(),
    brightdataApiToken: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const response = await fetch(
      `https://api.brightdata.com/datasets/v3/snapshot/${args.snapshotId}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${args.brightdataApiToken}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Bright Data cancel failed: ${response.status} ${await response.text()}`);
    }

    await ctx.runMutation(internal.lib.updateSnapshotStatus, {
      snapshotId: args.snapshotId,
      status: "canceled",
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

export const handleWebhook = mutation({
  args: {
    snapshotId: v.string(),
    datasetId: v.string(),
    records: v.array(v.string()),
    status: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Store each record individually for better queryability
    for (const record of args.records) {
      await ctx.db.insert("records", {
        snapshotId: args.snapshotId,
        datasetId: args.datasetId,
        data: record,
        receivedAt: Date.now(),
      });
    }

    const existing = await ctx.db
      .query("snapshots")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", args.snapshotId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "ready",
        recordCount: (existing.recordCount ?? 0) + args.records.length,
        completedAt: Date.now(),
      });
    }

    await ctx.db.insert("deliveryLogs", {
      snapshotId: args.snapshotId,
      event: "webhook_received",
      payload: JSON.stringify({ count: args.records.length, status: args.status }),
      receivedAt: Date.now(),
    });

    return null;
  },
});

export const validateIndexes = mutation({
  args: {
    relationships: v.array(relationshipValidator),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    for (const rel of args.relationships) {
      if (!rel.sourceTable || !rel.targetTable || !rel.indexName || !rel.fieldName) {
        throw new Error(
          `Invalid relationship config: ${JSON.stringify(rel)}. All fields are required.`,
        );
      }
    }
    return null;
  },
});
