import type { Hum2MusicPlugin } from "@hum2music/plugin-api";

/**
 * A piano + string-trio (violin/viola/cello) chamber ensemble default
 * (PRD UPDATE_PRD.md §7.3's "Classical / Chamber"). All weights/multipliers
 * are proposed starting values, same as the existing pop/ballad profiles —
 * unvalidated against real listening tests (see tasks/STATUS.md).
 */
export const classicalStylePlugin: Hum2MusicPlugin = {
  id: "@hum2music/style-classical",
  version: "0.1.0",
  apiVersion: "1.0.0",
  register(context) {
    context.styles.register({
      id: "classical",
      name: "Classical (Chamber)",
      harmony: { progressionWeights: { melodyFit: 0.35, harmonicNaturalness: 0.4, voiceLeading: 0.25 } },
      orchestration: { pianoPattern: "arpeggio", pianoAllowExtensions: true },
      expression: { humanizeMultiplier: 0.5 },
      defaultInstruments: ["piano", "violin", "viola", "cello"],
    });
  },
};
