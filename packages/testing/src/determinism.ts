/**
 * Runs `produce` repeatedly and throws if any run's JSON-serialized result
 * differs from the first — the plugin-authoring equivalent of the PRD's
 * "同じ入力・設定・seedから同じ出力" requirement (PRD UPDATE_PRD.md §10.4, §1.2).
 */
export async function expectDeterministic<T>(produce: () => T | Promise<T>, runs = 3): Promise<void> {
  if (runs < 2) throw new Error("expectDeterministic needs at least 2 runs to compare.");

  const results: string[] = [];
  for (let i = 0; i < runs; i++) {
    results.push(JSON.stringify(await produce()));
  }

  const [first, ...rest] = results;
  const mismatchIndex = rest.findIndex((result) => result !== first);
  if (mismatchIndex !== -1) {
    throw new Error(`Expected deterministic output across ${runs} runs; run ${mismatchIndex + 2} differed from run 1.`);
  }
}
