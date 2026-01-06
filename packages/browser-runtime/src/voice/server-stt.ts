/**
 * Server-side Speech-to-Text Integration
 * 使用 claudechrome.com 服务端接口进行语音转文字
 */

export type ServerSTTConfig = Record<string, never>;

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  error?: string;
}

interface ServerSTTResponse {
  success: boolean;
  transcript: string;
  duration: number;
  cost: number;
  language: string;
  speakers: unknown[];
  timestamp: string;
}

/**
 * 使用服务端 API 转录音频
 */
export async function transcribeAudioWithServer(
  audioBlob: Blob,
): Promise<TranscriptionResult> {
  try {
    console.log(
      "[Server STT] Starting transcription, audio size:",
      audioBlob.size,
    );

    // 获取认证 cookies（参考 message-handler.ts 的实现）
    let cookieHeader = "";
    try {
      const cookies = await chrome.cookies.getAll({
        url: "https://www.claudechrome.com",
      });

      const relevantCookies = cookies.filter(
        (cookie) =>
          cookie.name.includes("better-auth") ||
          cookie.name.includes("session"),
      );

      cookieHeader = relevantCookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");
      console.log("[Server STT] Found cookies:", cookieHeader ? "yes" : "no");
    } catch (error) {
      console.warn("[Server STT] Failed to get cookies:", error);
    }

    // 准备 FormData
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav");

    // 调用服务端 API
    const headers: Record<string, string> = {};
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    const response = await fetch(
      "https://www.claudechrome.com/api/speech-to-text",
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Server STT] API error:", response.status, errorText);

      let errorMessage = `服务端语音识别错误: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return {
        text: "",
        error: errorMessage,
      };
    }

    const result: ServerSTTResponse = await response.json();
    console.log("[Server STT] Transcription result:", result);

    if (!result.success) {
      return {
        text: "",
        error: "服务端语音识别失败",
      };
    }

    const text = result.transcript || "";
    // 服务端可能不返回 confidence，使用默认值
    const confidence = 1.0;

    return {
      text: text.trim(),
      confidence,
    };
  } catch (error) {
    console.error("[Server STT] Transcription failed:", error);
    return {
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 使用重试机制的转录
 */
export async function transcribeAudioWithServerRetry(
  audioBlob: Blob,
  maxRetries = 2,
): Promise<TranscriptionResult> {
  let lastError: string | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    if (i > 0) {
      console.log(`[Server STT] Retry attempt ${i}/${maxRetries}`);
      // 等待一段时间后重试
      await new Promise((resolve) => setTimeout(resolve, 1000 * i));
    }

    const result = await transcribeAudioWithServer(audioBlob);

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
