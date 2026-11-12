/**
 * A registry of uniquely-identified items (instruments, styles, arrangers,
 * renderers, ...). Plugins populate these through a PluginContext; the host
 * owns enforcing override/duplicate rules (see @hum2music/plugin-host).
 */
export interface Registry<T> {
  register(item: T, options?: { override?: boolean }): void;
  get(id: string): T | undefined;
  has(id: string): boolean;
  list(): T[];
}
