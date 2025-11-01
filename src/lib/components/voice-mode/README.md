# Voice Mode

Voice Mode is an immersive voice interaction feature for AIPex that combines real-time speech recognition, text-to-speech synthesis, and stunning GPU-accelerated particle visualizations.

## Features

- 🎤 **Voice Input**: Real-time speech recognition using Web Speech API
- 🔊 **Voice Output**: Natural text-to-speech synthesis
- ✨ **Particle Visualization**: Dynamic Three.js particle system with GLSL shaders
- 🎨 **Visual Feedback**: Color-coded states (red for listening, green for speaking)
- 📊 **Audio Analysis**: Real-time frequency analysis for reactive visuals

## Usage

1. Click the microphone icon in the chat input toolbar
2. Allow microphone access when prompted
3. Speak naturally - your speech will be automatically transcribed
4. The AI response will be spoken back to you
5. Toggle microphone or speaker using the control buttons
6. Press X to exit voice mode

## Components

### Main Components

- `index.tsx` - Main VoiceMode UI component
- `particle-system.ts` - Three.js particle visualization system
- `audio-manager.ts` - Web Speech API and Audio Analysis wrapper
- `use-voice-mode.ts` - State management hook
- `shaders.ts` - GLSL vertex and fragment shaders
- `types.ts` - TypeScript type definitions

### Architecture

```
VoiceMode Component
├── Canvas (Particle System)
│   ├── Three.js Scene
│   ├── WebGL Renderer
│   └── GLSL Shaders
├── Audio Manager
│   ├── Speech Recognition
│   ├── Speech Synthesis
│   └── Audio Analysis
└── UI Overlay
    ├── State Indicator
    ├── Transcript Display
    └── Control Buttons
```

## Voice States

- **Idle**: Waiting for input (cyan particles, small sphere)
- **Listening**: Recording user speech (red particles, expanded sphere)
- **Processing**: Processing user request (blue particles, contracting)
- **Speaking**: Playing AI response (green particles, pulsing sphere)

## Technical Details

### Particle System

- **Particle Count**: 8,000 particles
- **Distribution**: Fibonacci sphere for even distribution
- **Rendering**: GPU-accelerated with custom GLSL shaders
- **Animation**: Real-time state transitions with smooth interpolation

### Audio Processing

- **Speech Recognition**: Continuous recognition with interim results
- **Audio Context**: Real-time frequency analysis (FFT size: 256)
- **Frequency Updates**: 60 FPS audio data refresh
- **Voice Synthesis**: Configurable rate, pitch, and volume

### Browser Compatibility

- Requires Web Speech API support
- Tested on Chrome, Edge (webkit-prefixed APIs)
- Requires microphone permissions
- WebGL support required for visualizations

## Configuration

The voice mode can be configured via the `VoiceModeConfig` interface:

```typescript
interface VoiceModeConfig {
  onTextRecognized?: (text: string) => void;
  onSpeechComplete?: () => void;
  onError?: (error: Error) => void;
  language?: string;  // Default: 'en-US'
  continuous?: boolean;  // Default: true
}
```

## Performance

- Optimized for 60 FPS rendering
- GPU-accelerated particle calculations
- Smooth state transitions with easing
- Minimal CPU overhead with Web Audio API

## Future Enhancements

- [ ] Multi-language support
- [ ] Voice profile customization
- [ ] Conversation history in voice mode
- [ ] Advanced audio visualizations
- [ ] Wake word detection
- [ ] Offline speech recognition
- [ ] Custom voice selection

## Troubleshooting

### Microphone not working
- Check browser permissions
- Ensure HTTPS connection (required for getUserMedia)
- Check system microphone settings

### Speech recognition not working
- Verify Web Speech API support
- Check language setting matches your speech
- Ensure stable internet connection (cloud-based recognition)

### Poor performance
- Reduce particle count in `particle-system.ts`
- Lower canvas resolution
- Disable advanced visual effects
- Check GPU/WebGL support

## Credits

Built with:
- [Three.js](https://threejs.org/) - 3D graphics library
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) - Speech recognition and synthesis
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Audio analysis

