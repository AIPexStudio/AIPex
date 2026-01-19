/**
 * Voice Input Intervention
 *
 * Get user voice input and convert to text
 * Three-tier service selection:
 * 1. Non-BYOK users: Use server interface
 * 2. BYOK users with ElevenLabs API: Use ElevenLabs
 * 3. BYOK users without ElevenLabs API: Use browser Web Speech API
 *
 * NOTE: This implementation requires VoiceInputManager, Storage, and isByokUserSimple
 * which need to be provided by the runtime environment or injected as dependencies.
 * For now, this is a simplified implementation using browser Web Speech API.
 */
import type { InterventionImplementation } from "../types.js";
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}
interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
}
declare global {
    interface Window {
        SpeechRecognition: {
            new (): SpeechRecognition;
        };
        webkitSpeechRecognition: {
            new (): SpeechRecognition;
        };
    }
}
export declare const voiceInputIntervention: InterventionImplementation;
export {};
