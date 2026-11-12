import type { Registry } from "@hum2music/plugin-api";

/**
 * Generic Registry<T> implementation shared by every registry kind
 * (instruments, styles, arrangers, renderers, composers, expressions).
 * Duplicate IDs are rejected unless the caller explicitly opts into
 * replacing the existing entry (PRD UPDATE_PRD.md §4.4).
 */
export class RegistryImpl<T extends { id: string }> implements Registry<T> {
  private readonly items = new Map<string, T>();

  register(item: T, options?: { override?: boolean }): void {
    if (this.items.has(item.id) && !options?.override) {
      throw new Error(`Registry already has an entry with id "${item.id}". Pass { override: true } to replace it.`);
    }
    this.items.set(item.id, item);
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  list(): T[] {
    return [...this.items.values()];
  }
}
