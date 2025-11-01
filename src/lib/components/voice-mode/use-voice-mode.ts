import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioManager } from './audio-manager';
import { ParticleSystem } from './particle-system';
import type { VoiceState, VoiceModeConfig } from './types';

export function useVoiceMode(config: VoiceModeConfig) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioManagerRef = useRef<AudioManager | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFinalTranscriptRef = useRef<string>('');
  const voiceStateRef = useRef<VoiceState>('idle');

  // Debounce state for audio level detection
  const audioLevelHistoryRef = useRef<number[]>([]);
  const stateChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  // Initialize audio manager
  useEffect(() => {
    if (!AudioManager.isSupported()) {
      setError('Web Speech API is not supported in this browser');
      config.onError?.(new Error('Web Speech API is not supported'));
      return;
    }

    const audioManager = new AudioManager();
    audioManagerRef.current = audioManager;

    // Setup audio data callback - auto switch between idle and listening
    audioManager.onAudioData((data) => {
      // Always update frequency for particle animation (regardless of state)
      if (particleSystemRef.current) {
        particleSystemRef.current.updateFrequency(data.averageFrequency);
      }

      // Auto-switch state based on audio level with debounce (only when not speaking/processing)
      const currentState = voiceStateRef.current;
      if (currentState !== 'speaking' && currentState !== 'processing') {
        // Hysteresis thresholds for stable detection
        const ENTER_THRESHOLD = 0.10; // become listening when above this
        const EXIT_THRESHOLD = 0.03;  // return to idle when below this

        // Add current level to history (keep last 5 samples for smoothing)
        audioLevelHistoryRef.current.push(data.averageFrequency);
        if (audioLevelHistoryRef.current.length > 5) {
          audioLevelHistoryRef.current.shift();
        }

        // Calculate average of recent samples for stable detection
        const avgLevel = audioLevelHistoryRef.current.reduce((a, b) => a + b, 0) / Math.max(audioLevelHistoryRef.current.length, 1);

        // Determine desired state based on hysteresis
        let desiredState: VoiceState = currentState;
        if (currentState === 'idle' && avgLevel > ENTER_THRESHOLD) desiredState = 'listening';
        if (currentState === 'listening' && avgLevel < EXIT_THRESHOLD) desiredState = 'idle';

        // Handle state changes with debounce
        if (desiredState !== currentState) {
          if (!stateChangeTimerRef.current) {
            // Different debounce delays for different transitions
            // Idle → Listening: 300ms (quick response to start of speech)
            // Listening → Idle: 1500ms (wait longer for natural pauses in speech)
            const debounceDelay = currentState === 'listening' && desiredState === 'idle'
              ? 1500 // Longer delay when ending listening (accommodate speech pauses)
              : 300;  // Shorter delay when starting listening

            // Set a new debounce timer
            stateChangeTimerRef.current = setTimeout(() => {
              // Check again after delay to confirm state change is still desired
              const recentAvg = audioLevelHistoryRef.current.reduce((a, b) => a + b, 0) / Math.max(audioLevelHistoryRef.current.length, 1);
              let confirmedState: VoiceState = voiceStateRef.current;
              if (voiceStateRef.current === 'idle' && recentAvg > ENTER_THRESHOLD) confirmedState = 'listening';
              if (voiceStateRef.current === 'listening' && recentAvg < EXIT_THRESHOLD) confirmedState = 'idle';

              if (confirmedState !== voiceStateRef.current && voiceStateRef.current !== 'speaking' && voiceStateRef.current !== 'processing') {
                setVoiceState(confirmedState);
              }

              stateChangeTimerRef.current = null;
            }, debounceDelay);
          }
        } else if (stateChangeTimerRef.current && desiredState === currentState) {
          // If desired state matches current state and there's a pending timer, cancel it
          // This happens when audio comes back during the waiting period
          clearTimeout(stateChangeTimerRef.current);
          stateChangeTimerRef.current = null;
        }
      }
    });

    // Setup transcript callback
    audioManager.onTranscript((result) => {
      setTranscript(result.transcript);

      if (result.isFinal && result.transcript.trim()) {
        // Only trigger if transcript is different from last one
        if (result.transcript !== lastFinalTranscriptRef.current) {
          lastFinalTranscriptRef.current = result.transcript;
          config.onTextRecognized?.(result.transcript);
        }
      }
    });

    // Setup error callback
    audioManager.onError((err) => {
      console.error('Audio manager error:', err);
      setError(err.message);
      config.onError?.(err);
    });

    setIsInitialized(true);

    return () => {
      // Cleanup debounce timer
      if (stateChangeTimerRef.current) {
        clearTimeout(stateChangeTimerRef.current);
      }
      audioManager.destroy();
    };
  }, []);

  // Initialize particle system
  const initParticleSystem = useCallback((canvas: HTMLCanvasElement) => {
    // Only initialize once - don't destroy and recreate on state changes
    if (particleSystemRef.current) {
      return; // Already initialized, don't recreate
    }

    try {
      canvasRef.current = canvas;
      const particleSystem = new ParticleSystem(canvas);
      particleSystemRef.current = particleSystem;
      // Set initial state to idle
      particleSystem.setState('idle');
    } catch (error) {
      console.error('Failed to initialize particle system:', error);
      setError('Failed to initialize visualization');
    }
  }, []); // No dependencies - only initialize once

  // Update particle system when state changes
  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setState(voiceState);
    }
  }, [voiceState]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!audioManagerRef.current || !isInitialized) return;

    try {
      setError(null); // Clear previous errors
      // Don't force set to listening - let audio level determine state
      setVoiceState('idle'); // Start with idle, will switch to listening when audio detected
      voiceStateRef.current = 'idle';
      setTranscript('');
      lastFinalTranscriptRef.current = '';
      await audioManagerRef.current.startListening(
        config.language || 'en-US',
        config.continuous ?? true
      );
    } catch (err) {
      console.error('Failed to start listening:', err);
      setError('Failed to access microphone. Please allow microphone permissions and try again.');
      setVoiceState('idle');
      voiceStateRef.current = 'idle';
    }
  }, [isInitialized, config.language, config.continuous]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!audioManagerRef.current) return;
    audioManagerRef.current.stopListening();
    setVoiceState('idle');
  }, []);

  // Speak text
  const speak = useCallback(async (text: string) => {
    if (!audioManagerRef.current || !isInitialized) return;

    try {
      setVoiceState('speaking');
      voiceStateRef.current = 'speaking';
      await audioManagerRef.current.speak(text, {
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        lang: config.language || 'en-US',
      });
      setVoiceState('idle');
      voiceStateRef.current = 'idle';
      config.onSpeechComplete?.();
    } catch (err) {
      console.error('Failed to speak:', err);
      setError('Failed to speak');
      setVoiceState('idle');
      voiceStateRef.current = 'idle';
    }
  }, [isInitialized, config]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (!audioManagerRef.current) return;
    audioManagerRef.current.stopSpeaking();
    setVoiceState('idle');
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening();
    } else if (voiceState === 'idle') {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (particleSystemRef.current) {
        particleSystemRef.current.destroy();
      }
    };
  }, []);

  return {
    voiceState,
    transcript,
    error,
    isInitialized,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    toggleListening,
    initParticleSystem,
    setVoiceState,
  };
}

