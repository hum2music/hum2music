export type InstrumentFamily =
  | "keyboard"
  | "strings"
  | "woodwind"
  | "brass"
  | "percussion"
  | "electronic"
  | "voice"
  | "other";

/**
 * A musical instrument's playable properties, independent of how it's
 * synthesized (see AudioRenderer). PRD UPDATE_PRD.md §5.2.
 */
export interface InstrumentDefinition {
  id: string;
  name: string;
  family: InstrumentFamily;
  /** MIDI note numbers. Omitted for non-pitched percussion. */
  pitchRange?: { min: number; max: number };
  /** Maximum simultaneous notes this instrument can play; 1 = monophonic. */
  polyphony: number;
  articulations?: string[];
  midi?: {
    program?: number;
    percussion?: boolean;
  };
}
