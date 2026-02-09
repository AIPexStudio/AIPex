/**
 * Audio Recorder
 * Manages audio recording, supports converting Float32Array to uploadable audio format
 */

export interface AudioRecorderConfig {
  sampleRate?: number;
  mimeType?: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private config: AudioRecorderConfig;

  constructor(config: AudioRecorderConfig = {}) {
    this.config = {
      sampleRate: 16000,
      mimeType: "audio/webm;codecs=opus",
      ...config,
    };
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn("[AudioRecorder] Already recording");
      return;
    }

    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      const options = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // Listen for data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Start recording
      this.audioChunks = [];
      this.mediaRecorder.start();
      this.isRecording = true;

      console.log("[AudioRecorder] Recording started");
    } catch (error) {
      console.error("[AudioRecorder] Failed to start recording");
      this.cleanup();
      throw error;
    }
  }

  /**
   * Stop recording and return audio Blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error("Not recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || this.config.mimeType!;
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanup();
        console.log(
          "[AudioRecorder] Recording stopped, blob size:",
          audioBlob.size,
        );
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  /**
   * Convert Float32Array audio data to WAV Blob
   * Used for processing audio data returned by VAD
   */
  static float32ArrayToWav(
    audioData: Float32Array,
    sampleRate: number = 16000,
  ): Blob {
    const buffer = AudioRecorder.encodeWAV(audioData, sampleRate);
    return new Blob([buffer], { type: "audio/wav" });
  }

  /**
   * Encode WAV file
   */
  private static encodeWAV(
    samples: Float32Array,
    sampleRate: number,
  ): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV file header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    const floatTo16BitPCM = (offset: number, input: Float32Array) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i] ?? 0));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, 1, true); // number of channels
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);
    floatTo16BitPCM(44, samples);

    return buffer;
  }

  /**
   * Get supported MIME type
   */
  private getSupportedMimeType(): MediaRecorderOptions {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/mp4",
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log("[AudioRecorder] Using MIME type:", type);
        return { mimeType: type };
      }
    }

    console.warn(
      "[AudioRecorder] No preferred MIME type supported, using default",
    );
    return {};
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  /**
   * Check if currently recording
   */
  isActive(): boolean {
    return this.isRecording;
  }
}
