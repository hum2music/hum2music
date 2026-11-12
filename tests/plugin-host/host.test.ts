import { describe, expect, test } from "bun:test";
import type { Hum2MusicPlugin } from "@hum2music/plugin-api";
import { PluginHost } from "@hum2music/plugin-host";

function stubPlugin(overrides: Partial<Hum2MusicPlugin> = {}): Hum2MusicPlugin {
  return {
    id: "@test/stub",
    version: "0.1.0",
    apiVersion: "1.0.0",
    register() {},
    ...overrides,
  };
}

describe("PluginHost", () => {
  test("registers a plugin and lists it", async () => {
    const host = new PluginHost();
    await host.use(stubPlugin());
    expect(host.list()).toEqual([{ id: "@test/stub", version: "0.1.0", apiVersion: "1.0.0" }]);
  });

  test("calls register() with the shared PluginContext", async () => {
    const host = new PluginHost();
    let seenInstruments: unknown;
    await host.use(
      stubPlugin({
        register(context) {
          seenInstruments = context.instruments;
        },
      }),
    );
    expect(seenInstruments).toBe(host.getContext().instruments);
  });

  test("rejects a second plugin with the same id", async () => {
    const host = new PluginHost();
    await host.use(stubPlugin());
    await expect(host.use(stubPlugin())).rejects.toThrow(/already registered/);
  });

  test("rejects a plugin whose apiVersion major doesn't match the host", async () => {
    const host = new PluginHost();
    await expect(host.use(stubPlugin({ apiVersion: "2.0.0" }))).rejects.toThrow(/incompatible/);
  });

  test("accepts an apiVersion that only differs in minor/patch", async () => {
    const host = new PluginHost();
    await expect(host.use(stubPlugin({ apiVersion: "1.3.1" }))).resolves.toBeUndefined();
  });

  test("rejects a plugin depending on an unregistered plugin", async () => {
    const host = new PluginHost();
    await expect(host.use(stubPlugin({ dependencies: ["@test/missing"] }))).rejects.toThrow(/unregistered/);
  });

  test("rejects a plugin that depends on itself", async () => {
    const host = new PluginHost();
    await expect(host.use(stubPlugin({ id: "@test/self", dependencies: ["@test/self"] }))).rejects.toThrow(
      /dependency on itself/,
    );
  });

  test("accepts a plugin once its dependency is registered", async () => {
    const host = new PluginHost();
    await host.use(stubPlugin({ id: "@test/base" }));
    await expect(host.use(stubPlugin({ id: "@test/dependent", dependencies: ["@test/base"] }))).resolves.toBeUndefined();
  });

  test("registry item duplicate registration is rejected without override", async () => {
    const host = new PluginHost();
    const context = host.getContext();
    context.instruments.register({ id: "piano", name: "Piano", family: "keyboard", polyphony: 10 });
    expect(() => context.instruments.register({ id: "piano", name: "Piano 2", family: "keyboard", polyphony: 1 })).toThrow(
      /already has an entry/,
    );
  });

  test("registry item can be replaced with { override: true }", async () => {
    const host = new PluginHost();
    const context = host.getContext();
    context.instruments.register({ id: "piano", name: "Piano", family: "keyboard", polyphony: 10 });
    context.instruments.register({ id: "piano", name: "Piano 2", family: "keyboard", polyphony: 1 }, { override: true });
    expect(context.instruments.get("piano")?.name).toBe("Piano 2");
  });

  test("rejects use() while the registry is locked for a composition", async () => {
    const host = new PluginHost();
    const blocked = host.withRegistryLocked(async () => {
      await host.use(stubPlugin());
    });
    await expect(blocked).rejects.toThrow(/composition is in progress/);
  });

  test("dispose() calls each plugin's dispose in reverse registration order", async () => {
    const host = new PluginHost();
    const order: string[] = [];
    await host.use(stubPlugin({ id: "@test/a", dispose: () => void order.push("a") }));
    await host.use(stubPlugin({ id: "@test/b", dispose: () => void order.push("b") }));

    await host.dispose();
    expect(order).toEqual(["b", "a"]);
    expect(host.list()).toEqual([]);
  });
});
