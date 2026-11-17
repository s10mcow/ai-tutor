import { AccessError } from "./family.ts";
import { audioMaximumBytes, audioSampleRate } from "./audio-contract.ts";
// Only the canonical PCM WAV emitted by our capture is accepted. No compressed
// duration guesses, trailing metadata, user filenames, URLs or provider Files.
export function validateRecording(bytes: Buffer) {
  if (
    bytes.length < 44 ||
    bytes.length > audioMaximumBytes ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.readUInt32LE(4) !== bytes.length - 8 ||
    bytes.toString("ascii", 8, 16) !== "WAVEfmt " ||
    bytes.readUInt32LE(16) !== 16 ||
    bytes.readUInt16LE(20) !== 1 ||
    bytes.readUInt16LE(22) !== 1 ||
    bytes.readUInt32LE(24) !== audioSampleRate ||
    bytes.readUInt32LE(28) !== audioSampleRate * 2 ||
    bytes.readUInt16LE(32) !== 2 ||
    bytes.readUInt16LE(34) !== 16 ||
    bytes.toString("ascii", 36, 40) !== "data" ||
    bytes.readUInt32LE(40) !== bytes.length - 44 ||
    (bytes.length - 44) % 2 !== 0 ||
    bytes.length - 44 < audioSampleRate / 2
  ) {
    throw new AccessError(
      400,
      "Record between a quarter second and 60 seconds using the microphone control.",
    );
  }
  return (bytes.length - 44) / (audioSampleRate * 2);
}
