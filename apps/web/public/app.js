// Pure audio helpers (no DOM dependency) — exported so they can be unit
// tested directly under Bun, in addition to running in the browser.

export function downmixToMono(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const mono = new Float32Array(length);
  for (let channel = 0; channel < channels; channel++) {
    const data = audioBuffer.getChannelData(channel);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
  }
  return mono;
}

export function encodeWavPcm16(samples, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  return buffer;
}

export function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}

// Everything below touches the DOM/Web Audio/MediaDevices APIs, so it's
// skipped entirely when this module is imported in a non-browser test
// environment (see tests/web/app.test.ts).
if (typeof document !== "undefined") {
  initUI();
}

function initUI() {
  const fileInput = document.getElementById("file-input");
  const recordButton = document.getElementById("record-button");
  const recordStatus = document.getElementById("record-status");
  const analysisSection = document.getElementById("analysis-section");
  const arrangementSection = document.getElementById("arrangement-section");
  const exportSection = document.getElementById("export-section");
  const pitchCanvas = document.getElementById("pitch-canvas");
  const tempoCandidatesEl = document.getElementById("tempo-candidates");
  const keyCandidatesEl = document.getElementById("key-candidates");
  const chordProgressionEl = document.getElementById("chord-progression");
  const notesSummaryEl = document.getElementById("notes-summary");
  const humanizeSlider = document.getElementById("humanize-slider");
  const humanizeValueEl = document.getElementById("humanize-value");
  const seedInput = document.getElementById("seed-input");
  const regenerateButton = document.getElementById("regenerate-button");
  const downloadMidiButton = document.getElementById("download-midi-button");
  const downloadJsonButton = document.getElementById("download-json-button");

  let lastAnalysis = null;
  let lastMidiBlob = null;
  let mediaRecorder = null;
  let recordedChunks = [];

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const wavBlob = await decodeToWavBlob(await file.arrayBuffer());
    await analyze(wavBlob);
  });

  recordButton.addEventListener("click", async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.addEventListener("dataavailable", (event) => recordedChunks.push(event.data));
    mediaRecorder.addEventListener("stop", async () => {
      recordStatus.textContent = "解析中...";
      const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
      const wavBlob = await decodeToWavBlob(await blob.arrayBuffer());
      await analyze(wavBlob);
      stream.getTracks().forEach((track) => track.stop());
      recordButton.textContent = "マイク録音開始";
    });

    mediaRecorder.start();
    recordButton.textContent = "録音停止";
    recordStatus.textContent = "録音中...";
  });

  humanizeSlider.addEventListener("input", () => {
    humanizeValueEl.textContent = humanizeSlider.value;
  });

  regenerateButton.addEventListener("click", () => {
    if (lastAnalysis) regenerateMidi();
  });

  downloadMidiButton.addEventListener("click", async () => {
    if (!lastMidiBlob) await regenerateMidi();
    if (lastMidiBlob) downloadBlob(lastMidiBlob, "melody.mid");
  });

  downloadJsonButton.addEventListener("click", () => {
    if (!lastAnalysis) return;
    downloadBlob(new Blob([JSON.stringify(lastAnalysis, null, 2)], { type: "application/json" }), "analysis.json");
  });

  async function decodeToWavBlob(arrayBuffer) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const mono = downmixToMono(audioBuffer);
    const wavBuffer = encodeWavPcm16(mono, audioBuffer.sampleRate);
    await audioContext.close();
    return new Blob([wavBuffer], { type: "audio/wav" });
  }

  async function analyze(wavBlob) {
    lastMidiBlob = null;
    const formData = new FormData();
    formData.append("audio", wavBlob, "input.wav");

    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: response.statusText }));
      alert(`解析に失敗しました: ${body.error ?? response.statusText}`);
      return;
    }

    lastAnalysis = await response.json();
    renderAnalysis(lastAnalysis);
    analysisSection.hidden = false;
    arrangementSection.hidden = false;
    exportSection.hidden = false;
  }

  function renderAnalysis(analysis) {
    drawPitchCurve(analysis.pitchCurve, analysis.notes);
    tempoCandidatesEl.textContent = analysis.tempoCandidates
      .map((c) => `${c.bpm} BPM (${Math.round(c.confidence * 100)}%)`)
      .join(", ");
    keyCandidatesEl.textContent = analysis.keyCandidates
      .slice(0, 3)
      .map((c) => `${c.tonic} ${c.mode} (${Math.round(c.confidence * 100)}%)`)
      .join(", ");
    chordProgressionEl.textContent = analysis.chords
      .map((c) => `${c.symbol} (${Math.round(c.confidence * 100)}%)`)
      .join(" - ");
    notesSummaryEl.textContent = `検出ノート数: ${analysis.notes.length} / 推定BPM: ${analysis.selectedBpm}`;
  }

  function drawPitchCurve(pitchCurve, notes) {
    const ctx = pitchCanvas.getContext("2d");
    ctx.clearRect(0, 0, pitchCanvas.width, pitchCanvas.height);

    const voiced = pitchCurve.filter((frame) => frame.voiced && frame.f0Hz !== null);
    if (voiced.length === 0) return;

    const maxTimeMs = pitchCurve[pitchCurve.length - 1].timeMs || 1;
    const minHz = Math.min(...voiced.map((frame) => frame.f0Hz));
    const maxHz = Math.max(...voiced.map((frame) => frame.f0Hz));
    const hzRange = maxHz - minHz || 1;

    ctx.strokeStyle = "#3366cc";
    ctx.beginPath();
    let drawing = false;
    for (const frame of pitchCurve) {
      if (!frame.voiced || frame.f0Hz === null) {
        drawing = false;
        continue;
      }
      const x = (frame.timeMs / maxTimeMs) * pitchCanvas.width;
      const y = pitchCanvas.height - ((frame.f0Hz - minHz) / hzRange) * pitchCanvas.height;
      if (!drawing) {
        ctx.moveTo(x, y);
        drawing = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.fillStyle = "#cc3366";
    for (const note of notes) {
      const x = (note.startMs / maxTimeMs) * pitchCanvas.width;
      const midiHz = 440 * Math.pow(2, (note.midiPitch - 69) / 12);
      const y = pitchCanvas.height - ((midiHz - minHz) / hzRange) * pitchCanvas.height;
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }

  async function regenerateMidi() {
    const response = await fetch("/api/export/midi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: lastAnalysis.notes,
        humanize: Number(humanizeSlider.value),
        seed: Number(seedInput.value),
        bpm: lastAnalysis.selectedBpm,
      }),
    });

    if (!response.ok) {
      alert("MIDI生成に失敗しました");
      return;
    }
    lastMidiBlob = await response.blob();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
