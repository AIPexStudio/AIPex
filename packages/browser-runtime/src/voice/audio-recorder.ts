/**
 * Audio Recorder
 * 管理音频录制，支持将 Float32Array 转换为可上传的音频格式
 */

export interface AudioRecorderConfig {
  sampleRate?: number;
  mimeType?: string;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isRecording = false;
  private config: AudioRecorderConfig;

  constructor(config: AudioRecorderConfig = {}) {
    this.config = {
      sampleRate: 16000,
      mimeType: "audio/webm;codecs=opus",
      ...config,
    };
  }

  /**
   * 开始录制
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn("[AudioRecorder] Already recording");
      return;
    }

    try {
      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 创建 MediaRecorder
      const options = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      // 监听数据可用事件
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // 开始录制
      this.audioChunks = [];
      this.mediaRecorder.start();
      this.isRecording = true;

      console.log("[AudioRecorder] Recording started");
    } catch (error) {
      console.error("[AudioRecorder] Failed to start recording:", error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * 停止录制并返回音频 Blob
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
   * 将 Float32Array 音频数据转换为 WAV Blob
   * 用于处理 VAD 返回的音频数据
   */
  static float32ArrayToWav(audioData: Float32Array, sampleRate = 16000): Blob {
    const buffer = AudioRecorder.encodeWAV(audioData, sampleRate);
    return new Blob([buffer], { type: "audio/wav" });
  }

  /**
   * 编码 WAV 文件
   */
  private static encodeWAV(
    samples: Float32Array,
    sampleRate: number,
  ): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV 文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const floatTo16BitPCM = (offset: number, input: Float32Array) => {
      let currentOffset = offset;
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i] || 0));
        view.setInt16(currentOffset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        currentOffset += 2;
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
   * 获取支持的 MIME 类型
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
   * 清理资源
   */
  private cleanup(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  /**
   * 检查是否正在录制
   */
  isActive(): boolean {
    return this.isRecording;
  }
}
