import { bassInstrumentPlugin } from "@hum2music/instrument-bass";
import { celloInstrumentPlugin } from "@hum2music/instrument-cello";
import { drumsInstrumentPlugin } from "@hum2music/instrument-drums";
import { guitarInstrumentPlugin } from "@hum2music/instrument-guitar";
import { pianoInstrumentPlugin } from "@hum2music/instrument-piano";
import { violaInstrumentPlugin } from "@hum2music/instrument-viola";
import { violinInstrumentPlugin } from "@hum2music/instrument-violin";
import { builtinSynthRendererPlugin } from "@hum2music/renderer-builtin-synth";
import { createHum2Music } from "@hum2music/sdk";
import { classicalStylePlugin } from "@hum2music/style-classical";
import { popBalladStylePlugin } from "@hum2music/style-pop-ballad";

/**
 * Lets the Web UI read back the same registered-plugin information the CLI
 * uses, rather than hardcoding its own instrument/style list (PRD
 * UPDATE_PRD.md §11.2 "登録済みプラグインを読み取り...自動表示する").
 */
export async function handlePlugins(): Promise<Response> {
  const app = createHum2Music();
  await app.use(pianoInstrumentPlugin);
  await app.use(violinInstrumentPlugin);
  await app.use(violaInstrumentPlugin);
  await app.use(celloInstrumentPlugin);
  await app.use(bassInstrumentPlugin);
  await app.use(drumsInstrumentPlugin);
  await app.use(guitarInstrumentPlugin);
  await app.use(popBalladStylePlugin);
  await app.use(classicalStylePlugin);
  await app.use(builtinSynthRendererPlugin);

  const body = {
    instruments: app.listInstruments(),
    styles: app.listStyles(),
    renderers: app.listRenderers().map((renderer) => renderer.id),
  };

  await app.dispose();
  return Response.json(body);
}
