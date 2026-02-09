/**
 * Voice mode configuration options
 */

export const VOICE_MODE_CONFIG = {
  // Particle system settings
  particles: {
    count: 1000, // More particles for dense cloud effect
    pointSize: 1.0, // Slightly larger for clear visibility of each particle
    minRadius: 0.8, // Minimum sphere radius
    maxRadius: 1.8, // Maximum sphere radius
  },

  // Animation settings
  animation: {
    rotationSpeed: 0.1, // Rotation speed multiplier
    transitionSpeed: 0.05, // State transition smoothing (0-1)
    pulseSpeed: 3.0, // Pulsing animation speed
  },

  // Audio settings
  audio: {
    fftSize: 256, // FFT size for frequency analysis
    smoothing: 0.8, // Audio smoothing (0-1)
    threshold: 0.01, // Audio activity threshold
  },

  // Speech recognition settings
  speech: {
    language: "en-US", // Default language
    continuous: false, // Continuous recognition
    interimResults: true, // Show interim results
  },

  // Speech synthesis settings
  synthesis: {
    rate: 1.0, // Speech rate (0.1-10)
    pitch: 1.0, // Speech pitch (0-2)
    volume: 1.0, // Speech volume (0-1)
  },

  // Visual settings
  visual: {
    backgroundColor: 0x0a0a0a, // Background color
    blending: "additive", // Particle blending mode
    antialias: true, // Enable antialiasing
    maxPixelRatio: 2, // Maximum pixel ratio
  },

  // Performance presets
  presets: {
    low: {
      particleCount: 3000,
      fftSize: 128,
      maxPixelRatio: 1,
    },
    medium: {
      particleCount: 8000,
      fftSize: 256,
      maxPixelRatio: 2,
    },
    high: {
      particleCount: 15000,
      fftSize: 512,
      maxPixelRatio: 2,
    },
  },
};

/**
 * Color schemes for different states
 */
export const COLOR_SCHEMES = {
  idle: {
    primary: [0.6, 0.9, 1.0], // Bright cyan
    secondary: [0.3, 0.8, 1.0], // Vivid cyan
  },
  listening: {
    primary: [1.0, 0.75, 0.3], // Bright orange (detecting input)
    secondary: [1.0, 0.5, 0.0], // Vivid orange
  },
  speaking: {
    primary: [0.5, 1.0, 0.5], // Bright lime green (audio output)
    secondary: [0.2, 1.0, 0.3], // Vivid green
  },
  processing: {
    primary: [0.6, 0.9, 1.0], // Bright cyan (same as idle)
    secondary: [0.3, 0.8, 1.0], // Vivid cyan
  },
};

/**
 * Helper function to get performance preset
 */
export function getPerformancePreset(
  level: "low" | "medium" | "high" = "medium",
) {
  return VOICE_MODE_CONFIG.presets[level];
}

/**
 * Helper function to detect device performance
 */
export function detectPerformanceLevel(): "low" | "medium" | "high" {
  // Check for mobile devices
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  if (isMobile) {
    return "low";
  }

  // Check for hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;

  if (cores >= 8) {
    return "high";
  } else if (cores >= 4) {
    return "medium";
  } else {
    return "low";
  }
}
