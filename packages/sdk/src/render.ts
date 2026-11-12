import type { AudioBufferData, PluginComposition, PluginContext, RenderOptions } from "@hum2music/plugin-api";

export async function renderComposition(
  context: PluginContext,
  composition: PluginComposition,
  rendererId: string,
  options: RenderOptions = {},
): Promise<AudioBufferData> {
  const renderer = context.renderers.get(rendererId);
  if (!renderer) {
    throw new Error(`No AudioRenderer registered with id "${rendererId}".`);
  }
  return renderer.render(composition, options);
}
