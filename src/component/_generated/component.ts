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
        Array<{
          _creationTime: number;
          _id: string;
          event: string;
          payload: string;
          receivedAt: number;
          snapshotId: string;
        }>,
        Name
      >;
      getRecords: FunctionReference<
        "query",
        "internal",
        { limit?: number; snapshotId: string },
        Array<{
          _creationTime: number;
          _id: string;
          data: string;
          datasetId: string;
          receivedAt: number;
          snapshotId: string;
        }>,
        Name
      >;
      getSnapshot: FunctionReference<
        "query",
        "internal",
        { snapshotId: string },
        null | {
          _creationTime: number;
          _id: string;
          completedAt?: number;
          customOutputFields?: string;
          datasetId: string;
          discoveryMode?: string;
          errorMessage?: string;
          format?: string;
          inputs: string;
          limitPerInput?: number;
          notifyUrl?: string;
          recordCount?: number;
          snapshotId: string;
          status:
            | "pending"
            | "running"
            | "collecting"
            | "digesting"
            | "ready"
            | "failed"
            | "canceled";
          totalLimit?: number;
          triggeredAt: number;
          webhookUrl?: string;
        },
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
        Array<{
          _creationTime: number;
          _id: string;
          completedAt?: number;
          customOutputFields?: string;
          datasetId: string;
          discoveryMode?: string;
          errorMessage?: string;
          format?: string;
          inputs: string;
          limitPerInput?: number;
          notifyUrl?: string;
          recordCount?: number;
          snapshotId: string;
          status:
            | "pending"
            | "running"
            | "collecting"
            | "digesting"
            | "ready"
            | "failed"
            | "canceled";
          totalLimit?: number;
          triggeredAt: number;
          webhookUrl?: string;
        }>,
        Name
      >;
      pollStatus: FunctionReference<
        "action",
        "internal",
        { brightdataApiToken: string; snapshotId: string },
        { datasetId: string; snapshotId: string; status: string },
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
          inputs: Array<{ keyword?: string; url?: string }>;
        },
        { records: Array<string>; snapshotId?: string; status: string },
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
          inputs: Array<{ keyword?: string; url?: string }>;
          limitPerInput?: number;
          notifyUrl?: string;
          totalLimit?: number;
          webhookUrl?: string;
        },
        { snapshotId: string; status: string },
        Name
      >;
      validateIndexes: FunctionReference<
        "mutation",
        "internal",
        {
          relationships: Array<{
            fieldName: string;
            indexName: string;
            sourceTable: string;
            targetTable: string;
          }>;
        },
        null,
        Name
      >;
    };
  };
