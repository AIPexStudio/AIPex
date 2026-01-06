/**
 * VAD (Voice Activity Detection) Detector
 * 使用 @ricky0123/vad-web 进行语音活动检测
 */

import { MicVAD } from "@ricky0123/vad-web";

export interface VADConfig {
  positiveSpeechThreshold?: number;
  negativeSpeechThreshold?: number;
  minSpeechFrames?: number;
  preSpeechPadFrames?: number;
  redemptionFrames?: number;
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
  private isRunning = false;
  private config: VADConfig;

  constructor(config: VADConfig = {}) {
    this.config = {
      positiveSpeechThreshold: 0.8,
      negativeSpeechThreshold: 0.5,
      minSpeechFrames: 5,
      preSpeechPadFrames: 10,
      redemptionFrames: 20,
      ...config,
    };
  }

  /**
   * 初始化并启动 VAD
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("[VAD] Already running");
      return;
    }

    try {
      console.log("[VAD] Requesting microphone access...");

      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 创建 AudioContext 用于音量检测
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      this.microphone.connect(this.analyser);

      // 启动音量检测
      this.startVolumeMonitoring();

      console.log("[VAD] Initializing VAD...");

      // 初始化 VAD
      console.log("[VAD] Initializing with assets:", {
        base: chrome.runtime.getURL("assets/vad/"),
        onnx: chrome.runtime.getURL("assets/onnx/"),
      });

      // 验证资源是否可访问
      try {
        const modelUrl = chrome.runtime.getURL(
          "assets/vad/silero_vad_legacy.onnx",
        );
        const wasmUrl = chrome.runtime.getURL("assets/onnx/ort-wasm-simd.wasm");
        const wasmThreadedUrl = chrome.runtime.getURL(
          "assets/onnx/ort-wasm-simd-threaded.wasm",
        );

        console.log("[VAD] Checking resources accessibility...");

        const [modelResp, wasmResp, wasmThreadedResp] = await Promise.all([
          fetch(modelUrl, { method: "HEAD" }),
          fetch(wasmUrl, { method: "HEAD" }),
          fetch(wasmThreadedUrl, { method: "HEAD" }),
        ]);

        console.log("[VAD] Resources check:", {
          model: modelResp.ok,
          wasm: wasmResp.ok,
          wasmThreaded: wasmThreadedResp.ok,
          modelStatus: modelResp.status,
          wasmStatus: wasmResp.status,
          wasmThreadedStatus: wasmThreadedResp.status,
        });
      } catch (e) {
        console.warn("[VAD] Resource check failed:", e);
      }

      // 设置 onnxruntime-web 的路径
      // @ts-expect-error - MicVAD 内部使用 ort
      if (window.ort) {
        // @ts-expect-error
        window.ort.env.wasm.wasmPaths = chrome.runtime.getURL("assets/onnx/");
        // 强制使用单线程，避免 threaded WASM 加载问题和 SharedArrayBuffer 兼容性问题
        // @ts-expect-error
        window.ort.env.wasm.numThreads = 1;

        // 禁用 eval 的使用 (onnxruntime-web 可能会尝试使用 new Function)
        // @ts-expect-error
        window.ort.env.wasm.proxy = false;
      }

      this.vad = await MicVAD.new({
        baseAssetPath: chrome.runtime.getURL("assets/vad/"),
        onnxWASMBasePath: chrome.runtime.getURL("assets/onnx/"),
        positiveSpeechThreshold: this.config.positiveSpeechThreshold!,
        negativeSpeechThreshold: this.config.negativeSpeechThreshold!,
        minSpeechFrames: this.config.minSpeechFrames!,
        preSpeechPadFrames: this.config.preSpeechPadFrames!,
        redemptionFrames: this.config.redemptionFrames!,
        onSpeechStart: () => {
          console.log("[VAD] Speech started");
          this.config.onSpeechStart?.();
        },
        onSpeechEnd: (audio) => {
          console.log("[VAD] Speech ended, audio length:", audio.length);
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
      console.error("[VAD] Failed to start:", error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * 停止 VAD
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log("[VAD] Already stopped, skipping");
      return;
    }

    console.log("[VAD] 🛑 Stopping VAD...");

    // 立即标记为非运行状态
    this.isRunning = false;

    // 停止音量监测
    this.stopVolumeMonitoring();

    // 停止VAD
    if (this.vad) {
      console.log("[VAD] Pausing MicVAD...");
      this.vad.pause();
      this.vad = null;
    }

    // 清理音频资源
    this.cleanup();

    console.log("[VAD] ✅ VAD stopped completely");
  }

  /**
   * 暂停 VAD（但不释放资源）
   */
  pause(): void {
    if (this.vad && this.isRunning) {
      this.vad.pause();
      this.stopVolumeMonitoring();
      console.log("[VAD] Paused");
    }
  }

  /**
   * 恢复 VAD
   */
  resume(): void {
    if (this.vad && this.isRunning) {
      this.vad.start();
      this.startVolumeMonitoring();
      console.log("[VAD] Resumed");
    }
  }

  /**
   * 启动音量监测
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

      // 计算平均音量
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] || 0;
      }
      const average = sum / bufferLength;

      // 归一化到 0-1
      const volume = average / 255;

      this.config.onVolumeChange?.(volume);
    };

    // 每 50ms 检查一次音量
    this.volumeCheckInterval = window.setInterval(checkVolume, 50);
  }

  /**
   * 停止音量监测
   */
  private stopVolumeMonitoring(): void {
    if (this.volumeCheckInterval !== null) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }
  }

  /**
   * 清理资源
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
   * 检查是否正在运行
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
