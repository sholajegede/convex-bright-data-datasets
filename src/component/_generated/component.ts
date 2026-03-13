/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    lib: {
      cancelSnapshot: FunctionReference<
        "action",
        "internal",
        { brightdataApiToken: string; snapshotId: string },
        { success: boolean },
        Name
      >;
      getDeliveryLogs: FunctionReference<
        "query",
        "internal",
        { snapshotId: string },
        Array<any>,
        Name
      >;
      getRecords: FunctionReference<
        "query",
        "internal",
        { limit?: number; snapshotId: string },
        Array<any>,
        Name
      >;
      getSnapshot: FunctionReference<
        "query",
        "internal",
        { snapshotId: string },
        null | any,
        Name
      >;
      handleWebhook: FunctionReference<
        "mutation",
        "internal",
        {
          datasetId: string;
          records: Array<string>;
          snapshotId: string;
          status?: string;
        },
        null,
        Name
      >;
      listSnapshots: FunctionReference<
        "query",
        "internal",
        { datasetId?: string; limit?: number; status?: string },
        Array<any>,
        Name
      >;
      pollStatus: FunctionReference<
        "action",
        "internal",
        { brightdataApiToken: string; snapshotId: string },
        { datasetId?: string; snapshotId: string; status: string },
        Name
      >;
      scrape: FunctionReference<
        "action",
        "internal",
        {
          brightdataApiToken: string;
          customOutputFields?: string;
          datasetId: string;
          format?: string;
          includeErrors?: boolean;
          inputs: Array<any>;
        },
        { records: Array<any>; snapshotId?: string; status: string },
        Name
      >;
      trigger: FunctionReference<
        "action",
        "internal",
        {
          brightdataApiToken: string;
          customOutputFields?: string;
          datasetId: string;
          discoverBy?: string;
          discoveryMode?: string;
          format?: string;
          includeErrors?: boolean;
          inputs: Array<any>;
          limitPerInput?: number;
          notifyUrl?: string;
          totalLimit?: number;
          webhookUrl?: string;
        },
        { snapshotId: string; status: string },
        Name
      >;
    };
  };
