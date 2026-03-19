function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getPreferredMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = [
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || "";
}

function mergeFloat32Chunks(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });

  return merged;
}

function clampSample(sample) {
  return Math.max(-1, Math.min(1, sample));
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = clampSample(samples[index]);
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export async function ensureMicrophoneAccess() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported on this device");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  stream.getTracks().forEach((track) => track.stop());
  return true;
}

export async function releaseMicrophoneAccess() {
  return undefined;
}

async function recordVoiceClipWithMediaRecorder(stream, durationMs) {
  return new Promise((resolve, reject) => {
    try {
      const mimeType = getPreferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        reject(event.error || new Error("Recording failed"));
      };

      recorder.onstop = async () => {
        try {
          const resolvedMimeType = recorder.mimeType || mimeType || chunks[0]?.type || "audio/webm";
          const blob = new Blob(chunks, { type: resolvedMimeType });
          const audioBase64 = await blobToBase64(blob);
          resolve({
            audioBase64,
            mimeType: blob.type || resolvedMimeType,
          });
        } catch (error) {
          reject(error);
        }
      };

      recorder.start(250);
      window.setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, durationMs);
    } catch (error) {
      reject(error);
    }
  });
}

async function recordVoiceClipWithWav(stream, durationMs) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Audio recording is not supported on this device");
  }

  const audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  return new Promise((resolve, reject) => {
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const gain = audioContext.createGain();
    const chunks = [];
    gain.gain.value = 0;

    processor.onaudioprocess = (event) => {
      const channelData = event.inputBuffer.getChannelData(0);
      chunks.push(new Float32Array(channelData));
    };

    const cleanup = async () => {
      processor.disconnect();
      source.disconnect();
      gain.disconnect();
      try {
        await audioContext.close();
      } catch {
        // Ignore close failures from browsers that already disposed the context.
      }
    };

    processor.connect(gain);
    gain.connect(audioContext.destination);
    source.connect(processor);

    window.setTimeout(async () => {
      try {
        const merged = mergeFloat32Chunks(chunks);
        const wavBlob = encodeWav(merged, audioContext.sampleRate);
        const audioBase64 = await blobToBase64(wavBlob);
        await cleanup();
        resolve({
          audioBase64,
          mimeType: "audio/wav",
        });
      } catch (error) {
        await cleanup();
        reject(error);
      }
    }, durationMs);
  });
}

export async function recordVoiceClip(durationMs = 3200) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported on this device");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  try {
    try {
      if (typeof MediaRecorder !== "undefined") {
        return await recordVoiceClipWithMediaRecorder(stream, durationMs);
      }
    } catch (error) {
      if (!(window.AudioContext || window.webkitAudioContext)) {
        throw error;
      }
    }

    return await recordVoiceClipWithWav(stream, durationMs);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
