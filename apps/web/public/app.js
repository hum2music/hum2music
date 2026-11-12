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
  const notesSummaryEl = document.getElementById("notes-summary");
  const chordEditorEl = document.getElementById("chord-editor");
  const instrumentToggles = Array.from(document.querySelectorAll(".instrument-toggle"));
  const styleSelect = document.getElementById("style-select");
  const songStructureCheckbox = document.getElementById("song-structure-checkbox");
  const humanizeSlider = document.getElementById("humanize-slider");
  const humanizeValueEl = document.getElementById("humanize-value");
  const seedInput = document.getElementById("seed-input");
  const regenerateButton = document.getElementById("regenerate-button");
  const downloadMidiButton = document.getElementById("download-midi-button");
  const downloadWavButton = document.getElementById("download-wav-button");
  const downloadJsonButton = document.getElementById("download-json-button");
  const pluginsListEl = document.getElementById("plugins-list");

  let lastAnalysis = null;
  let currentChords = [];
  let mediaRecorder = null;
  let recordedChunks = [];

  loadPluginList();

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    recordStatus.textContent = "解析中...";
    try {
      const wavBlob = await decodeToWavBlob(await file.arrayBuffer());
      const succeeded = await analyze(wavBlob);
      recordStatus.textContent = succeeded ? "解析完了" : "解析に失敗しました";
    } catch (error) {
      recordStatus.textContent = "解析に失敗しました";
      throw error;
    }
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
      try {
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
        const wavBlob = await decodeToWavBlob(await blob.arrayBuffer());
        const succeeded = await analyze(wavBlob);
        recordStatus.textContent = succeeded ? "解析完了" : "解析に失敗しました";
      } catch (error) {
        recordStatus.textContent = "解析に失敗しました";
        throw error;
      } finally {
        stream.getTracks().forEach((track) => track.stop());
        recordButton.textContent = "マイク録音開始";
      }
    });

    mediaRecorder.start();
    recordButton.textContent = "録音停止";
    recordStatus.textContent = "録音中...";
  });

  humanizeSlider.addEventListener("input", () => {
    humanizeValueEl.textContent = humanizeSlider.value;
  });

  regenerateButton.addEventListener("click", async () => {
    if (!lastAnalysis) return;
    regenerateButton.disabled = true;
    regenerateButton.textContent = "生成中...";
    try {
      await regenerateMidi();
    } finally {
      regenerateButton.disabled = false;
      regenerateButton.textContent = "再生成";
    }
  });

  downloadMidiButton.addEventListener("click", async () => {
    const blob = await fetchExport("/api/export/midi");
    if (blob) downloadBlob(blob, "song.mid");
  });

  downloadWavButton.addEventListener("click", async () => {
    const blob = await fetchExport("/api/export/wav");
    if (blob) downloadBlob(blob, "song.wav");
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
    const formData = new FormData();
    formData.append("audio", wavBlob, "input.wav");

    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: response.statusText }));
      alert(`解析に失敗しました: ${body.error ?? response.statusText}`);
      return false;
    }

    lastAnalysis = await response.json();
    currentChords = lastAnalysis.chords.map((chord) => ({ ...chord }));
    renderAnalysis(lastAnalysis);
    renderChordEditor(currentChords);
    analysisSection.hidden = false;
    arrangementSection.hidden = false;
    exportSection.hidden = false;
    return true;
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
    notesSummaryEl.textContent = `検出ノート数: ${analysis.notes.length} / 推定BPM: ${analysis.selectedBpm}`;
  }

  function renderChordEditor(chords) {
    chordEditorEl.replaceChildren();
    chords.forEach((chord, index) => {
      const label = document.createElement("label");
      label.textContent = `bar ${index + 1}: `;
      const input = document.createElement("input");
      input.type = "text";
      input.value = chord.symbol;
      input.size = 6;
      input.addEventListener("input", () => {
        currentChords[index] = { ...currentChords[index], symbol: input.value };
      });
      label.appendChild(input);
      chordEditorEl.appendChild(label);
    });
  }

  async function loadPluginList() {
    try {
      const response = await fetch("/api/plugins");
      if (!response.ok) throw new Error(response.statusText);
      renderPluginList(await response.json());
    } catch {
      pluginsListEl.textContent = "読み込みに失敗しました";
    }
  }

  function renderPluginList({ instruments, styles, renderers }) {
    const instrumentNames = instruments.map((i) => `${i.name} (${i.id})`).join(", ") || "(none)";
    const styleNames = styles.map((s) => `${s.name} (${s.id})`).join(", ") || "(none)";
    const rendererNames = renderers.join(", ") || "(none)";
    pluginsListEl.innerHTML = "";
    const list = document.createElement("ul");
    for (const [label, value] of [
      ["楽器", instrumentNames],
      ["スタイル", styleNames],
      ["レンダラー", rendererNames],
    ]) {
      const item = document.createElement("li");
      item.textContent = `${label}: ${value}`;
      list.appendChild(item);
    }
    pluginsListEl.appendChild(list);
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

  function selectedInstruments() {
    return instrumentToggles.filter((toggle) => toggle.checked).map((toggle) => toggle.value);
  }

  function buildExportRequestBody() {
    return {
      notes: lastAnalysis.notes,
      chords: currentChords,
      instruments: selectedInstruments(),
      style: styleSelect.value,
      songStructure: songStructureCheckbox.checked,
      humanize: Number(humanizeSlider.value),
      seed: Number(seedInput.value),
      bpm: lastAnalysis.selectedBpm,
    };
  }

  async function regenerateMidi() {
    const response = await fetch("/api/export/midi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildExportRequestBody()),
    });
    if (!response.ok) alert("MIDI生成に失敗しました");
  }

  async function fetchExport(path) {
    if (!lastAnalysis) return null;
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildExportRequestBody()),
    });
    if (!response.ok) {
      alert("書き出しに失敗しました");
      return null;
    }
    return response.blob();
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
