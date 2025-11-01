import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { XIcon, MicIcon, MicOffIcon, Volume2Icon, VolumeXIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceMode } from './use-voice-mode';
import type { VoiceModeProps } from './types';

export const VoiceMode: React.FC<VoiceModeProps> = ({ onClose, onSubmit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [pendingResponse, setPendingResponse] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true); // Auto-enable microphone
  const particleSystemInitializedRef = useRef<boolean>(false);

  const {
    voiceState,
    transcript,
    error,
    isInitialized,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    initParticleSystem,
    setVoiceState,
  } = useVoiceMode({
    onTextRecognized: async (text) => {
      console.log('Text recognized:', text);
      setRecognizedText(text);
      
      // Stop listening while processing
      stopListening();
      setVoiceState('processing');
      setPendingResponse(true);

      // Submit to chatbot
      onSubmit(text);

      // Wait for response and speak it
      // Note: In a real implementation, you'd want to hook into the message handler
      // to get the actual AI response. For now, we'll simulate a delay.
      setTimeout(() => {
        // This is a placeholder - you'd actually get the response from messageHandler
        const mockResponse = "I've received your message and I'm processing it.";
        if (voiceEnabled) {
          speak(mockResponse).then(() => {
            setPendingResponse(false);
            if (micEnabled) {
              startListening();
            }
          });
        } else {
          setPendingResponse(false);
          setVoiceState('idle');
        }
      }, 1000);
    },
    onSpeechComplete: () => {
      console.log('Speech complete');
      if (micEnabled) {
        startListening();
      }
    },
    onError: (err) => {
      console.error('Voice mode error:', err);
    },
    language: 'en-US',
    continuous: false,
  });

  // Initialize particle system and auto-start listening
  useEffect(() => {
    if (canvasRef.current && containerRef.current && isInitialized) {
      // Set canvas size explicitly
      const container = containerRef.current;
      const canvas = canvasRef.current;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Use setTimeout to ensure canvas is fully rendered in DOM
      setTimeout(() => {
        if (canvasRef.current && !particleSystemInitializedRef.current) {
          initParticleSystem(canvasRef.current);
          particleSystemInitializedRef.current = true;
        }
      }, 100);

      // Auto-start listening when initialized
      if (micEnabled) {
        startListening();
      }

      // Handle window resize
      const handleResize = () => {
        if (canvasRef.current && containerRef.current) {
          const canvas = canvasRef.current;
          const container = containerRef.current;
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isInitialized, initParticleSystem, micEnabled, startListening]);

  // Handle close
  const handleClose = () => {
    stopListening();
    stopSpeaking();
    onClose();
  };

  // Toggle microphone
  const handleToggleMic = () => {
    setMicEnabled(!micEnabled);
    if (!micEnabled) {
      startListening();
    } else {
      stopListening();
    }
  };

  // Toggle voice output
  const handleToggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (voiceEnabled) {
      stopSpeaking();
    }
  };

  // Get state display text
  const getStateText = () => {
    switch (voiceState) {
      case 'listening':
        return 'Listening...';
      case 'speaking':
        return 'Speaking...';
      case 'processing':
        return 'Processing...';
      default:
        return 'Say something...';
    }
  };

  // Get state color
  const getStateColor = () => {
    switch (voiceState) {
      case 'listening':
        return 'text-orange-400'; // Orange for voice input detection
      case 'speaking':
        return 'text-green-400'; // Green for audio output
      case 'processing':
        return 'text-cyan-400';
      default:
        return 'text-cyan-400'; // Cyan for idle
    }
  };

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="text-white text-xl">Initializing voice mode...</div>
      </div>
    );
  }

  // Show error in the UI but don't block the interface
  const hasError = !!error;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black overflow-hidden"
    >
      {/* Canvas for particle system */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block',
          touchAction: 'none' 
        }}
      />

      {/* UI Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full w-full p-8">
        {/* Header */}
        <div className="flex items-center justify-between w-full max-w-4xl">
          <div className="flex items-center gap-4">
            {/* Microphone toggle */}
            <Button
              onClick={handleToggleMic}
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-full h-12 w-12 transition-colors',
                micEnabled
                  ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400'
                  : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-400'
              )}
            >
              {micEnabled ? <MicIcon className="size-6" /> : <MicOffIcon className="size-6" />}
            </Button>

            {/* Voice output toggle */}
            <Button
              onClick={handleToggleVoice}
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-full h-12 w-12 transition-colors',
                voiceEnabled
                  ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                  : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-400'
              )}
            >
              {voiceEnabled ? <Volume2Icon className="size-6" /> : <VolumeXIcon className="size-6" />}
            </Button>
          </div>

          {/* Close button */}
          <Button
            onClick={handleClose}
            variant="ghost"
            size="icon"
            className="rounded-full h-12 w-12 bg-white/10 hover:bg-white/20 text-white"
          >
            <XIcon className="size-6" />
          </Button>
        </div>

        {/* Center content */}
        <div className="flex flex-col items-center gap-8 max-w-4xl w-full">
          {/* Error message */}
          {/* {hasError && (
            <div className="bg-red-500/20 backdrop-blur-md rounded-2xl p-6 max-w-2xl w-full border border-red-500/40">
              <div className="text-red-400 text-sm mb-2 font-medium">
                Error
              </div>
              <div className="text-white/90 text-base">
                {error}
              </div>
              <div className="text-white/60 text-sm mt-3">
                Please check your microphone permissions and try again.
              </div>
            </div>
          )} */}

          {/* Transcript display */}
          {!hasError && (transcript || recognizedText) && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-2xl w-full">
              <div className="text-white/60 text-sm mb-2">
                {voiceState === 'listening' ? 'Transcribing...' : 'Recognized:'}
              </div>
              <div className="text-white text-lg leading-relaxed">
                {transcript || recognizedText}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="text-white/40 text-sm text-center max-w-md">
          {!micEnabled && voiceState === 'idle' && (
            <p>Click the microphone button to start voice input.</p>
          )}
          {micEnabled && voiceState === 'listening' && (
            <p>Listening... Speak now.</p>
          )}
          {micEnabled && voiceState === 'idle' && !pendingResponse && (
            <p>Ready to listen. Microphone is enabled.</p>
          )}
          {voiceState === 'processing' && (
            <p>Processing your request...</p>
          )}
          {voiceState === 'speaking' && (
            <p>Speaking response...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceMode;

