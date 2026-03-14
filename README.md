# @sholajegede/convex-bright-data-datasets

A [Convex component](https://www.convex.dev/components) that wraps [Bright Data's](https://brightdata.com) Datasets API with reactive storage. Trigger async collections for LinkedIn profiles, Amazon products, Instagram posts, job listings, Airbnb, Zillow, Google Maps, and 120+ other datasets — receive results via webhook, and subscribe to structured records in real time via `useQuery`. No polling, no custom webhook infrastructure, no storage layer to build.

[![npm version](https://badge.fury.io/js/@sholajegede%2Fconvex-bright-data-datasets.svg)](https://badge.fury.io/js/@sholajegede%2Fconvex-bright-data-datasets)
[![Convex Component](https://www.convex.dev/components/badge/sholajegede/convex-bright-data-datasets)](https://www.convex.dev/components/sholajegede/convex-bright-data-datasets)

Found a bug? Feature request? [File it here](https://github.com/sholajegede/convex-bright-data-datasets/issues).

<!-- START: Include on https://convex.dev/components -->

## How it works

Without this component, getting fresh LinkedIn company data, Amazon product data, or job postings into a Convex app means building the whole pipeline yourself: trigger the snapshot, handle the webhook, parse NDJSON, store the records, expose queries. This component does all of that in one install.

You call `brightDatasets.trigger()` from a Convex action. The component stores the snapshot metadata immediately, mounts a webhook handler that receives the results when Bright Data is done, parses and stores every record in component-owned tables, and updates the snapshot status to `ready`. Your frontend subscribes via `useQuery` and updates the moment data lands.
```
App calls trigger()
        ↓
Bright Data collection job starts
        ↓
Component stores snapshot as "pending"
        ↓
Bright Data POSTs results to webhook handler
        ↓
Component parses NDJSON, stores records, marks snapshot "ready"
        ↓
All useQuery subscribers notified automatically
        ↓
UI updates in real time
```

## Features

- **Async dataset collections** — trigger any Bright Data dataset (LinkedIn, Amazon, Instagram, job postings, and 120+ more) from a Convex action
- **Webhook receiver** — mount a single HTTP route and the component handles the rest: parsing, storage, status updates
- **Reactive records** — subscribe to records via `useQuery`, live updates as webhook delivers batches
- **Snapshot tracking** — every job is stored with status (`pending` → `collecting` → `digesting` → `ready`), record count, and timing
- **Synchronous scrape** — for small single-URL jobs, get results immediately without a webhook
- **Progress polling** — poll Bright Data for status updates and sync to Convex reactively
- **Cancel support** — cancel a running collection and update snapshot status instantly
- **Delivery logs** — every webhook event is logged per snapshot for debugging
- **Discovery mode** — trigger keyword, category, or URL-based discovery collections
- **Custom output fields** — filter which fields Bright Data returns

## Prerequisites

- A [Bright Data](https://brightdata.com) account
- A dataset ID from the [Bright Data Web Scraper API](https://brightdata.com/products/web-scraper) (format: `gd_...`)
- A Bright Data API token from your account settings

## Installation
```sh
npm install @sholajegede/convex-bright-data-datasets
```

Add the component to your `convex/convex.config.ts`:
```ts
import { defineApp } from "convex/server";
import convexBrightDataDatasets from "@sholajegede/convex-bright-data-datasets/convex.config.js";

const app = defineApp();
app.use(convexBrightDataDatasets);

export default app;
```

## Setup

**1. Instantiate the client in your Convex functions:**
```ts
// convex/brightDatasets.ts
import { components } from "./_generated/api.js";
import { BrightDatasets } from "@sholajegede/convex-bright-data-datasets";

export const brightDatasets = new BrightDatasets(components.convexBrightDataDatasets, {
  BRIGHTDATA_API_TOKEN: process.env.BRIGHTDATA_API_TOKEN!,
});
```

**2. Mount the webhook handler in `convex/http.ts`:**
```ts
import { httpRouter } from "convex/server";
import { components } from "./_generated/api.js";
import { createWebhookHandler } from "@sholajegede/convex-bright-data-datasets";

const http = httpRouter();

http.route({
  path: "/webhooks/brightdata",
  method: "POST",
  handler: createWebhookHandler(components.convexBrightDataDatasets),
});

export default http;
```

**3. Set your Convex environment variable:**
```sh
npx convex env set BRIGHTDATA_API_TOKEN your_token_here
```

Your Convex HTTP actions URL (the webhook endpoint to register in Bright Data) is:
```
https://<your-deployment>.convex.site/webhooks/brightdata
```

You can find this by running `npx convex dev` and looking for `VITE_CONVEX_SITE_URL` in your `.env.local`.

## Usage

### Trigger an async collection
```ts
// convex/myFunctions.ts
import { action, query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { brightDatasets } from "./brightDatasets.js";
import { v } from "convex/values";

// Trigger a LinkedIn profile collection
export const collectProfiles = action({
  args: { urls: v.array(v.string()) },
  handler: async (ctx, args) => {
    return await brightDatasets.trigger(ctx, {
      datasetId: "gd_l1viktl72bvl7bjuj0", // LinkedIn profiles dataset
      inputs: args.urls.map((url) => ({ url })),
      webhookUrl: process.env.CONVEX_SITE_URL + "/webhooks/brightdata",
    });
    // Returns: { snapshotId: "s_...", status: "pending" }
  },
});

// Reactive query — subscribe to snapshot status from the frontend
export const getSnapshot = query({
  args: { snapshotId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexBrightDataDatasets.lib.getSnapshot, {
      snapshotId: args.snapshotId,
    });
  },
});

// Reactive query — subscribe to records as they arrive
export const getRecords = query({
  args: { snapshotId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.runQuery(components.convexBrightDataDatasets.lib.getRecords, {
      snapshotId: args.snapshotId,
    });
  },
});
```
```tsx
// React — subscribes reactively, re-renders when status or records update
const snapshot = useQuery(api.myFunctions.getSnapshot, { snapshotId });
// snapshot.status   — "pending" | "collecting" | "digesting" | "ready" | "failed" | "canceled"
// snapshot.recordCount — number of records received so far

const records = useQuery(api.myFunctions.getRecords, { snapshotId });
// records — array of structured records from Bright Data, parsed from NDJSON
```

### Synchronous scrape (small jobs)
```ts
export const scrapeProfile = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    return await brightDatasets.scrape(ctx, {
      datasetId: "gd_l1viktl72bvl7bjuj0",
      inputs: [{ url: args.url }],
    });
    // Returns: { records: [...], status: "ready" }
    // If job exceeds 1 min: { records: [], snapshotId: "s_...", status: "running" }
  },
});
```

### Poll for status
```ts
export const checkStatus = action({
  args: { snapshotId: v.string() },
  handler: async (ctx, args) => {
    return await brightDatasets.pollStatus(ctx, args.snapshotId);
    // Fetches from Bright Data, updates snapshot in Convex, returns current status
  },
});
```

### Cancel a collection
```ts
export const cancelJob = action({
  args: { snapshotId: v.string() },
  handler: async (ctx, args) => {
    return await brightDatasets.cancel(ctx, args.snapshotId);
  },
});
```

### List all snapshots
```ts
export const listJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.runQuery(components.convexBrightDataDatasets.lib.listSnapshots, {
      limit: 20,
    });
  },
});
```

### Discovery mode
```ts
// Discover Amazon products by keyword
export const discoverProducts = action({
  args: { keywords: v.array(v.string()) },
  handler: async (ctx, args) => {
    return await brightDatasets.trigger(ctx, {
      datasetId: "gd_l7q7dkf244hwjntr0",
      inputs: args.keywords.map((keyword) => ({ keyword })),
      discoveryMode: "discover_new",
      discoverBy: "keyword",
      limitPerInput: 10,
      webhookUrl: process.env.CONVEX_SITE_URL + "/webhooks/brightdata",
    });
  },
});
```

## API

### `BrightDatasets` class

| Method | Description |
|--------|-------------|
| `trigger(ctx, opts)` | Trigger an async Bright Data dataset collection. Returns `{ snapshotId, status }` immediately. |
| `scrape(ctx, opts)` | Synchronous scrape for small single-URL jobs. Falls back to snapshot polling if job exceeds 1 minute. |
| `pollStatus(ctx, snapshotId)` | Poll Bright Data for snapshot status and sync to Convex. |
| `cancel(ctx, snapshotId)` | Cancel a running collection. |
| `getSnapshot(ctx, snapshotId)` | Get snapshot metadata. Reactive via `useQuery`. |
| `listSnapshots(ctx, opts?)` | List snapshots, optionally filtered by `datasetId`, `status`, or `limit`. Reactive. |
| `getRecords(ctx, snapshotId, limit?)` | Get stored records for a snapshot. Reactive — updates as webhook delivers data. |
| `getDeliveryLogs(ctx, snapshotId)` | Get webhook delivery events for debugging. Reactive. |

### `createWebhookHandler(component)`

Creates the HTTP action handler for receiving Bright Data webhook deliveries. Mount in `convex/http.ts`.

### `trigger` options

| Option | Type | Description |
|--------|------|-------------|
| `datasetId` | `string` | Bright Data dataset ID (e.g. `gd_l1viktl72bvl7bjuj0`) |
| `inputs` | `object[]` | Array of input objects (e.g. `[{ url: "..." }]`) |
| `format` | `string?` | Output format: `"json"` \| `"ndjson"` \| `"csv"` (default: `"json"`) |
| `webhookUrl` | `string?` | Webhook URL where Bright Data delivers results |
| `notifyUrl` | `string?` | Notification URL called on completion with `snapshot_id` and `status` |
| `discoveryMode` | `string?` | Set to `"discover_new"` to enable discovery |
| `discoverBy` | `string?` | Discovery method: `"keyword"` \| `"category_url"` \| `"best_sellers_url"` \| `"location"` |
| `limitPerInput` | `number?` | Max results per input (discovery mode) |
| `totalLimit` | `number?` | Max total results |
| `customOutputFields` | `string?` | Pipe-separated fields to return (e.g. `"url\|name\|price"`) |
| `includeErrors` | `boolean?` | Include error records in results (default: `true`) |

### Snapshot status lifecycle
```
pending → collecting → digesting → ready
                                 → failed
                                 → canceled
```

### Reactive queries (call via `ctx.runQuery`)

| Function | Args | Returns |
|----------|------|---------|
| `components.convexBrightDataDatasets.lib.getSnapshot` | `{ snapshotId }` | Snapshot or `null` |
| `components.convexBrightDataDatasets.lib.listSnapshots` | `{ datasetId?, status?, limit? }` | Array of snapshots |
| `components.convexBrightDataDatasets.lib.getRecords` | `{ snapshotId, limit? }` | Array of records |
| `components.convexBrightDataDatasets.lib.getDeliveryLogs` | `{ snapshotId }` | Array of delivery events |

<!-- END: Include on https://convex.dev/components -->

## Example app

See [`example/`](./example) for a working Vite + React demo showing async dataset triggering, live snapshot status tracking, and reactive record display.

## Development
```sh
npm i
npm run dev
```

## License

Apache-2.0
