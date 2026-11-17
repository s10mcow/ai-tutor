// Microphone samples only; output stays silent. Fixed capacity prevents hidden
// tabs or delayed timers from collecting more than the agreed 60-second bound.
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const count = Math.min(input.length, 16000 * 60 - this.samples);
    if (count > 0) {
      const chunk = input.slice(0, count);
      this.port.postMessage(chunk, [chunk.buffer]);
      this.samples += count;
    }
    if (this.samples >= 16000 * 60) {
      this.port.postMessage("limit");
      return false;
    }
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
