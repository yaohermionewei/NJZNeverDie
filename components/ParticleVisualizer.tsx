import React, { useRef, useEffect, useState } from 'react';

export interface ParticleParams {
  density: number; // Sampling step: 1 to ~10. Smaller = more particles.
  baseSize: number;
  amplitude: number;
  speed: number;
}

interface ParticleVisualizerProps {
  analyser: AnalyserNode | null;
  coverUrl: string;
  isPlaying: boolean;
  params: ParticleParams;
}

class Particle {
  // 3D Coordinates
  x: number;
  y: number;
  z: number;
  
  originX: number;
  originY: number;
  originZ: number;

  // For initial transition
  targetX: number;
  targetY: number;
  targetZ: number;
  
  color: { r: number, g: number, b: number };
  size: number;

  constructor(x: number, y: number, z: number, color: { r: number, g: number, b: number }, size: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    
    this.originX = x;
    this.originY = y;
    this.originZ = z; // Center depth

    this.targetX = x;
    this.targetY = y;
    this.targetZ = z;
    
    this.color = color;
    this.size = size;
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    // Perspective Projection
    // focalLength determines field of view
    const focalLength = 400;
    // Move camera back so we can see the particles (assuming z=0 is screen plane)
    // Or assume particles are at z=0 and camera is at z=-focalLength
    // Let's say camera is at z = -focalLength.
    // scale = focalLength / (focalLength + z)
    
    // We want particles to have some depth volume. 
    // Let's say standard z is 0. We displace z based on audio.
    
    const perspective = focalLength / (focalLength + this.z);
    
    // Don't draw if behind camera or too far
    if (perspective <= 0) return;

    const screenX = canvasWidth / 2 + (this.x - canvasWidth / 2) * perspective;
    const screenY = canvasHeight / 2 + (this.y - canvasHeight / 2) * perspective;
    const screenSize = this.size * perspective;

    // Depth Fade (Fog)
    // Map z to opacity. Closer (negative z) = more opaque? Or standard fog (further = fade)
    // Let's fade out as they get very close or very far.
    // Let's keep it simple: consistent alpha, maybe vary based on size.
    const alpha = Math.max(0.2, Math.min(1, perspective));

    // Draw core particle only (no glow)
    ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;
    // Draw circle for smoother look
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  update(audioData: Uint8Array, params: ParticleParams, width: number, height: number, transitionProgress: number) {
    // transitionProgress: 0 (initial image state) -> 1 (full particle state)
    // Actually, to show "image turns into particles", we might want:
    // State 0: Particles are tightly packed in 2D (z=0), forming the image exactly.
    // State 1: Particles are at their originX/Y/Z with audio reactivity.

    let force = 0;
    
    // Audio Mapping
    if (audioData.length > 0) {
        // Use spatial mapping: x position -> frequency bin
        const normalizedX = this.originX / width;
        // Map 0..1 to 0..binCount/2 (focus on bass/mids)
        const binIndex = Math.floor(normalizedX * audioData.length * 0.6);
        const energy = audioData[binIndex] || 0;
        force = (energy / 255) * params.amplitude;
    }

    // Time for movement
    const time = Date.now() * 0.001 * params.speed;

    // 3D Displacement Logic
    // 1. Z-axis "Bass Kick"
    // Move towards camera based on energy
    const zDisplacement = -force * 200; 
    
    // 2. XY Wave
    // Add sine wave motion based on time and position
    const waveX = Math.sin(this.originY * 0.02 + time) * force * 30;
    const waveY = Math.cos(this.originX * 0.02 + time) * force * 30;
    
    // Target positions (Full Effect)
    const destX = this.originX + waveX;
    const destY = this.originY + waveY;
    const destZ = this.originZ + zDisplacement;

    // Initial Image State (Flat, centered, scaled to look like the cover)
    // We initialized originX/Y based on a "Cloud" spread (displayScale = 6).
    // To look like the original image, we need them closer together (displayScale = 1 or similar).
    // Let's assume the "origin" values calculated in initParticles are the "exploded" state.
    // We need to calculate the "imploded" (image) state.
    // In initParticles, we used: px = startX + x * displayScale;
    // The "image" state would be: px_img = startX_img + x * 1;
    
    // BUT, simple interpolation of position is enough for a transition.
    // Let's say at progress 0, they act rigid. at progress 1, they move freely.
    
    // Actually, the user wants "Original Album Art -> Particles".
    // So we should start with them forming the image perfectly.
    
    if (transitionProgress < 1) {
       // Interpolate between "Perfect Image" and "Particle Cloud"
       // We don't have the "Perfect Image" coordinates stored in the particle currently, 
       // only the "Exploded" origin.
       // We can approximate or recalculate.
       
       // Let's rely on the fact that we want them to "explode" from the center.
       // Or better: simple fade in of reactivity?
       // User said: "Transform from original album art to particles".
       
       // To do this properly without complex re-mapping:
       // 1. Render the image normally (opacity 1 -> 0).
       // 2. Render particles (opacity 0 -> 1, position rigid -> chaotic).
       
       // Let's try a "force multiplier" approach.
       // Progress 0: force = 0, wave = 0, z = 0. They sit at origin.
       // But origin IS the exploded cloud in current logic.
       // We need to change init logic to support "Image State" vs "Cloud State".
    }

    // Current Logic: Just modulate the displacement by transition
    // If we want them to start as the image, we need to store the "Image Coordinates".
    // Let's assume for now we just transition the "Reactivity" and maybe "Spread".
    // If we can't easily change the init logic to store two sets of coordinates without refactor,
    // we can simulate it by scaling the "origin" coordinates towards the center during transition?
    
    // Let's try: 
    // At progress 0: x = originX / 6 (since we scaled by 6), y = originY / 6.
    // At progress 1: x = originX, y = originY.
    
    // Wait, originX includes startX offset. 
    // Let's refactor update slightly to handle this dynamic spread if we want a true "Image expansion".
    
    // For now, let's implement a "Explosion" transition:
    // Particles start at the center (or form the small image) and expand out.
    
    // Let's keep it simple and effective:
    // Smoothly transition from "No Movement (Static Cloud)" to "Full Movement".
    // And maybe scale the whole system up from 0.5 to 1?
    
    const ease = transitionProgress * (2 - transitionProgress); // Ease out
    
    this.x = this.originX + waveX * ease;
    this.y = this.originY + waveY * ease;
    this.z = this.originZ + zDisplacement * ease;
  }
}

const ParticleVisualizer: React.FC<ParticleVisualizerProps> = ({
  analyser,
  coverUrl,
  isPlaying,
  params
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Transition State
  // 0 to 1
  const transitionRef = useRef(0);

  // Load Image
  useEffect(() => {
    setImageLoaded(false);  // 重置状态，确保新图片加载后触发粒子重新初始化
    
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = coverUrl;
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
  }, [coverUrl]);

  // Init Particles
  useEffect(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const initParticles = () => {
      const img = imageRef.current!;
      const canvas = canvasRef.current!;
      
      // Create a temporary canvas to read pixel data
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Determine sampling resolution
      const sampleWidth = 150; 
      const scale = sampleWidth / img.width;
      const sampleHeight = Math.floor(img.height * scale);

      tempCanvas.width = sampleWidth;
      tempCanvas.height = sampleHeight;
      tempCtx.drawImage(img, 0, 0, sampleWidth, sampleHeight);

      const imageData = tempCtx.getImageData(0, 0, sampleWidth, sampleHeight);
      const data = imageData.data;

      const particles: Particle[] = [];
      const step = Math.max(1, Math.floor(params.density)); 

      // "Cloud" State (Final)
      // Responsive sizing:
      // - Use a target size based on the screen/canvas short edge, so small screens don't feel "too big".
      // - Clamp to avoid being tiny on very small screens or huge on large monitors.
      // NOTE: keep EXPANSION_MAX in sync with the maximum value of `expansion` in the render loop.
      const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
      const EXPANSION_MAX = 0.7;
      const minDim = Math.min(canvas.width, canvas.height);
      const targetDisplayedSize = clamp(minDim * 0.45, 140, 320);
      const baseSampleSize = Math.max(sampleWidth, sampleHeight);
      const displayScale = targetDisplayedSize / (baseSampleSize * EXPANSION_MAX);
      const cloudWidth = sampleWidth * displayScale;
      const cloudHeight = sampleHeight * displayScale;
      const startX = (canvas.width - cloudWidth) / 2;
      const startY = (canvas.height - cloudHeight) / 2;
      
      // "Image" State (Initial) - Tighter packing
      const imgScale = 2; // Smaller scale for the "original image" look
      const imgWidth = sampleWidth * imgScale;
      const imgHeight = sampleHeight * imgScale;
      const imgStartX = (canvas.width - imgWidth) / 2;
      const imgStartY = (canvas.height - imgHeight) / 2;

      for (let y = 0; y < sampleHeight; y += step) {
        for (let x = 0; x < sampleWidth; x += step) {
          const index = (y * sampleWidth + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const a = data[index + 3];

          if (a > 100) {
            // Final Position (Cloud)
            const z = (Math.random() - 0.5) * 200; 
            const px = startX + x * displayScale;
            const py = startY + y * displayScale;
            
            // Create particle
            const p = new Particle(
              px, 
              py, 
              z, 
              { r, g, b }, 
              params.baseSize
            );
            
            // Store "Image" state in the particle for transition logic if we wanted exact mapping
            // But to save memory/complexity, we can calculate it on the fly or just use a "spread" factor.
            // Let's store it on the instance if we modify the class.
            // For now, we will just use a global "Expansion" animation in the update loop.
            // To do "Image -> Cloud", we essentially just need to animate the "spread" or "scale" of the coordinates.
            
            // Let's re-use originX/Y as the FINAL destination.
            // In update(), we will interpolate based on transitionRef.
            
            particles.push(p);
          }
        }
      }
      particlesRef.current = particles;
      
      // Reset transition on init
      transitionRef.current = 0;
    };

    // Initial sizing logic before init
    if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
    }

    initParticles();
    
    // Use ResizeObserver for container
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (canvasRef.current) {
                canvasRef.current.width = entry.contentRect.width;
                canvasRef.current.height = entry.contentRect.height;
                initParticles();
            }
        }
    });
    
    if (canvasRef.current?.parentElement) {
        resizeObserver.observe(canvasRef.current.parentElement);
    }

    return () => resizeObserver.disconnect();
  }, [imageLoaded, params.density, params.baseSize]);

  // Animation Loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let audioData = new Uint8Array(0);
    if (analyser) {
      audioData = new Uint8Array(analyser.frequencyBinCount);
    }

    // Performance optimization: only sort particles every N frames
    let frameCount = 0;
    const SORT_INTERVAL = 5; // Sort every 5 frames (↓80% sorting overhead)

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      
      // Increment transition
      if (transitionRef.current < 1) {
        transitionRef.current += 0.01; // Speed of transition
        if (transitionRef.current > 1) transitionRef.current = 1;
      }
      
      const progress = transitionRef.current;
      // Easing for expansion
      // 0 -> 1
      // We want start state to be "Image" and end state to be "Cloud".
      // Image is essentially the same particles but with smaller spread and z=0.
      
      // Calculate an "expansion factor"
      // Start at 0.5 (compact image), end at 0.7 (slightly expanded cloud)
      // Keep it closer to the original image size to maintain recognizability
      const expansion = 0.5 + (0.2 * (progress * (2 - progress))); // Ease out
      
      if (analyser) {
        analyser.getByteFrequencyData(audioData);
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Update all particles
      particlesRef.current.forEach(p => {
        // We temporarily modify position logic here to include expansion
        // But Particle.update writes to this.x/y/z directly. 
        // We should probably modify update() to accept expansion factor?
        // Or just do it manually here:
        
        // 1. Calculate Reactivity (Full magnitude)
        // Refactored logic inline or inside update?
        // Let's use p.update() but strictly for the "Full Cloud" behavior, 
        // then manually override x/y/z for the transition effect?
        // No, update() calculates based on originX/Y.
        // If we want to scale origin, we need to act before update?
        // No, origin is constant.
        
        // Let's modify update to take 'scale' factor.
        
        // BUT simpler:
        // Just let update() do its thing (calculating based on full spread).
        // Then interpolate the result towards the center?
        
        p.update(audioData, params, canvas.width, canvas.height, progress);
        
        // Apply Expansion Transition
        // Interpolate current position (p.x, p.y, p.z) towards Center (cx, cy, 0)
        // based on 'expansion'.
        // Actually, 'expansion' IS the interpolation factor if we view it as scaling.
        
        // p.x = cx + (p.x - cx) * expansion;
        // p.y = cy + (p.y - cy) * expansion;
        // p.z = p.z * expansion; // Flatten Z at start
        
        // Note: this overrides the p.x/y/z set in update(), which is fine for display.
        // update() sets the "Target Cloud Position + Audio Displacement".
        // We scale that whole coordinate system down to look like a small image.
        
        p.x = cx + (p.x - cx) * expansion;
        p.y = cy + (p.y - cy) * expansion;
        p.z = p.z * expansion;
      });

      // Only sort every SORT_INTERVAL frames (performance optimization)
      // Visual impact is negligible since particle z-positions change slowly
      if (frameCount % SORT_INTERVAL === 0) {
        particlesRef.current.sort((a, b) => b.z - a.z);
      }

      particlesRef.current.forEach(p => {
        p.draw(ctx, canvas.width, canvas.height);
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    };
  }, [analyser, params]); 

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <canvas 
        ref={canvasRef}
        className="block w-full h-full"
      />
    </div>
  );
};

export default ParticleVisualizer;
