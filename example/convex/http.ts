import { httpRouter } from "convex/server";
import { components } from "./_generated/api.js";
import { createWebhookHandler } from "../../src/client/index.js";

const http = httpRouter();

http.route({
  path: "/webhooks/brightdata",
  method: "POST",
  handler: createWebhookHandler(components.convexBrightDataDatasets),
});

export default http;
