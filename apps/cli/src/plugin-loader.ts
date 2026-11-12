import { resolve } from "node:path";
import type { Hum2MusicPlugin } from "@hum2music/plugin-api";

/**
 * Dynamically imports a plugin module (an npm package specifier, a Bun
 * workspace package name, or a local path — PRD UPDATE_PRD.md §4.5) and
 * finds its Hum2MusicPlugin export. Shared by `hum2music compose`'s
 * hum2music.config.ts loading and `hum2music plugin validate`.
 */
export async function loadPluginModule(specifier: string): Promise<Hum2MusicPlugin> {
  const isLocalPath = specifier.startsWith(".") || specifier.startsWith("/");
  const imported = (await import(isLocalPath ? resolve(specifier) : specifier)) as Record<string, unknown>;

  const candidate = findPluginExport(imported);
  if (!candidate) {
    throw new Error(
      `No Hum2MusicPlugin-shaped export found in "${specifier}" (expected a default export, or a named export, with id/version/apiVersion/register).`,
    );
  }
  return candidate;
}

export function findPluginExport(exports: Record<string, unknown>): Hum2MusicPlugin | undefined {
  return [exports.default, ...Object.values(exports)].find(isHum2MusicPlugin);
}

export function isHum2MusicPlugin(value: unknown): value is Hum2MusicPlugin {
  const candidate = value as Partial<Hum2MusicPlugin> | null | undefined;
  return (
    typeof candidate?.id === "string" &&
    typeof candidate.version === "string" &&
    typeof candidate.apiVersion === "string" &&
    typeof candidate.register === "function"
  );
}
