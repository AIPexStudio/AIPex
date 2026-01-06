/**
 * ElevenLabs Speech-to-Text Integration
 * 使用 ElevenLabs API 进行语音转文字
 */

export interface ElevenLabsSTTConfig {
  apiKey: string;
  modelId?: string;
  language?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  error?: string;
}

/**
 * 使用 ElevenLabs API 转录音频
 */
export async function transcribeAudio(
  audioBlob: Blob,
  config: ElevenLabsSTTConfig,
): Promise<TranscriptionResult> {
  const { apiKey, modelId } = config;

  if (!apiKey) {
    throw new Error("ElevenLabs API key is required");
  }

  try {
    console.log(
      "[ElevenLabs STT] Starting transcription, audio size:",
      audioBlob.size,
    );

    // 准备 FormData
    const formData = new FormData();
    // 使用 'file' 字段名，文件名根据实际格式命名
    formData.append("file", audioBlob, "audio.wav");

    // 仅在提供了 modelId 时才添加（参考 VoiceInputManager 的实现）
    if (modelId) {
      formData.append("model_id", modelId);
    }

    // 注意：language_code 是可选的，不添加也可以让API自动检测

    // 调用 ElevenLabs API
    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ElevenLabs STT] API error:", response.status, errorText);

      let errorMessage = `ElevenLabs API错误: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return {
        text: "",
        error: errorMessage,
      };
    }

    const result = await response.json();
    console.log("[ElevenLabs STT] Transcription result:", result);

    // 参考 VoiceInputManager 的实现，ElevenLabs STT API 返回格式：
    // { text: string, language: string, confidence: number, ... }
    const text = result.text || "";
    const confidence = result.confidence || result.language_probability || 1.0;

    return {
      text: text.trim(),
      confidence,
    };
  } catch (error) {
    console.error("[ElevenLabs STT] Transcription failed:", error);
    return {
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 使用重试机制的转录
 */
export async function transcribeAudioWithRetry(
  audioBlob: Blob,
  config: ElevenLabsSTTConfig,
  maxRetries = 2,
): Promise<TranscriptionResult> {
  let lastError: string | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    if (i > 0) {
      console.log(`[ElevenLabs STT] Retry attempt ${i}/${maxRetries}`);
      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 1000 * i));
    }

    const result = await transcribeAudio(audioBlob, config);

    if (!result.error && result.text) {
      return result;
    }

    lastError = result.error;
  }

  return {
    text: "",
    error: lastError || "Transcription failed after retries",
  };
}

/**
 * 检查 API key 是否有效
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) {
    return false;
  }

  try {
    // 尝试调用 API 获取模型列表或用户信息
    const response = await fetch("https://api.elevenlabs.io/v1/models", {
      method: "GET",
      headers: {
        "xi-api-key": apiKey,
      },
    });

    return response.ok;
  } catch (error) {
    console.error("[ElevenLabs STT] API key validation failed:", error);
    return false;
  }
}
