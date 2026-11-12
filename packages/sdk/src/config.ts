/**
 * The shape of hum2music.config.ts (PRD UPDATE_PRD.md §11.1). Resolving
 * `plugins` (npm/workspace package names or local paths) and actually
 * importing/registering them is host-environment I/O, so it's left to the
 * CLI/Web UI rather than done here — this package only owns the type and
 * the identity helper that gives it autocomplete.
 */
export interface Hum2MusicConfig {
  plugins?: string[];
  defaultRenderer?: string;
}

export function defineConfig(config: Hum2MusicConfig): Hum2MusicConfig {
  return config;
}
