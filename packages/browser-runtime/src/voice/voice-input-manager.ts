/**
 * Voice Input Manager
 * 支持多种语音输入方式：Web Speech API、ElevenLabs API、Server STT、VAD
 */

import { AudioRecorder } from "./audio-recorder.js";
import type {
  ElevenLabsSTTConfig,
  TranscriptionResult,
} from "./elevenlabs-stt.js";
import { transcribeAudioWithRetry } from "./elevenlabs-stt.js";
import { transcribeAudioWithServerRetry } from "./server-stt.js";
import type { VADConfig } from "./vad-detector.js";
import { VADDetector } from "./vad-detector.js";

// Web Speech API type declarations
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
  maxAlternatives: number;
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

export interface VoiceInputMetadata {
  text: string; // 识别出的文本
  confidence: number; // 置信度
  timestamp: number; // 时间戳
  language: string; // 语言
  isFinal: boolean; // 是否是最终结果
  source?: "browser" | "elevenlabs" | "server"; // 识别来源
}

export interface VoiceInputOptions {
  language?: string; // 默认 'zh-CN'
  continuous?: boolean; // 是否持续识别
  interimResults?: boolean; // 是否返回中间结果
  maxAlternatives?: number; // 最大候选数
  useVAD?: boolean; // 是否使用 VAD
  useElevenLabs?: boolean; // 是否使用 ElevenLabs
  useServer?: boolean; // 是否使用服务端
}

export class VoiceInputManager {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private isRecording = false;
  private audioRecorder: AudioRecorder | null = null;
  private vadDetector: VADDetector | null = null;
  private onResultCallback?: (metadata: VoiceInputMetadata) => void;
  private onErrorCallback?: (error: Error) => void;
  private elevenLabsConfig?: ElevenLabsSTTConfig;
  private useServerSTT = false;
  private useVAD = false;

  constructor(elevenLabsConfig?: ElevenLabsSTTConfig) {
    this.elevenLabsConfig = elevenLabsConfig;
    this.initRecognition();
  }

  /**
   * 初始化语音识别
   */
  private initRecognition(): void {
    // 检查浏览器支持
    const SpeechRecognitionConstructor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      console.error("浏览器不支持语音识别");
      return;
    }

    this.recognition = new SpeechRecognitionConstructor();
  }

  /**
   * 开始语音输入
   */
  startListening(options: VoiceInputOptions = {}): void {
    // 根据选项决定使用哪种方式
    if (options.useVAD) {
      this.startVADListening(options);
    } else if (options.useElevenLabs || options.useServer) {
      this.startRecording(options.useServer || false);
    } else {
      this.startBrowserListening(options);
    }
  }

  /**
   * 使用浏览器 Web Speech API 开始监听
   */
  private startBrowserListening(options: VoiceInputOptions = {}): void {
    if (!this.recognition) {
      this.onErrorCallback?.(new Error("语音识别未初始化"));
      return;
    }

    if (this.isListening) {
      return;
    }

    // 配置识别器
    this.recognition.lang = options.language || "zh-CN";
    this.recognition.continuous = options.continuous ?? true;
    this.recognition.interimResults = options.interimResults ?? true;
    this.recognition.maxAlternatives = options.maxAlternatives || 1;

    // 设置事件处理器
    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (!result?.[0]) return;
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;

      const metadata: VoiceInputMetadata = {
        text: transcript,
        confidence: confidence,
        timestamp: Date.now(),
        language: this.recognition!.lang,
        isFinal: result.isFinal,
        source: "browser",
      };

      this.onResultCallback?.(metadata);
    };

    this.recognition.onerror = (event) => {
      this.onErrorCallback?.(new Error(event.error));
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    // 开始识别
    this.recognition.start();
    this.isListening = true;
  }

  /**
   * 使用 VAD 开始监听
   */
  private async startVADListening(
    options: VoiceInputOptions = {},
  ): Promise<void> {
    if (this.vadDetector?.isActive()) {
      console.warn("[VoiceInputManager] VAD already running");
      return;
    }

    this.useVAD = true;
    const vadConfig: VADConfig = {
      onSpeechEnd: async (audio) => {
        console.log(
          "[VoiceInputManager] VAD speech ended, processing audio...",
        );
        await this.processVADAudio(audio, options);
      },
      onVADMisfire: () => {
        console.log("[VoiceInputManager] VAD misfire");
      },
    };

    this.vadDetector = new VADDetector(vadConfig);
    await this.vadDetector.start();
    this.isListening = true;
  }

  /**
   * 处理 VAD 捕获的音频
   */
  private async processVADAudio(
    audio: Float32Array,
    options: VoiceInputOptions,
  ): Promise<void> {
    try {
      // 将 Float32Array 转换为 WAV Blob
      const audioBlob = AudioRecorder.float32ArrayToWav(audio);

      // 根据配置选择转录服务
      let result: TranscriptionResult;
      if (options.useServer) {
        result = await transcribeAudioWithServerRetry(audioBlob);
      } else if (this.elevenLabsConfig) {
        result = await transcribeAudioWithRetry(
          audioBlob,
          this.elevenLabsConfig,
        );
      } else {
        throw new Error("No transcription service configured");
      }

      if (result.error) {
        this.onErrorCallback?.(new Error(result.error));
        return;
      }

      const metadata: VoiceInputMetadata = {
        text: result.text,
        confidence: result.confidence || 1.0,
        timestamp: Date.now(),
        language: options.language || "zh-CN",
        isFinal: true,
        source: options.useServer ? "server" : "elevenlabs",
      };

      this.onResultCallback?.(metadata);
    } catch (error) {
      this.onErrorCallback?.(error as Error);
    }
  }

  /**
   * 停止语音输入
   */
  stopListening(): void {
    if (this.useVAD && this.vadDetector) {
      this.vadDetector.stop();
      this.vadDetector = null;
      this.useVAD = false;
    } else if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    this.isListening = false;
  }

  /**
   * 设置结果回调
   */
  onResult(callback: (metadata: VoiceInputMetadata) => void): void {
    this.onResultCallback = callback;
  }

  /**
   * 设置错误回调
   */
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * 检查是否正在监听
   */
  isActive(): boolean {
    return this.isListening;
  }

  /**
   * 开始录音（用于服务端 API 或 ElevenLabs API）
   * @param useServer - 是否使用服务端 API（默认使用 ElevenLabs）
   */
  async startRecording(useServer = false): Promise<void> {
    if (this.isRecording) {
      return;
    }

    this.useServerSTT = useServer;

    try {
      this.audioRecorder = new AudioRecorder();
      await this.audioRecorder.startRecording();
      this.isRecording = true;
    } catch (error) {
      this.onErrorCallback?.(error as Error);
    }
  }

  /**
   * 停止录音
   */
  async stopRecording(): Promise<void> {
    if (!this.audioRecorder || !this.isRecording) {
      return;
    }

    try {
      const audioBlob = await this.audioRecorder.stopRecording();

      // 根据配置选择转录服务
      let result: TranscriptionResult;
      if (this.useServerSTT) {
        result = await transcribeAudioWithServerRetry(audioBlob);
      } else if (this.elevenLabsConfig) {
        result = await transcribeAudioWithRetry(
          audioBlob,
          this.elevenLabsConfig,
        );
      } else {
        throw new Error("No transcription service configured");
      }

      if (result.error) {
        this.onErrorCallback?.(new Error(result.error));
        return;
      }

      const metadata: VoiceInputMetadata = {
        text: result.text,
        confidence: result.confidence || 1.0,
        timestamp: Date.now(),
        language: "zh-CN",
        isFinal: true,
        source: this.useServerSTT ? "server" : "elevenlabs",
      };

      this.onResultCallback?.(metadata);
    } catch (error) {
      this.onErrorCallback?.(error as Error);
    } finally {
      this.isRecording = false;
      this.audioRecorder = null;
    }
  }

  /**
   * 检查是否正在录音
   */
  isRecordingActive(): boolean {
    return this.isRecording;
  }

  /**
   * 设置ElevenLabs配置
   */
  setElevenLabsConfig(config: ElevenLabsSTTConfig): void {
    this.elevenLabsConfig = config;
  }

  /**
   * 检查浏览器是否支持语音识别
   */
  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * 检查浏览器是否支持录音
   */
  static isRecordingSupported(): boolean {
    return !!navigator.mediaDevices?.getUserMedia;
  }
}
