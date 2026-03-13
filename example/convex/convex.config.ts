import { defineApp } from "convex/server";
import convexBrightDataDatasets from "../../src/component/convex.config.js";

const app = defineApp();
app.use(convexBrightDataDatasets);

export default app;
