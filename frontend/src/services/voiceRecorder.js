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

export function recordVoiceClip(durationMs = 3200) {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
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
          stream.getTracks().forEach((track) => track.stop());
          resolve({
            audioBase64,
            mimeType: blob.type || resolvedMimeType,
          });
        } catch (error) {
          reject(error);
        }
      };

      recorder.start();
      window.setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, durationMs);
      })
      .catch(reject);
  });
}
