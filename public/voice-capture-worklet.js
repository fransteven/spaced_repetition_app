class VoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = [];
    this.position = 0;
    this.chunk = new Int16Array(1600);
    this.chunkLength = 0;
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (const sample of channel) this.samples.push(sample);

    const ratio = sampleRate / 16000;
    while (this.position + 1 < this.samples.length) {
      const index = Math.floor(this.position);
      const fraction = this.position - index;
      const value = this.samples[index] * (1 - fraction) + this.samples[index + 1] * fraction;
      const clamped = Math.max(-1, Math.min(1, value));
      this.chunk[this.chunkLength++] = clamped < 0 ? clamped * 32768 : clamped * 32767;
      this.position += ratio;
      if (this.chunkLength === this.chunk.length) {
        this.port.postMessage(this.chunk.buffer, [this.chunk.buffer]);
        this.chunk = new Int16Array(1600);
        this.chunkLength = 0;
      }
    }
    const consumed = Math.floor(this.position);
    if (consumed > 0) {
      this.samples = this.samples.slice(consumed);
      this.position -= consumed;
    }
    return true;
  }
}

registerProcessor('voice-capture', VoiceCaptureProcessor);
