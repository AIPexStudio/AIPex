import type { AudioData, SpeechRecognitionResult } from './types';

// Extend Window interface for webkit prefixed APIs
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private recognition: any = null;
  private synthesis: SpeechSynthesis;
  private frequencyData: Uint8Array<ArrayBufferLike> | null = null;
  private animationId: number | null = null;
  private stream: MediaStream | null = null;

  // Callbacks
  private onAudioDataCallback: ((data: AudioData) => void) | null = null;
  private onTranscriptCallback: ((result: SpeechRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  // Check if Web Speech API is supported
  public static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition) &&
      !!window.speechSynthesis;
  }

  // Initialize audio context and analyser
  private async initAudioContext() {
    if (this.audioContext) return;

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Create audio context
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      // Initialize frequency data array
      const bufferLength = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(bufferLength);

      // Start analyzing
      this.startAnalyzing();
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      this.onErrorCallback?.(new Error('Microphone access denied'));
      throw error;
    }
  }

  // Start analyzing audio data
  private startAnalyzing() {
    if (!this.analyser || !this.frequencyData) return;

    const analyze = () => {
      if (!this.analyser || !this.frequencyData) return;

      // Get frequency data
      // @ts-ignore - TypeScript has issues with Uint8Array buffer types
      this.analyser.getByteFrequencyData(this.frequencyData);

      // Calculate average frequency
      let sum = 0;
      for (let i = 0; i < this.frequencyData.length; i++) {
        sum += this.frequencyData[i];
      }
      const average = sum / this.frequencyData.length;
      const normalized = average / 255;

      // Check if audio is active (above threshold)
      const isActive = normalized > 0.01;

      // Call callback with audio data
      if (this.onAudioDataCallback) {
        this.onAudioDataCallback({
          frequencyData: new Uint8Array(this.frequencyData),
          averageFrequency: normalized,
          isActive,
        });
      }

      this.animationId = requestAnimationFrame(analyze);
    };

    analyze();
  }

  // Start speech recognition
  public async startListening(language: string = 'en-US', continuous: boolean = true) {
    try {
      // Initialize audio context if needed
      await this.initAudioContext();

      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      this.recognition.continuous = continuous;
      this.recognition.interimResults = true;
      this.recognition.lang = language;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const isFinal = result.isFinal;
        const confidence = result[0].confidence;

        if (this.onTranscriptCallback) {
          this.onTranscriptCallback({
            transcript,
            isFinal,
            confidence,
          });
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.onErrorCallback?.(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        // Auto-restart if continuous mode
        if (continuous && this.recognition) {
          try {
            this.recognition.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      };

      this.recognition.start();
    } catch (error) {
      console.error('Failed to start listening:', error);
      this.onErrorCallback?.(error as Error);
      throw error;
    }
  }

  // Stop speech recognition
  public stopListening() {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }

  // Speak text using speech synthesis
  public speak(text: string, options?: { rate?: number; pitch?: number; volume?: number; lang?: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate ?? 1.0;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.volume = options?.volume ?? 1.0;
      utterance.lang = options?.lang ?? 'en-US';

      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        reject(new Error('Speech synthesis failed'));
      };

      this.synthesis.speak(utterance);
    });
  }

  // Stop speech synthesis
  public stopSpeaking() {
    this.synthesis.cancel();
  }

  // Check if currently speaking
  public isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  // Set callback for audio data
  public onAudioData(callback: (data: AudioData) => void) {
    this.onAudioDataCallback = callback;
  }

  // Set callback for transcript
  public onTranscript(callback: (result: SpeechRecognitionResult) => void) {
    this.onTranscriptCallback = callback;
  }

  // Set callback for errors
  public onError(callback: (error: Error) => void) {
    this.onErrorCallback = callback;
  }

  // Cleanup
  public destroy() {
    this.stopListening();
    this.stopSpeaking();

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    if (this.microphone) {
      this.microphone.disconnect();
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.recognition = null;
    this.frequencyData = null;
    this.stream = null;
  }
}

