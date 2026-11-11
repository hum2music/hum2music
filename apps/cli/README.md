# hum2music

Turn a hummed melody into a multi-track MIDI/WAV song — no generative AI, a
local, rule-based engine built on signal processing and music theory.

Full docs, architecture, and source: https://github.com/hum2music/hum2music

## Requirements

This CLI runs on [Bun](https://bun.sh) (the published entry point is a `.ts`
file executed directly by Bun, not pre-compiled JavaScript).

## Usage

```bash
bunx hum2music transcribe input.wav -o melody.mid
bunx hum2music analyze input.wav --chords
bunx hum2music generate input.wav -o song.mid --wav song.wav
bunx hum2music serve --port 3000
```

## License

Apache License 2.0
