import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  snapshots: defineTable({
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
    inputs: v.string(), // JSON array of inputs
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
  })
    .index("by_snapshotId", ["snapshotId"])
    .index("by_datasetId", ["datasetId"])
    .index("by_status", ["status"]),

  records: defineTable({
    snapshotId: v.string(),
    datasetId: v.string(),
    data: v.string(), // JSON stringified record
    receivedAt: v.number(),
  })
    .index("by_snapshotId", ["snapshotId"])
    .index("by_datasetId", ["datasetId"]),

  deliveryLogs: defineTable({
    snapshotId: v.string(),
    event: v.string(), // "webhook_received" | "notify_received" | "poll_check"
    payload: v.string(), // JSON stringified
    receivedAt: v.number(),
  }).index("by_snapshotId", ["snapshotId"]),
});
