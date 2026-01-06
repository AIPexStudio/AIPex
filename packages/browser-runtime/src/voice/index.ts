/**
 * Voice Input Module
 * Multi-source voice input system with VAD, ElevenLabs, and Server STT support
 */

export type { AudioRecorderConfig } from "./audio-recorder.js";
export { AudioRecorder } from "./audio-recorder.js";
export type {
  ElevenLabsSTTConfig,
  TranscriptionResult,
} from "./elevenlabs-stt.js";
export {
  transcribeAudio,
  transcribeAudioWithRetry,
  validateApiKey,
} from "./elevenlabs-stt.js";
export type { ServerSTTConfig } from "./server-stt.js";
export {
  transcribeAudioWithServer,
  transcribeAudioWithServerRetry,
} from "./server-stt.js";
export type { VADConfig } from "./vad-detector.js";
export { VADDetector } from "./vad-detector.js";
export type {
  VoiceInputMetadata,
  VoiceInputOptions,
} from "./voice-input-manager.js";
export { VoiceInputManager } from "./voice-input-manager.js";
