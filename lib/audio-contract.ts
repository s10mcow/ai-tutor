// Shared capture format for transient coaching and later deliberate Portfolio saves.
export const audioSampleRate = 16_000;
export const audioMaximumSeconds = 60;
export const audioMaximumBytes = 44 + audioSampleRate * 2 * audioMaximumSeconds;
export const transcriptionReservationNanoUsd = 4_500_000n;
export const transcriptionPricePolicy = "gpt-transcribe-duration-2026-11-17";
