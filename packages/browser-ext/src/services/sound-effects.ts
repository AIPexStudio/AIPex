/**
 * Sound Effects System
 *
 * Provides audio feedback for mode transitions using Web Audio API.
 * Generates synthetic sounds dynamically without requiring audio files.
 */

import { chromeStorageAdapter } from "@aipexstudio/browser-runtime";

/**
 * Sound effect types
 */
export type SoundEffectType =
  | "enter-immersive" // User enters focus mode (focus on Chrome + AIPex group)
  | "enter-background" // User enters background mode (switches away)
  | "conversation-start" // Conversation begins
  | "conversation-end"; // Conversation ends

/**
 * Sound effects configuration
 */
interface SoundConfig {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  playInBackgroundMode: boolean; // Whether to play sounds when in background mode
}

/**
 * Default sound configuration
 */
const DEFAULT_CONFIG: SoundConfig = {
  enabled: true,
  volume: 0.5,
  playInBackgroundMode: false,
};

const SOUND_EFFECTS_ENABLED_KEY = "soundEffectsEnabled";
const SOUND_EFFECTS_VOLUME_KEY = "soundEffectsVolume";
const SOUND_EFFECTS_PLAY_IN_BACKGROUND_KEY = "soundEffectsPlayInBackground";

/**
 * Sound Effects Manager
 */
class SoundEffectsManager {
  private audioContext: AudioContext | null = null;
  private config: SoundConfig = DEFAULT_CONFIG;
  private currentMode: "immersive" | "background" = "background";

  constructor() {
    this.loadConfig();
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const enabled = await chromeStorageAdapter.get(SOUND_EFFECTS_ENABLED_KEY);
      const volume = await chromeStorageAdapter.get(SOUND_EFFECTS_VOLUME_KEY);
      const playInBackground = await chromeStorageAdapter.get(
        SOUND_EFFECTS_PLAY_IN_BACKGROUND_KEY,
      );

      this.config = {
        enabled: enabled !== "false" && enabled !== false, // Default to true
        volume: volume ? parseFloat(volume as string) : 0.5,
        playInBackgroundMode:
          playInBackground === "true" || playInBackground === true,
      };
    } catch (error) {
      console.warn(
        "⚠️ [SoundEffects] Failed to load config, using defaults:",
        error,
      );
    }
  }

  /**
   * Update configuration
   */
  public async updateConfig(config: Partial<SoundConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    if (config.enabled !== undefined) {
      await chromeStorageAdapter.set(SOUND_EFFECTS_ENABLED_KEY, config.enabled);
    }
    if (config.volume !== undefined) {
      await chromeStorageAdapter.set(SOUND_EFFECTS_VOLUME_KEY, config.volume);
    }
    if (config.playInBackgroundMode !== undefined) {
      await chromeStorageAdapter.set(
        SOUND_EFFECTS_PLAY_IN_BACKGROUND_KEY,
        config.playInBackgroundMode,
      );
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): SoundConfig {
    return { ...this.config };
  }

  /**
   * Set current mode
   */
  public setMode(mode: "immersive" | "background"): void {
    this.currentMode = mode;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private getAudioContext(): AudioContext | null {
    if (!this.audioContext) {
      try {
        this.audioContext = new AudioContext();
      } catch (error) {
        console.warn("⚠️ [SoundEffects] Failed to create AudioContext:", error);
        return null;
      }
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch((err) => {
        console.warn("⚠️ [SoundEffects] Failed to resume AudioContext:", err);
      });
    }

    return this.audioContext;
  }

  /**
   * Check if sound should be played based on current mode and config
   */
  private shouldPlaySound(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // If in background mode and not allowed to play in background, skip
    if (
      this.currentMode === "background" &&
      !this.config.playInBackgroundMode
    ) {
      return false;
    }

    return true;
  }

  /**
   * Play a sound effect
   */
  public play(type: SoundEffectType): void {
    if (!this.shouldPlaySound()) {
      return;
    }

    const audioContext = this.getAudioContext();
    if (!audioContext) {
      return;
    }

    switch (type) {
      case "enter-immersive":
        this.playEnterImmersive(audioContext);
        break;
      case "enter-background":
        this.playEnterBackground(audioContext);
        break;
      case "conversation-start":
        this.playConversationStart(audioContext);
        break;
      case "conversation-end":
        this.playConversationEnd(audioContext);
        break;
    }
  }

  /**
   * Enter Focus Mode Sound
   * Bright, upward sweep: C5 (523Hz) → E5 (659Hz)
   * Duration: 200ms
   */
  private playEnterImmersive(audioContext: AudioContext): void {
    const now = audioContext.currentTime;
    const duration = 0.2;

    // Oscillator for tone
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(523, now); // C5
    oscillator.frequency.exponentialRampToValueAtTime(659, now + duration); // E5

    // Gain envelope for smooth fade out
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(this.config.volume * 0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Play
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Enter Background Mode Sound
   * Soft, downward sweep: E5 (659Hz) → C4 (262Hz)
   * Duration: 150ms
   */
  private playEnterBackground(audioContext: AudioContext): void {
    const now = audioContext.currentTime;
    const duration = 0.15;

    // Oscillator for tone
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(659, now); // E5
    oscillator.frequency.exponentialRampToValueAtTime(262, now + duration); // C4

    // Gain envelope for smooth fade out
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(this.config.volume * 0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Play
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Conversation Start Sound
   * Warm notification: single tone at A4 (440Hz)
   * Duration: 100ms
   */
  private playConversationStart(audioContext: AudioContext): void {
    const now = audioContext.currentTime;
    const duration = 0.1;

    // Oscillator for tone
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, now); // A4

    // Gain envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(this.config.volume * 0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Play
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Conversation End Sound
   * Gentle completion: single tone at G4 (392Hz)
   * Duration: 120ms
   */
  private playConversationEnd(audioContext: AudioContext): void {
    const now = audioContext.currentTime;
    const duration = 0.12;

    // Oscillator for tone
    const oscillator = audioContext.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(392, now); // G4

    // Gain envelope
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(this.config.volume * 0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Play
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Cleanup audio context
   */
  public dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Global sound effects manager instance
 */
export const soundEffects = new SoundEffectsManager();

/**
 * Play a sound effect (convenience function)
 */
export function playSoundEffect(type: SoundEffectType): void {
  soundEffects.play(type);
}
