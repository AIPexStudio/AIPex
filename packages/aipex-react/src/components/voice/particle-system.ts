import * as THREE from "three";
import { vertexShader, fragmentShader } from "./shaders";
import type { VoiceState } from "./types";
import { VOICE_MODE_CONFIG } from "./config";

/**
 * WebGL-based particle system for voice mode visualization
 */
export class ParticleSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points;
  private uniforms!: {
    uTime: THREE.IUniform<number>;
    uState: THREE.IUniform<number>;
    uRadius: THREE.IUniform<number>;
    uFrequency: THREE.IUniform<number>;
    uPointSize: THREE.IUniform<number>;
  };
  private animationId: number | null = null;
  private startTime: number;
  private targetRadius: number = 2.2;
  private currentRadius: number = 2.2;

  constructor(canvas: HTMLCanvasElement) {
    this.startTime = Date.now();

    // Setup scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(
      VOICE_MODE_CONFIG.visual.backgroundColor,
    );

    // Get canvas dimensions (fallback to window size if canvas size is 0)
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;

    // Setup camera - closer for better cloud view
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.z = 7; // Distance for optimal viewing

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: VOICE_MODE_CONFIG.visual.antialias,
      alpha: true,
    });

    // Set renderer size and pixel ratio
    this.renderer.setSize(width, height, false); // false = don't update canvas style
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, VOICE_MODE_CONFIG.visual.maxPixelRatio),
    );

    // Create particles
    this.uniforms = {
      uTime: { value: 0 },
      uState: { value: 0 }, // 0=idle, 1=listening, 2=speaking
      uRadius: { value: 3.0 },
      uFrequency: { value: 0 },
      uPointSize: { value: VOICE_MODE_CONFIG.particles.pointSize },
    };

    this.particles = this.createParticles();
    this.scene.add(this.particles);

    // Start animation
    this.animate();

    // Handle window resize
    window.addEventListener("resize", this.handleResize);
  }

  private createParticles(): THREE.Points {
    const particleCount = VOICE_MODE_CONFIG.particles.count;
    const geometry = new THREE.BufferGeometry();

    // Create initial positions on a sphere
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = new Float32Array(particleCount * 3);
    const randomOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Fibonacci sphere distribution for even distribution
      const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(phi);

      const i3 = i * 3;
      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      initialPositions[i3] = x;
      initialPositions[i3 + 1] = y;
      initialPositions[i3 + 2] = z;

      randomOffsets[i] = Math.random();
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute(
      "initialPosition",
      new THREE.BufferAttribute(initialPositions, 3),
    );
    geometry.setAttribute(
      "randomOffset",
      new THREE.BufferAttribute(randomOffsets, 1),
    );

    // Create material with shaders
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });

    return new THREE.Points(geometry, material);
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    // Update time
    const elapsed = (Date.now() - this.startTime) / 1000;
    this.uniforms.uTime.value = elapsed;

    // Smooth radius transition
    this.currentRadius +=
      (this.targetRadius - this.currentRadius) * 0.08;
    this.uniforms.uRadius.value = this.currentRadius;

    // Very slow rotation for subtle movement
    this.particles.rotation.y = elapsed * 0.05;

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  };

  public handleResize = () => {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setState(state: VoiceState) {
    // Update uniform with smaller radius values to fit in canvas
    switch (state) {
      case "idle":
        this.uniforms.uState.value = 0;
        this.targetRadius = 1.5;
        break;
      case "listening":
        this.uniforms.uState.value = 1;
        this.targetRadius = 1.8;
        break;
      case "speaking":
        this.uniforms.uState.value = 2;
        this.targetRadius = 1.6;
        break;
      case "processing":
        this.uniforms.uState.value = 0;
        this.targetRadius = 1.4;
        break;
    }
  }

  public updateFrequency(frequency: number) {
    // Normalize frequency to 0-1 range
    this.uniforms.uFrequency.value = Math.min(Math.max(frequency, 0), 1);
  }

  public getDebugInfo() {
    return {
      isAnimating: this.animationId !== null,
      particleCount: this.particles.geometry.attributes.position?.count ?? 0,
      currentRadius: this.currentRadius,
      targetRadius: this.targetRadius,
      rendererSize: {
        width: this.renderer.domElement.width,
        height: this.renderer.domElement.height,
      },
      cameraPosition: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
      },
    };
  }

  public destroy() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener("resize", this.handleResize);

    if (this.particles) {
      this.particles.geometry.dispose();
      if (this.particles.material instanceof THREE.Material) {
        this.particles.material.dispose();
      }
    }

    this.renderer.dispose();
  }
}
