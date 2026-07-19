import { hashBytes, type RingManifest, type TimelineManifest } from "@match-dna/core";
export interface EncodeWavOptions {
  sampleRate: number;
  channels?: number;
}
function ascii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
export function encodePcm16Wav(samples: Float32Array, options: EncodeWavOptions): Uint8Array {
  const channels = options.channels ?? 1;
  if (!Number.isInteger(options.sampleRate) || options.sampleRate <= 0)
    throw new TypeError("sampleRate must be positive");
  if (!Number.isInteger(channels) || channels <= 0) throw new TypeError("channels must be positive");
  if (samples.length % channels)
    throw new TypeError("Interleaved sample count must be divisible by channels");
  const dataLength = samples.length * 2;
  const bytes = new Uint8Array(44 + dataLength);
  const view = new DataView(bytes.buffer);
  ascii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  ascii(view, 8, "WAVE");
  ascii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, options.sampleRate, true);
  view.setUint32(28, options.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  ascii(view, 36, "data");
  view.setUint32(40, dataLength, true);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return bytes;
}
export interface CanonicalAudioOptions {
  sampleRate?: number;
  secondsPerRing?: number;
  masterGain?: number;
  proofCodaSeconds?: number;
}
export interface CanonicalAudioRender {
  samples: Float32Array;
  wav: Uint8Array;
  hash: `0x${string}`;
  sampleRate: number;
  durationSeconds: number;
}
const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const intervals = (mode: RingManifest["audio"]["mode"]) =>
  mode === "mixolydian" ? [0, 4, 7, 10] : [0, 3, 7, 10];
function phase(hash: string) {
  return (Number.parseInt(hash.slice(2, 10), 16) / 0xffffffff) * Math.PI * 2;
}
export function renderCanonicalAudio(
  timeline: TimelineManifest,
  options: CanonicalAudioOptions = {},
): CanonicalAudioRender {
  const sampleRate = options.sampleRate ?? 24_000,
    secondsPerRing = options.secondsPerRing ?? 0.9,
    gain = options.masterGain ?? 0.58,
    coda = options.proofCodaSeconds ?? 1.8;
  if (sampleRate < 4000 || secondsPerRing <= 0 || gain <= 0 || coda < 0)
    throw new TypeError("Invalid audio options");
  const duration = timeline.rings.length * secondsPerRing + coda;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  timeline.rings.forEach((ring, index) => {
    const start = Math.floor(index * secondsPerRing * sampleRate),
      end = Math.min(samples.length, Math.floor((index + 1) * secondsPerRing * sampleRate));
    const root = frequency(ring.audio.rootMidi),
      chord = intervals(ring.audio.mode).map((n) => root * 2 ** (n / 12)),
      p = phase(ring.canonicalRingHash),
      beatRate = 0.85 + ring.audio.heartbeat * 2.4;
    for (let s = start; s < end; s++) {
      const t = (s - start) / sampleRate,
        pos = (s - start) / Math.max(1, end - start),
        envelope = Math.max(0, Math.min(1, pos / 0.08, (1 - pos) / 0.17));
      const harmonic =
        chord.reduce(
          (sum, f, i) =>
            sum +
            Math.sin(
              Math.PI * 2 * f * (1 + ring.audio.dissonance * (i - 1.5) * 0.0025) * t + p * (i + 1),
            ),
          0,
        ) / chord.length;
      const beatPhase = (t * beatRate) % 1,
        heartbeat = Math.exp(-((beatPhase / (0.025 + ring.audio.heartbeat * 0.025)) ** 2));
      const pulse = Math.sin(Math.PI * 2 * 52 * t) * heartbeat * (0.2 + 0.5 * ring.audio.heartbeat);
      samples[s] = Math.max(
        -1,
        Math.min(1, (harmonic * (0.27 + 0.2 * ring.audio.density) + pulse * 0.48) * envelope * gain),
      );
    }
  });
  const codaStart = Math.floor(timeline.rings.length * secondsPerRing * sampleRate);
  const root = frequency(timeline.rings.at(-1)?.audio.rootMidi ?? 48);
  for (let s = codaStart; s < samples.length; s++) {
    const t = (s - codaStart) / sampleRate,
      pos = t / Math.max(coda, 0.001),
      decay = Math.exp(-2.6 * pos);
    samples[s] = Math.max(
      -1,
      Math.min(
        1,
        samples[s]! +
          ([root, root * 1.5, root * 2].reduce(
            (sum, f, i) => sum + Math.sin(Math.PI * 2 * f * t + i * 0.41),
            0,
          ) /
            3) *
            decay *
            gain *
            0.55,
      ),
    );
  }
  const wav = encodePcm16Wav(samples, { sampleRate });
  return { samples, wav, hash: hashBytes(wav), sampleRate, durationSeconds: duration };
}
export async function playWitnessTone(
  ring: RingManifest,
  options: { durationMs?: number; gain?: number } = {},
): Promise<void> {
  if (typeof AudioContext === "undefined") return;
  const context = new AudioContext(),
    duration = (options.durationMs ?? 180) / 1000,
    g = context.createGain();
  g.gain.setValueAtTime(0, context.currentTime);
  g.gain.linearRampToValueAtTime(options.gain ?? 0.035, context.currentTime + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  g.connect(context.destination);
  const oscillator = context.createOscillator();
  oscillator.type =
    ring.material === "crystal" ? "sine" : ring.material === "amber" ? "triangle" : "sawtooth";
  oscillator.frequency.value = frequency(ring.audio.rootMidi);
  oscillator.connect(g);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  await new Promise<void>((resolve) =>
    oscillator.addEventListener("ended", () => resolve(), { once: true }),
  );
  await context.close();
}
