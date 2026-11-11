import type { PitchFrame } from "@hum2music/core";

export interface OutlierOptions {
  neighborRadius?: number;
  centsThreshold?: number;
}

/** Nulls out isolated pitch spikes that deviate too far from their local median. */
export function removePitchOutliers(frames: PitchFrame[], options: OutlierOptions = {}): PitchFrame[] {
  const neighborRadius = options.neighborRadius ?? 3;
  const centsThreshold = options.centsThreshold ?? 80;

  const result = frames.map((frame) => ({ ...frame }));

  for (let i = 0; i < result.length; i++) {
    const frame = result[i];
    if (!frame.voiced || frame.f0Hz === null) continue;

    const neighborFrequencies: number[] = [];
    for (let offset = -neighborRadius; offset <= neighborRadius; offset++) {
      if (offset === 0) continue;
      const neighbor = result[i + offset];
      if (neighbor?.voiced && neighbor.f0Hz !== null) neighborFrequencies.push(neighbor.f0Hz);
    }
    if (neighborFrequencies.length === 0) continue;

    const medianNeighbor = median(neighborFrequencies);
    const cents = 1200 * Math.log2(frame.f0Hz / medianNeighbor);
    if (Math.abs(cents) > centsThreshold) {
      frame.f0Hz = null;
      frame.voiced = false;
      frame.confidence = 0;
    }
  }

  return result;
}

/** Moving-average smoothing of the voiced pitch trajectory; gaps (rests) are left untouched. */
export function smoothPitchTrajectory(frames: PitchFrame[], windowSize = 3): PitchFrame[] {
  const half = Math.floor(windowSize / 2);
  const result = frames.map((frame) => ({ ...frame }));

  for (let i = 0; i < result.length; i++) {
    if (!frames[i].voiced || frames[i].f0Hz === null) continue;

    const windowValues: number[] = [];
    for (let offset = -half; offset <= half; offset++) {
      const neighbor = frames[i + offset];
      if (neighbor?.voiced && neighbor.f0Hz !== null) windowValues.push(neighbor.f0Hz);
    }
    if (windowValues.length > 0) {
      result[i].f0Hz = windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length;
    }
  }

  return result;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
