/**
 * Voice mode state types
 */
export type VoiceState = "idle" | "listening" | "speaking" | "processing";

/**
 * Voice mode configuration
 */
export interface VoiceModeConfig {
  onTextRecognized?: (text: string) => void;
  onSpeechComplete?: () => void;
  onError?: (error: Error) => void;
  language?: string;
  continuous?: boolean;
}

/**
 * Audio analysis data
 */
export interface AudioData {
  frequencyData: Uint8Array;
  averageFrequency: number;
  isActive: boolean;
}

/**
 * Speech recognition result
 */
export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

/**
 * Particle system uniforms
 */
export interface ParticleUniforms {
  uTime: { value: number };
  uState: { value: number }; // 0=idle, 1=listening, 2=speaking
  uRadius: { value: number };
  uFrequency: { value: number };
  uPointSize: { value: number };
}

/**
 * Voice mode props
 */
export interface VoiceModeProps {
  onClose: () => void;
  onSubmit: (text: string) => void;
}
