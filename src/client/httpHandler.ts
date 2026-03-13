import { httpActionGeneric } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

/**
 * Creates an HTTP action handler for receiving Bright Data webhook deliveries.
 * Mount this in your app's convex/http.ts.
 *
 * @example
 * ```ts
 * // convex/http.ts
 * import { httpRouter } from "convex/server";
 * import { components } from "./_generated/api.js";
 * import { createWebhookHandler } from "@sholajegede/convex-bright-data-datasets";
 *
 * const http = httpRouter();
 *
 * http.route({
 *   path: "/webhooks/brightdata",
 *   method: "POST",
 *   handler: createWebhookHandler(components.convexBrightDataDatasets),
 * });
 *
 * export default http;
 * ```
 */
export function createWebhookHandler(component: ComponentApi) {
  return httpActionGeneric(async (ctx, request) => {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      const body = await request.text();

      // Parse snapshot_id from query params (Bright Data sends it there)
      const url = new URL(request.url);
      const snapshotId = url.searchParams.get("snapshot_id") ?? "";
      const datasetId = url.searchParams.get("dataset_id") ?? "";
      const status = url.searchParams.get("status") ?? "ready";

      // Parse records from NDJSON or JSON array body
      let records: string[] = [];
      if (body.trim()) {
        if (contentType.includes("application/x-ndjson") || body.includes("\n")) {
          records = body
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => {
              try {
                JSON.parse(line);
                return line;
              } catch {
                return null;
              }
            })
            .filter((r): r is string => r !== null);
        } else {
          try {
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed)) {
              records = parsed.map((r) => JSON.stringify(r));
            } else if (parsed.snapshot_id) {
              // This is a notify-only call, no data body
              records = [];
            } else {
              records = [body];
            }
          } catch {
            records = [];
          }
        }
      }

      if (snapshotId) {
        await ctx.runMutation(component.lib.handleWebhook, {
          snapshotId,
          datasetId,
          records,
          status,
        });
      }

      return new Response("ok", { status: 200 });
    } catch (err) {
      console.error("Bright Data webhook error:", err);
      return new Response("error", { status: 500 });
    }
  });
}
