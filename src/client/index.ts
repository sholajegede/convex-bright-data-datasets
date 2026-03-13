import type { GenericActionCtx, GenericDataModel } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

export type TriggerOptions = {
  /** The Bright Data dataset ID e.g. gd_l1viktl72bvl7bjuj0 */
  datasetId: string;
  /** Array of input objects e.g. [{ url: "https://..." }] */
  inputs: Record<string, unknown>[];
  /** Output format: "json" | "ndjson" | "csv" (default: "json") */
  format?: string;
  /** Webhook URL where Bright Data will deliver the results */
  webhookUrl?: string;
  /** Notification URL called when collection finishes (sends snapshot_id + status) */
  notifyUrl?: string;
  /** Set to "discover_new" to enable discovery mode */
  discoveryMode?: string;
  /** Discovery method: "keyword" | "best_sellers_url" | "category_url" | "location" */
  discoverBy?: string;
  /** Max results per input (discovery mode only) */
  limitPerInput?: number;
  /** Max total results */
  totalLimit?: number;
  /** Pipe-separated output fields e.g. "url|about.updated_on" */
  customOutputFields?: string;
  /** Include error records in results (default: true) */
  includeErrors?: boolean;
};

export type ScrapeOptions = {
  datasetId: string;
  inputs: Record<string, unknown>[];
  format?: string;
  customOutputFields?: string;
  includeErrors?: boolean;
};

export type BrightDatasetsOptions = {
  /** Your Bright Data API token */
  BRIGHTDATA_API_TOKEN: string;
};

/**
 * Client wrapper for the convex-bright-data-datasets component.
 *
 * @example
 * ```ts
 * // convex/brightDatasets.ts
 * import { components } from "./_generated/api.js";
 * import { BrightDatasets } from "@sholajegede/convex-bright-data-datasets";
 *
 * export const brightDatasets = new BrightDatasets(components.convexBrightDataDatasets, {
 *   BRIGHTDATA_API_TOKEN: process.env.BRIGHTDATA_API_TOKEN!,
 * });
 * ```
 */
export class BrightDatasets {
  constructor(
    public component: ComponentApi,
    private options: BrightDatasetsOptions,
  ) {}

  /**
   * Trigger an async Bright Data dataset collection.
   * Returns a snapshot_id immediately. Results are delivered via webhook
   * or can be polled via pollStatus().
   */
  async trigger(ctx: ActionCtx, opts: TriggerOptions) {
    return ctx.runAction(this.component.lib.trigger, {
      ...opts,
      brightdataApiToken: this.options.BRIGHTDATA_API_TOKEN,
    });
  }

  /**
   * Synchronous scrape — returns results immediately for small jobs.
   * Falls back to snapshot_id polling if the job takes longer than 1 minute.
   */
  async scrape(ctx: ActionCtx, opts: ScrapeOptions) {
    return ctx.runAction(this.component.lib.scrape, {
      ...opts,
      brightdataApiToken: this.options.BRIGHTDATA_API_TOKEN,
    });
  }

  /**
   * Poll Bright Data for the current status of a snapshot.
   * Status: pending -> collecting -> digesting -> ready | failed | canceled
   */
  async pollStatus(ctx: ActionCtx, snapshotId: string) {
    return ctx.runAction(this.component.lib.pollStatus, {
      snapshotId,
      brightdataApiToken: this.options.BRIGHTDATA_API_TOKEN,
    });
  }

  /**
   * Cancel a running snapshot collection.
   */
  async cancel(ctx: ActionCtx, snapshotId: string) {
    return ctx.runAction(this.component.lib.cancelSnapshot, {
      snapshotId,
      brightdataApiToken: this.options.BRIGHTDATA_API_TOKEN,
    });
  }

  /**
   * Get a single snapshot by ID. Reactive — subscribe via useQuery.
   */
  async getSnapshot(ctx: QueryCtx, snapshotId: string) {
    return ctx.runQuery(this.component.lib.getSnapshot, { snapshotId });
  }

  /**
   * List all snapshots, optionally filtered by datasetId or status.
   * Reactive — subscribe via useQuery.
   */
  async listSnapshots(
    ctx: QueryCtx,
    opts?: { datasetId?: string; status?: string; limit?: number },
  ) {
    return ctx.runQuery(this.component.lib.listSnapshots, opts ?? {});
  }

  /**
   * Get all records stored for a snapshot.
   * Reactive — subscribe via useQuery. Updates in real time as webhook delivers data.
   */
  async getRecords(ctx: QueryCtx, snapshotId: string, limit?: number) {
    return ctx.runQuery(this.component.lib.getRecords, { snapshotId, limit });
  }

  /**
   * Get delivery logs for a snapshot — useful for debugging webhook delivery.
   * Reactive — subscribe via useQuery.
   */
  async getDeliveryLogs(ctx: QueryCtx, snapshotId: string) {
    return ctx.runQuery(this.component.lib.getDeliveryLogs, { snapshotId });
  }
}

export type { ComponentApi };

type ActionCtx = Pick<GenericActionCtx<GenericDataModel>, "runQuery" | "runMutation" | "runAction">;
type QueryCtx = Pick<GenericActionCtx<GenericDataModel>, "runQuery">;

export { createWebhookHandler } from "./httpHandler.js";
