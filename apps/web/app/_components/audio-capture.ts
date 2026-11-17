import {
  audioSampleRate,
  audioMaximumSeconds,
} from "../../../../lib/audio-contract";
export type AudioCapture = { stop: () => Blob; cancel: () => void };
// Reusable capture returns a transient canonical WAV. It never uploads or saves;
// the caller decides between ordinary transcription and a deliberate future save.
export async function startAudioCapture(
  signal: AbortSignal,
  onLimit: () => void,
): Promise<AudioCapture> {
  if (
    !navigator.mediaDevices?.getUserMedia ||
    !window.AudioContext ||
    !window.AudioWorkletNode
  )
    throw new Error(
      "Microphone recording is unavailable in this browser. You can still type.",
    );
  const context = new AudioContext({ sampleRate: audioSampleRate });
  let stream: MediaStream | undefined;
  let node: AudioWorkletNode | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const chunks: Float32Array[] = [];
  let stopped = false;
  function release() {
    stopped = true;
    clearTimeout(timer);
    stream?.getTracks().forEach((track) => track.stop());
    source?.disconnect();
    node?.disconnect();
    if (node) node.port.onmessage = null;
    void context.close().catch(() => {});
    signal.removeEventListener("abort", cancel);
  }
  function cancel() {
    release();
    chunks.length = 0;
  }
  signal.addEventListener("abort", cancel, { once: true });
  try {
    await context.resume();
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true },
      video: false,
    });
    if (signal.aborted || stopped) {
      release();
      throw new DOMException("Cancelled", "AbortError");
    }
    if (context.sampleRate !== audioSampleRate)
      throw new Error(
        "This device cannot record the supported audio format. You can still type.",
      );
    await context.audioWorklet.addModule("/pcm-capture.js");
    if (signal.aborted || stopped) {
      release();
      throw new DOMException("Cancelled", "AbortError");
    }
    source = context.createMediaStreamSource(stream);
    node = new AudioWorkletNode(context, "pcm-capture");
    node.port.onmessage = ({ data }) => {
      if (stopped) return;
      if (data === "limit") onLimit();
      else chunks.push(data);
    };
    source.connect(node);
    node.connect(context.destination);
    timer = setTimeout(onLimit, audioMaximumSeconds * 1000);
    return {
      cancel,
      stop() {
        release();
        const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
        const buffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(buffer);
        const write = (offset: number, text: string) => {
          for (let i = 0; i < text.length; i++)
            view.setUint8(offset + i, text.charCodeAt(i));
        };
        write(0, "RIFF");
        view.setUint32(4, 36 + length * 2, true);
        write(8, "WAVEfmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, audioSampleRate, true);
        view.setUint32(28, audioSampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        write(36, "data");
        view.setUint32(40, length * 2, true);
        let offset = 44;
        for (const chunk of chunks)
          for (const sample of chunk) {
            const value = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset, value * (value < 0 ? 32768 : 32767), true);
            offset += 2;
          }
        chunks.length = 0;
        return new Blob([buffer], { type: "audio/wav" });
      },
    };
  } catch (error) {
    cancel();
    throw error;
  }
}
