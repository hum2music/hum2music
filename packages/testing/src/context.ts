import type { PluginContext } from "@hum2music/plugin-api";
import { PluginHost } from "@hum2music/plugin-host";

/** A fresh, isolated PluginContext for a plugin's own unit tests (PRD UPDATE_PRD.md §10.4). */
export function createTestContext(): PluginContext {
  return new PluginHost().getContext();
}
