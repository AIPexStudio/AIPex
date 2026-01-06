// Vertex shader for particle system
export const vertexShader = `
  uniform float uTime;
  uniform float uState; // 0=idle, 1=listening, 2=speaking
  uniform float uRadius;
  uniform float uFrequency;
  uniform float uPointSize;
  
  attribute vec3 initialPosition;
  attribute float randomOffset;
  
  varying float vDistance;
  varying float vState;
  varying float vAlpha;
  
  // Simplex noise for organic movement
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) { 
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i); 
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0)) 
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
            
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    vState = uState;
    
    // Normalized position on sphere
    vec3 pos = normalize(initialPosition);
    
    // Base radius with breathing effect
    float breathe = sin(uTime * 0.8) * 0.1;
    float baseRadius = uRadius + breathe;
    
    // Audio reactivity
    float audioInfluence = uFrequency * 0.3;
    
    // Organic noise displacement
    float noiseScale = 0.5;
    float noiseTime = uTime * 0.2;
    float noise = snoise(pos * noiseScale + vec3(noiseTime));
    
    // State-based effects with controlled dispersion
    float displacement = 0.0;
    float radiusMultiplier = 1.0;
    
    if (uState < 0.5) {
      // Idle - subtle cloud movement with audio reactivity
      displacement = noise * 0.2 + sin(uTime * 0.5 + randomOffset * 6.28) * 0.08 + audioInfluence * 0.15;
      radiusMultiplier = 0.9 + randomOffset * 0.15 + audioInfluence * 0.2;
    } else if (uState < 1.5) {
      // Listening - moderate expansion with strong audio reactivity
      displacement = noise * 0.3 + audioInfluence * 0.3;
      radiusMultiplier = 1.1 + audioInfluence * 0.5 + randomOffset * 0.1;
    } else {
      // Speaking - controlled pulsing with audio reactivity
      float pulse = sin(uTime * 4.0 + randomOffset * 6.28) * 0.5 + 0.5;
      displacement = noise * 0.25 + pulse * audioInfluence * 0.2;
      radiusMultiplier = 0.95 + pulse * 0.2 + audioInfluence * 0.3 + randomOffset * 0.08;
    }
    
    // Apply displacement
    pos += pos * displacement;
    pos = normalize(pos);
    
    // Final position
    float finalRadius = baseRadius * radiusMultiplier;
    pos *= finalRadius;
    
    // Calculate distance from center for effects
    vDistance = length(pos) / finalRadius;
    
    // Alpha based on distance from center (cloud-like gradient)
    // More visible at edges for cloud effect
    vAlpha = 0.3 + 0.7 * (1.0 - smoothstep(0.0, 1.2, vDistance));
    
    // Transform position
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    // Point size - consistent size for distinct particles
    float depth = -mvPosition.z;
    float sizeMultiplier = 1.0 + audioInfluence * 0.5;
    // Scale for distinct, visible particles
    gl_PointSize = (uPointSize * 90.0 / max(depth, 1.0)) * sizeMultiplier;
    
    // Clamp size for consistent appearance
    gl_PointSize = clamp(gl_PointSize, 2.0, 8.0);
  }
`;

// Fragment shader for particle system
export const fragmentShader = `
  uniform float uState;
  uniform float uFrequency;
  
  varying float vDistance;
  varying float vState;
  varying float vAlpha;
  
  void main() {
    // Create sharp circular points - no soft glow
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center) * 2.0;
    
    // Sharp edge for distinct particles
    if (dist > 1.0) {
      discard; // Cut off particles at edge for sharp circles
    }
    
    // Strong intensity for bright particles
    float intensity = 1.0 - smoothstep(0.5, 1.0, dist);
    intensity = pow(intensity, 1.2); // Brighter particles
    
    // State-based colors - brighter and more vibrant
    vec3 color;
    vec3 coreColor;
    vec3 edgeColor;
    float audioBoost = uFrequency * 0.5;
    
    if (vState < 0.5) {
      // Idle - bright cyan/blue
      coreColor = vec3(0.6, 0.9, 1.0); // Bright cyan
      edgeColor = vec3(0.3, 0.8, 1.0); // Vivid cyan
    } else if (vState < 1.5) {
      // Listening (detecting input) - bright orange
      coreColor = vec3(1.0, 0.75, 0.3); // Bright orange
      edgeColor = vec3(1.0, 0.5, 0.0); // Vivid orange
      intensity *= (1.0 + audioBoost * 0.5);
    } else {
      // Speaking (audio output) - bright green
      coreColor = vec3(0.5, 1.0, 0.5); // Bright lime green
      edgeColor = vec3(0.2, 1.0, 0.3); // Vivid green
      intensity *= (1.0 + audioBoost * 0.6);
    }
    
    // Mix colors based on distance from particle center
    color = mix(coreColor, edgeColor, dist);
    
    // Very high brightness for super bright particles
    float brightnessMultiplier = 2.5 + audioBoost * 0.8;
    color *= brightnessMultiplier;
    
    // Less fade for brighter overall appearance
    float centerFade = mix(0.85, 0.5, vDistance);
    
    // Very strong alpha for extremely bright, distinct particles
    float alpha = intensity * centerFade * vAlpha;
    
    // Much higher alpha for super bright particles
    alpha = clamp(alpha * 2.0, 0.0, 1.0);
    
    // High minimum alpha - every particle should be clearly visible
    alpha = max(alpha, 0.35);
    
    // Output with additive blending for bright particles
    gl_FragColor = vec4(color, alpha);
  }
`;
