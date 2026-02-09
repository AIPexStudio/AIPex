/**
 * VAD (Voice Activity Detection) Detector
 * Uses @ricky0123/vad-web for voice activity detection
 */

import { MicVAD } from "@ricky0123/vad-web";

export interface VADConfig {
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  minSpeechMs?: number;
  preSpeechPadMs?: number;
  redemptionMs?: number;
  onSpeechStart?: () => void;
  onSpeechEnd?: (audio: Float32Array) => void;
  onVADMisfire?: () => void;
  onVolumeChange?: (volume: number) => void;
}

export class VADDetector {
  private vad: MicVAD | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private volumeCheckInterval: number | null = null;
  private isRunning: boolean = false;
  private config: VADConfig;

  constructor(config: VADConfig = {}) {
    this.config = {
      positiveSpeechThreshold: 0.8,
      negativeSpeechThreshold: 0.5,
      minSpeechMs: 150,
      preSpeechPadMs: 300,
      redemptionMs: 600,
      ...config,
    };
  }

  /**
   * Initialize and start VAD
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("[VAD] Already running");
      return;
    }

    try {
      console.log("[VAD] Requesting microphone access...");

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create AudioContext for volume detection
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      // Start volume monitoring
      this.startVolumeMonitoring();

      console.log("[VAD] Initializing VAD...");

      // Get asset paths (Chrome extension context)
      const vadBasePath = chrome.runtime.getURL("assets/vad/");
      const onnxBasePath = chrome.runtime.getURL("assets/onnx/");

      console.log("[VAD] Asset paths configured");

      // Verify resources are accessible
      try {
        const modelUrl = chrome.runtime.getURL(
          "assets/vad/silero_vad_legacy.onnx",
        );
        const wasmUrl = chrome.runtime.getURL("assets/onnx/ort-wasm-simd.wasm");

        console.log("[VAD] Checking resources accessibility...");

        const [modelResp, wasmResp] = await Promise.all([
          fetch(modelUrl, { method: "HEAD" }),
          fetch(wasmUrl, { method: "HEAD" }),
        ]);

        console.log("[VAD] Resources check:", {
          model: modelResp.ok,
          wasm: wasmResp.ok,
        });
      } catch (_e) {
        console.warn("[VAD] Resource check failed");
      }

      // Configure onnxruntime-web paths
      // @ts-expect-error - MicVAD uses ort internally
      if (window.ort) {
        // @ts-expect-error
        window.ort.env.wasm.wasmPaths = onnxBasePath;
        // Force single thread to avoid threaded WASM loading issues and SharedArrayBuffer compatibility
        // @ts-expect-error
        window.ort.env.wasm.numThreads = 1;
        // Disable eval usage (onnxruntime-web may try to use new Function)
        // @ts-expect-error
        window.ort.env.wasm.proxy = false;
      }

      this.vad = await MicVAD.new({
        baseAssetPath: vadBasePath,
        onnxWASMBasePath: onnxBasePath,
        positiveSpeechThreshold: this.config.positiveSpeechThreshold!,
        negativeSpeechThreshold: this.config.negativeSpeechThreshold!,
        minSpeechMs: this.config.minSpeechMs!,
        preSpeechPadMs: this.config.preSpeechPadMs!,
        redemptionMs: this.config.redemptionMs!,
        onSpeechStart: () => {
          console.log("[VAD] Speech started");
          this.config.onSpeechStart?.();
        },
        onSpeechEnd: (audio) => {
          // Log only audio length, not content (privacy)
          console.log("[VAD] Speech ended, audio samples:", audio.length);
          this.config.onSpeechEnd?.(audio);
        },
        onVADMisfire: () => {
          console.log("[VAD] Misfire detected");
          this.config.onVADMisfire?.();
        },
      });

      this.vad.start();
      this.isRunning = true;
      console.log("[VAD] Started successfully");
    } catch (error) {
      console.error("[VAD] Failed to start");
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop VAD
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log("[VAD] Already stopped, skipping");
      return;
    }

    console.log("[VAD] Stopping VAD...");

    // Immediately mark as not running
    this.isRunning = false;

    // Stop volume monitoring
    this.stopVolumeMonitoring();

    // Stop VAD
    if (this.vad) {
      console.log("[VAD] Pausing MicVAD...");
      this.vad.pause();
      this.vad = null;
    }

    // Cleanup audio resources
    this.cleanup();

    console.log("[VAD] VAD stopped completely");
  }

  /**
   * Pause VAD (without releasing resources)
   */
  pause(): void {
    if (this.vad && this.isRunning) {
      this.vad.pause();
      this.stopVolumeMonitoring();
      console.log("[VAD] Paused");
    }
  }

  /**
   * Resume VAD
   */
  resume(): void {
    if (this.vad && this.isRunning) {
      this.vad.start();
      this.startVolumeMonitoring();
      console.log("[VAD] Resumed");
    }
  }

  /**
   * Start volume monitoring
   */
  private startVolumeMonitoring(): void {
    if (!this.analyser || this.volumeCheckInterval !== null) {
      return;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Calculate average volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] ?? 0;
      }
      const average = sum / bufferLength;

      // Normalize to 0-1
      const volume = average / 255;

      this.config.onVolumeChange?.(volume);
    };

    // Check volume every 50ms
    this.volumeCheckInterval = window.setInterval(checkVolume, 50);
  }

  /**
   * Stop volume monitoring
   */
  private stopVolumeMonitoring(): void {
    if (this.volumeCheckInterval !== null) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Check if VAD is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
