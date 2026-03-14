import { httpActionGeneric } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

export function createWebhookHandler(component: ComponentApi) {
  return httpActionGeneric(async (ctx, request) => {
    try {
      const body = await request.text();
      const url = new URL(request.url);

      // Bright Data sends snapshot_id in headers and/or query params
      const snapshotId =
        request.headers.get("x-snapshot-id") ??
        request.headers.get("snapshot-id") ??
        url.searchParams.get("snapshot_id") ??
        "";

      const datasetId =
        request.headers.get("x-dataset-id") ??
        url.searchParams.get("dataset_id") ??
        "";

      const status =
        request.headers.get("x-status") ??
        url.searchParams.get("status") ??
        "ready";

      // Parse NDJSON or JSON array body
      let records: string[] = [];
      if (body.trim()) {
        const lines = body.trim().split("\n").filter(Boolean);
        let allParsed = true;
        for (const line of lines) {
          try {
            JSON.parse(line);
            records.push(line);
          } catch {
            allParsed = false;
            break;
          }
        }
        if (!allParsed) {
          try {
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed)) {
              records = parsed.map((r) => JSON.stringify(r));
            } else if (parsed && typeof parsed === "object") {
              records = [JSON.stringify(parsed)];
            }
          } catch {
            // ignore
          }
        }
      }

      // Always call handleWebhook — it logs delivery and updates status
      await ctx.runMutation(component.lib.handleWebhook, {
        snapshotId: snapshotId || "unknown",
        datasetId,
        records,
        status,
      });

      return new Response("ok", { status: 200 });
    } catch (err) {
      console.error("Bright Data webhook error:", err);
      return new Response("error", { status: 500 });
    }
  });
}
