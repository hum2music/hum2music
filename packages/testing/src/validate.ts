import type { InstrumentDefinition } from "@hum2music/plugin-api";

/** Checks an InstrumentDefinition's own internal consistency (not registry state). Returns an empty array when valid. */
export function validateInstrument(definition: InstrumentDefinition): string[] {
  const errors: string[] = [];

  if (!definition.id) errors.push("instrument id is required");
  if (!definition.name) errors.push("instrument name is required");
  if (!Number.isInteger(definition.polyphony) || definition.polyphony < 1) {
    errors.push("polyphony must be an integer >= 1");
  }
  if (definition.pitchRange && definition.pitchRange.min > definition.pitchRange.max) {
    errors.push("pitchRange.min must be <= pitchRange.max");
  }
  const program = definition.midi?.program;
  if (program !== undefined && (program < 0 || program > 127)) {
    errors.push("midi.program must be between 0 and 127");
  }

  return errors;
}
