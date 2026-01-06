/**
 * Voice Input Component with 3D Particle Visualization
 * Pure UI component - receives state and callbacks via props
 */

import { useEffect, useRef, useState } from "react";
import { ParticleSystem } from "./particle-system.js";
import type { VoiceState } from "./types.js";

export interface VoiceInputProps {
  state?: VoiceState;
  frequency?: number;
  transcript?: string;
  isFinal?: boolean;
  onClose?: () => void;
  onSubmit?: (text: string) => void;
  className?: string;
}

export function VoiceInput({
  state = "idle",
  frequency = 0,
  transcript = "",
  isFinal = false,
  onClose,
  onSubmit,
  className = "",
}: VoiceInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const [finalTranscript, setFinalTranscript] = useState("");

  // Initialize particle system
  useEffect(() => {
    if (!canvasRef.current) return;

    const particleSystem = new ParticleSystem(canvasRef.current);
    particleSystemRef.current = particleSystem;

    return () => {
      particleSystem.destroy();
      particleSystemRef.current = null;
    };
  }, []);

  // Update particle system state
  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setState(state);
    }
  }, [state]);

  // Update particle system frequency
  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.updateFrequency(frequency);
    }
  }, [frequency]);

  // Handle final transcript
  useEffect(() => {
    if (isFinal && transcript) {
      setFinalTranscript(transcript);
      if (onSubmit) {
        onSubmit(transcript);
      }
    }
  }, [isFinal, transcript, onSubmit]);

  return (
    <div
      className={`relative w-full h-full min-h-[400px] bg-gray-950 rounded-lg overflow-hidden ${className}`}
    >
      {/* 3D Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
        {/* Header */}
        <div className="w-full flex justify-between items-center pointer-events-auto">
          <div className="text-white/80 text-sm font-medium">
            {state === "idle" && "Ready"}
            {state === "listening" && "🎤 Listening..."}
            {state === "speaking" && "🗣️ Speaking..."}
            {state === "processing" && "⚙️ Processing..."}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
              type="button"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>Close</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Transcript Display */}
        <div className="w-full max-w-2xl">
          {/* Interim Transcript */}
          {!isFinal && transcript && (
            <div className="bg-black/40 backdrop-blur-sm rounded-lg p-4 mb-4">
              <div className="text-white/60 text-sm mb-1">Recognizing...</div>
              <div className="text-white text-lg italic">{transcript}</div>
            </div>
          )}

          {/* Final Transcript */}
          {finalTranscript && (
            <div className="bg-emerald-500/20 backdrop-blur-sm rounded-lg p-4 border border-emerald-500/30">
              <div className="text-emerald-300 text-sm mb-1 flex items-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <title>Complete</title>
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Complete
              </div>
              <div className="text-white text-lg">{finalTranscript}</div>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="w-full text-center text-white/40 text-sm">
          {state === "listening" && "Speak clearly into your microphone..."}
          {state === "idle" && "Voice input ready"}
        </div>
      </div>
    </div>
  );
}
