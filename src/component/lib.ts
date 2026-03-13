import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";

// ─── Internal helpers ────────────────────────────────────────────────────────

export const upsertSnapshot = internalMutation({
  args: {
    snapshotId: v.string(),
    datasetId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("collecting"),
      v.literal("digesting"),
      v.literal("ready"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
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
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("collecting"),
      v.literal("digesting"),
      v.literal("ready"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
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

export const insertRecords = internalMutation({
  args: {
    snapshotId: v.string(),
    datasetId: v.string(),
    records: v.array(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    for (const record of args.records) {
      await ctx.db.insert("records", {
        snapshotId: args.snapshotId,
        datasetId: args.datasetId,
        data: record,
        receivedAt: Date.now(),
      });
    }
    return args.records.length;
  },
});

export const logDelivery = internalMutation({
  args: {
    snapshotId: v.string(),
    event: v.string(),
    payload: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("deliveryLogs", {
      snapshotId: args.snapshotId,
      event: args.event,
      payload: args.payload,
      receivedAt: Date.now(),
    });
    return null;
  },
});

export const getSnapshotBySnapshotId = internalQuery({
  args: { snapshotId: v.string() },
  returns: v.union(v.null(), v.any()),
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
  returns: v.union(v.null(), v.any()),
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
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const q = ctx.db.query("snapshots");
    if (args.datasetId) {
      const results = await ctx.db
        .query("snapshots")
        .withIndex("by_datasetId", (q) => q.eq("datasetId", args.datasetId!))
        .order("desc")
        .take(args.limit ?? 50);
      return results;
    }
    return await q.order("desc").take(args.limit ?? 50);
  },
});

export const getRecords = query({
  args: {
    snapshotId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
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
  returns: v.array(v.any()),
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
    inputs: v.array(v.any()),
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
    inputs: v.array(v.any()),
    brightdataApiToken: v.string(),
    format: v.optional(v.string()),
    customOutputFields: v.optional(v.string()),
    includeErrors: v.optional(v.boolean()),
  },
  returns: v.object({
    records: v.array(v.any()),
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

    const data = await response.json() as any;

    // If timed out, returns snapshot_id for polling
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

    // Immediate result — parse NDJSON or JSON array
    const text = await response.text().catch(() => JSON.stringify(data));
    const lines = text.trim().split("\n").filter(Boolean);
    const records = lines.map((line) => {
      try { return JSON.parse(line); } catch { return line; }
    });

    return { records, status: "ready" };
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
    datasetId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const response = await fetch(
      `https://api.brightdata.com/datasets/v3/progress/${args.snapshotId}`,
      {
        headers: {
          Authorization: `Bearer ${args.brightdataApiToken}`,
        },
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

    const status = data.status as any;

    await ctx.runMutation(internal.lib.updateSnapshotStatus, {
      snapshotId: args.snapshotId,
      status: ["ready", "failed", "canceled", "running", "collecting", "digesting", "pending"].includes(status)
        ? status
        : "running",
      completedAt: status === "ready" ? Date.now() : undefined,
    });

    await ctx.runMutation(internal.lib.logDelivery, {
      snapshotId: args.snapshotId,
      event: "poll_check",
      payload: JSON.stringify(data),
    });

    return {
      snapshotId: args.snapshotId,
      status: data.status,
      datasetId: data.dataset_id,
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
        headers: {
          Authorization: `Bearer ${args.brightdataApiToken}`,
        },
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
    if (args.records.length > 0) {
      await ctx.db.insert("records", {
        snapshotId: args.snapshotId,
        datasetId: args.datasetId,
        data: JSON.stringify(args.records),
        receivedAt: Date.now(),
      });
    }

    await ctx.db
      .query("snapshots")
      .withIndex("by_snapshotId", (q) => q.eq("snapshotId", args.snapshotId))
      .first()
      .then(async (existing) => {
        if (existing) {
          await ctx.db.patch(existing._id, {
            status: "ready",
            recordCount: (existing.recordCount ?? 0) + args.records.length,
            completedAt: Date.now(),
          });
        }
      });

    await ctx.db.insert("deliveryLogs", {
      snapshotId: args.snapshotId,
      event: "webhook_received",
      payload: JSON.stringify({ count: args.records.length, status: args.status }),
      receivedAt: Date.now(),
    });

    return null;
  },
});
