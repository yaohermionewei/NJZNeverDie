import React, { useRef, useEffect, useCallback } from 'react';

// Import character images (WebP optimized)
// Blue character - animated sequence (5 frames)
import blue1 from '../NJZPowerpuffGirls/blue1.webp';
import blue2 from '../NJZPowerpuffGirls/blue2.webp';
import blue3 from '../NJZPowerpuffGirls/blue3.webp';
import blue4 from '../NJZPowerpuffGirls/blue4.webp';
import blue5 from '../NJZPowerpuffGirls/blue5.webp';
// Pink character - animated sequence (5 frames)
import pink1 from '../NJZPowerpuffGirls/pink1.webp';
import pink2 from '../NJZPowerpuffGirls/pink2.webp';
import pink3 from '../NJZPowerpuffGirls/pink3.webp';
import pink4 from '../NJZPowerpuffGirls/pink4.webp';
import pink5 from '../NJZPowerpuffGirls/pink5.webp';
// Green character - animated sequence (5 frames)
import green1 from '../NJZPowerpuffGirls/green1.webp';
import green2 from '../NJZPowerpuffGirls/green2.webp';
import green3 from '../NJZPowerpuffGirls/green3.webp';
import green4 from '../NJZPowerpuffGirls/green4.webp';
import green5 from '../NJZPowerpuffGirls/green5.webp';
// Yellow character - animated sequence (5 frames)
import yellow1 from '../NJZPowerpuffGirls/yellow1.webp';
import yellow2 from '../NJZPowerpuffGirls/yellow2.webp';
import yellow3 from '../NJZPowerpuffGirls/yellow3.webp';
import yellow4 from '../NJZPowerpuffGirls/yellow4.webp';
import yellow5 from '../NJZPowerpuffGirls/yellow5.webp';
// Purple character - animated sequence (5 frames)
import purple1 from '../NJZPowerpuffGirls/purple1.webp';
import purple2 from '../NJZPowerpuffGirls/purple2.webp';
import purple3 from '../NJZPowerpuffGirls/purple3.webp';
import purple4 from '../NJZPowerpuffGirls/purple4.webp';
import purple5 from '../NJZPowerpuffGirls/purple5.webp';

// Gingerbread man - animated sequence (7 frames) for background
import gingerman1 from '../NJZPowerpuffGirls/gingerman1.webp';
import gingerman2 from '../NJZPowerpuffGirls/gingerman2.webp';
import gingerman3 from '../NJZPowerpuffGirls/gingerman3.webp';
import gingerman4 from '../NJZPowerpuffGirls/gingerman4.webp';
import gingerman5 from '../NJZPowerpuffGirls/gingerman5.webp';
import gingerman6 from '../NJZPowerpuffGirls/gingerman6.webp';
import gingerman7 from '../NJZPowerpuffGirls/gingerman7.webp';

// Skating rabbit - animated sequence (6 frames)
import rabbit1 from '../NJZPowerpuffGirls/rabbit1.webp';
import rabbit2 from '../NJZPowerpuffGirls/rabbit2.webp';
import rabbit3 from '../NJZPowerpuffGirls/rabbit3.webp';
import rabbit4 from '../NJZPowerpuffGirls/rabbit4.webp';
import rabbit5 from '../NJZPowerpuffGirls/rabbit5.webp';
import rabbit6 from '../NJZPowerpuffGirls/rabbit6.webp';

// Deer - animated sequence (6 frames)
import deer1 from '../NJZPowerpuffGirls/deer1.webp';
import deer2 from '../NJZPowerpuffGirls/deer2.webp';
import deer3 from '../NJZPowerpuffGirls/deer3.webp';
import deer4 from '../NJZPowerpuffGirls/deer4.webp';
import deer5 from '../NJZPowerpuffGirls/deer5.webp';
import deer6 from '../NJZPowerpuffGirls/deer6.webp';

// Import background images for parallax layers (optimized WebP)
import bottom1 from '../NJZPowerpuffGirls/bottom1.webp';
import bottom2 from '../NJZPowerpuffGirls/bottom2.webp';
import bottom3 from '../NJZPowerpuffGirls/bottom3.webp';
import middle1 from '../NJZPowerpuffGirls/middle1.webp';
import middle2 from '../NJZPowerpuffGirls/middle2.webp';
import middle3 from '../NJZPowerpuffGirls/middle3.webp';
import topImg from '../NJZPowerpuffGirls/top.webp';

// Debug flag - set to true to see console logs
const DEBUG = false;

interface PowerpuffVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  params: {
    bounceStrength: number;
    sensitivity: number;
    sceneSpeed: number;
    friction: number;
  };
  lyricLine?: string;
  songInfo?: string;
}

// Background layer configuration
const BOTTOM_IMAGES = [bottom1, bottom2, bottom3];
const MIDDLE_IMAGES = [middle1, middle2, middle3];
const TOP_IMAGES = [topImg];

// Parallax scroll speeds (pixels per frame)
const BOTTOM_SPEED = 0.8;  // Far background (slowest)
const MIDDLE_SPEED = 1.5;  // Medium speed
const TOP_SPEED = 2.0;     // Foreground (fastest)

// Gingerbread man configuration
const GINGERMAN_FRAMES = [gingerman1, gingerman2, gingerman3, gingerman4, gingerman5, gingerman6, gingerman7];
const GINGERMAN_FRAME_DURATION = 20; // Frame switch speed
const GINGERMAN_HEIGHT_RATIO = 0.455; // Height as ratio of screen height (1.3x)

// Skating rabbit configuration (sequence: 1-2-3-4-5-6)
const RABBIT_FRAMES = [rabbit1, rabbit2, rabbit3, rabbit4, rabbit5, rabbit6];
const RABBIT_FRAME_DURATION = 15; // Frame switch speed
const RABBIT_HEIGHT_RATIO = 0.875; // Height as ratio of screen height (2.5x, was 0.35 base)

// Deer configuration (sequence: 1-2-3-4-5-6)
const DEER_FRAMES = [deer1, deer2, deer3, deer4, deer5, deer6];
const DEER_FRAME_DURATION = 15; // Frame switch speed
const DEER_HEIGHT_RATIO = 0.65; // Between gingerman (0.455) and rabbit (0.875)

// Animation settings
const FRAME_DURATION = 12; // Switch frame every N render frames (~200ms at 60fps)

// Time-step configuration (frame-rate independent)
// We align dt scaling to your current desktop feel (ProMotion typically ~120fps).
const REF_FPS = 120;
const MAX_DT = 1 / 30; // clamp to avoid huge jumps on background/tab-switch or frame spikes

// Character configuration (X-shape formation)
// Positioned more towards right
const CHARACTERS = [
  // Top Left - Blue (animated)
  { 
    name: 'blue', 
    frames: [blue1, blue2, blue3, blue4, blue5], // Animated sequence
    isAnimated: true,
    trailColor: '#8AAEE0',
    freqStart: 40,
    freqEnd: 200,
    extraBoost: 1.5, // Reduced from 2.5
    baseX: 0.38,
    baseY: 0.10,
  },
  // Top Right - Green (animated)
  { 
    name: 'green', 
    frames: [green1, green2, green3, green4, green5],
    isAnimated: true,
    trailColor: '#A2E48E',
    freqStart: 1000,
    freqEnd: 4000,
    extraBoost: 1.0,
    baseX: 0.63,
    baseY: 0.10,
  },
  // Center - Pink (animated)
  { 
    name: 'pink', 
    frames: [pink1, pink2, pink3, pink4, pink5],
    isAnimated: true,
    trailColor: '#D782B7',
    freqStart: 200,
    freqEnd: 1500,
    extraBoost: 1.0,
    baseX: 0.505,
    baseY: 0.25,
  },
  // Bottom Left - Yellow (animated)
  { 
    name: 'yellow', 
    frames: [yellow1, yellow2, yellow3, yellow4, yellow5],
    isAnimated: true,
    trailColor: '#F6C263',
    freqStart: 80,
    freqEnd: 400,
    extraBoost: 1.5,
    baseX: 0.38,
    baseY: 0.40,
  },
  // Bottom Right - Purple (animated)
  { 
    name: 'purple', 
    frames: [purple1, purple2, purple3, purple4, purple5],
    isAnimated: true,
    trailColor: '#A67EDE',
    freqStart: 3000,
    freqEnd: 12000,
    extraBoost: 1.2,
    baseX: 0.63,
    baseY: 0.40,
  },
];

// Background color
const BG_COLOR = '#65CCF1';

// Dynamic baseline parameters
const BASELINE_ATTACK = 0.003;  // Slower baseline rise (was 0.005)
const BASELINE_DECAY = 0.001;   // Slower baseline fall (was 0.002)
const DELTA_AMPLIFICATION = 3.0; // Reduced sensitivity (was 4.0)
const MAX_DISPLAY_VALUE = 0.85;

// Spring physics parameters - tuned for heavy, drag-like movement
const SPRING_STIFFNESS = 0.015;  // Smooth, drag-like response
const SPRING_DAMPING = 0.97;     // High damping, minimal oscillation

// Character size (pixels)
const CHAR_SIZE = 80;

// Trail height (pixels)
const TRAIL_HEIGHT = 35; // Slightly increased

// Base trail length (always visible even without movement)
const BASE_TRAIL_LENGTH = 120; // Minimum trail length in pixels (increased)

// Max movement distance as percentage of screen width
const MAX_MOVE_DIST = 0.20; // Increased movement range

// Snow particle configuration (8-bit pixel style, night theme)
const SNOW_COUNT = 80;           // Number of snowflakes
const SNOW_COLORS = [
  'rgba(255, 255, 255, 0.9)',    // Bright white
  'rgba(220, 235, 255, 0.8)',    // Soft blue-white
  'rgba(200, 220, 255, 0.7)',    // Pale blue
  'rgba(180, 200, 240, 0.6)',    // Dim blue (distant)
];
const SNOW_SIZES = [2, 3, 4, 5]; // Pixel sizes (8-bit style: small squares)
const SNOW_SPEED_Y = { min: 0.5, max: 2.0 };  // Vertical fall speed
const SNOW_SPEED_X = { min: -0.3, max: 0.3 }; // Horizontal drift
const SNOW_SWAY_AMOUNT = 0.5;    // Gentle horizontal sway

// Trail star configuration (pixel sparkles in character trails)
const TRAIL_STARS_PER_CHARACTER = 3; // Number of hearts per character trail (sparse)
const TRAIL_STAR_SIZES = [12, 14, 16, 18, 20]; // Larger heart sizes
const TRAIL_STAR_SPEED = 1.2; // Speed moving left
const TRAIL_STAR_SHRINK_RATE = 0.02; // How fast stars shrink
const TRAIL_STAR_FADE_RATE = 0.015; // How fast stars fade

// Trail star type
interface TrailStar {
  relativeX: number; // 0-1 position within trail (1 = near character, 0 = left edge)
  relativeY: number; // -0.5 to 0.5 offset from center
  size: number;
  baseSize: number; // Original size for respawn
  opacity: number;
  speed: number; // Individual speed variation
}

// Snowflake type
interface Snowflake {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  color: string;
  swayOffset: number;  // For gentle swaying motion
}

const PowerpuffVisualizer: React.FC<PowerpuffVisualizerProps> = ({ analyser, isPlaying, params, lyricLine, songInfo }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  // Character images: 2D array [characterIndex][frameIndex]
  const imagesRef = useRef<HTMLImageElement[][]>([]);
  const imagesLoadedRef = useRef<boolean>(false);
  
  // Frame animation state for each character
  const frameIndicesRef = useRef<number[]>(CHARACTERS.map(() => 0));
  const frameTimerRef = useRef<number>(0);
  
  // Background images refs
  const bottomImagesRef = useRef<HTMLImageElement[]>([]);
  const middleImagesRef = useRef<HTMLImageElement[]>([]);
  const topImagesRef = useRef<HTMLImageElement[]>([]);
  const bgImagesLoadedRef = useRef<boolean>(false);
  
  // Gingerbread man refs
  const gingermanImagesRef = useRef<HTMLImageElement[]>([]);
  const gingermanLoadedRef = useRef<boolean>(false);
  const gingermanFrameRef = useRef<number>(0);
  const gingermanTimerRef = useRef<number>(0);
  const gingermanXRef = useRef<number>(0); // X position for scrolling
  
  // Skating rabbit refs
  const rabbitImagesRef = useRef<HTMLImageElement[]>([]);
  const rabbitLoadedRef = useRef<boolean>(false);
  const rabbitFrameRef = useRef<number>(0);
  const rabbitTimerRef = useRef<number>(0);
  
  // Deer refs
  const deerImagesRef = useRef<HTMLImageElement[]>([]);
  const deerLoadedRef = useRef<boolean>(false);
  const deerFrameRef = useRef<number>(0);
  const deerTimerRef = useRef<number>(0);
  // Deer frame aspect ratios can vary; using a stable "nominal width" avoids visible x-jumps when frames switch.
  const deerMaxAspectRatioRef = useRef<number>(0);
  
  // Parallax scroll offsets (pixels)
  const bottomOffsetRef = useRef<number>(0);
  const middleOffsetRef = useRef<number>(0);
  const topOffsetRef = useRef<number>(0);
  
  // Snow particles
  const snowflakesRef = useRef<Snowflake[]>([]);
  const snowInitializedRef = useRef<boolean>(false);
  
  // Trail stars for each character (2D array: [characterIndex][starIndex])
  const trailStarsRef = useRef<TrailStar[][]>([]);
  const trailStarsInitializedRef = useRef<boolean>(false);
  
  // Dynamic baseline for each frequency band
  const baselineRef = useRef<number[]>([0, 0, 0, 0, 0]);
  
  // Current display values (what we render)
  const displayValuesRef = useRef<number[]>([0, 0, 0, 0, 0]);
  
  // Velocity for spring physics
  const velocityRef = useRef<number[]>([0, 0, 0, 0, 0]);
  
  // Audio data buffer
  const audioDataRef = useRef<Uint8Array | null>(null);
  
  // Frame counter for debug
  const frameCountRef = useRef(0);

  // Latest overlay texts (avoid re-starting animation loop on every lyric change)
  const lyricLineRef = useRef<string>('');
  const songInfoRef = useRef<string>('');
  
  // Cache for lyric line wrapping (avoid recalculating every frame)
  const wrapCacheRef = useRef<{ text: string; width: number; lines: string[] } | null>(null);

  // === Mid-layer lyric overlay (between bottom and middle layers) ===
  // Keep display always visible (regardless of App UI hidden state) and fixed in screen space.
  // We implement a simple "fade out -> swap -> fade in" transition when lyric text changes.
  const overlayRef = useRef<{
    currentLyric: string;
    nextLyric: string | null;
    phase: 'idle' | 'fadeOut' | 'fadeIn';
    alpha: number; // 0..1 for currentLyric render alpha multiplier
  }>({
    currentLyric: '',
    nextLyric: null,
    phase: 'idle',
    alpha: 1,
  });

  const lastLyricPropRef = useRef<string>('');

  useEffect(() => {
    lyricLineRef.current = (lyricLine ?? '').trim();
  }, [lyricLine]);

  useEffect(() => {
    songInfoRef.current = (songInfo ?? '').trim();
  }, [songInfo]);

  // Load all character images (including animation frames)
  useEffect(() => {
    const images: HTMLImageElement[][] = [];
    let totalToLoad = 0;
    let loadedCount = 0;

    // Count total images to load
    CHARACTERS.forEach(char => {
      totalToLoad += char.frames.length;
    });

    const onLoad = () => {
      loadedCount++;
      if (loadedCount === totalToLoad) {
        imagesLoadedRef.current = true;
      }
    };

    // Load all frames for each character
    CHARACTERS.forEach((char, charIndex) => {
      images[charIndex] = [];
      char.frames.forEach((frameSrc, frameIndex) => {
        const img = new Image();
        img.src = frameSrc;
        img.onload = onLoad;
        images[charIndex][frameIndex] = img;
      });
    });

    imagesRef.current = images;
  }, []);

  // Load all background images for parallax layers
  useEffect(() => {
    let totalToLoad = BOTTOM_IMAGES.length + MIDDLE_IMAGES.length + TOP_IMAGES.length;
    let loadedCount = 0;

    const onLoad = () => {
      loadedCount++;
      if (loadedCount === totalToLoad) {
        bgImagesLoadedRef.current = true;
      }
    };

    // Load bottom layer images
    const bottomImgs: HTMLImageElement[] = [];
    BOTTOM_IMAGES.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = onLoad;
      bottomImgs[i] = img;
    });
    bottomImagesRef.current = bottomImgs;

    // Load middle layer images
    const middleImgs: HTMLImageElement[] = [];
    MIDDLE_IMAGES.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = onLoad;
      middleImgs[i] = img;
    });
    middleImagesRef.current = middleImgs;

    // Load top layer images
    const topImgs: HTMLImageElement[] = [];
    TOP_IMAGES.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = onLoad;
      topImgs[i] = img;
    });
    topImagesRef.current = topImgs;
  }, []);

  // Load gingerbread man animation frames
  useEffect(() => {
    let loadedCount = 0;
    const gingermanImgs: HTMLImageElement[] = [];
    
    GINGERMAN_FRAMES.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === GINGERMAN_FRAMES.length) {
          gingermanLoadedRef.current = true;
        }
      };
      gingermanImgs[i] = img;
    });
    
    gingermanImagesRef.current = gingermanImgs;
  }, []);

  // Load skating rabbit animation frames
  useEffect(() => {
    let loadedCount = 0;
    const rabbitImgs: HTMLImageElement[] = [];
    
    // Load all 6 frames
    RABBIT_FRAMES.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === RABBIT_FRAMES.length) {
          rabbitLoadedRef.current = true;
        }
      };
      rabbitImgs[i] = img;
    });
    
    rabbitImagesRef.current = rabbitImgs;
  }, []);

  // Load deer animation frames
  useEffect(() => {
    let loadedCount = 0;
    const deerImgs: HTMLImageElement[] = [];
    
    DEER_FRAMES.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === DEER_FRAMES.length) {
          deerLoadedRef.current = true;
          // Compute max aspect ratio once all frames are loaded (stabilizes positioning/clamping across frames).
          let maxAR = 0;
          for (const frame of deerImgs) {
            const ar = frame.height > 0 ? frame.width / frame.height : 0;
            if (ar > maxAR) maxAR = ar;
          }
          deerMaxAspectRatioRef.current = maxAR;
        }
      };
      deerImgs[i] = img;
    });

    deerImagesRef.current = deerImgs;
  }, []);

  // Convert frequency (Hz) to FFT bin index
  const freqToBin = useCallback((freq: number, sampleRate: number, fftSize: number): number => {
    const binWidth = sampleRate / fftSize;
    return Math.floor(freq / binWidth);
  }, []);

  // Get energy for a frequency range
  const getFrequencyRangeEnergy = useCallback((
    dataArray: Uint8Array<ArrayBufferLike>,
    startFreq: number,
    endFreq: number,
    sampleRate: number,
    fftSize: number
  ): number => {
    const startBin = freqToBin(startFreq, sampleRate, fftSize);
    const endBin = Math.min(freqToBin(endFreq, sampleRate, fftSize), dataArray.length - 1);
    
    if (startBin >= endBin) return 0;

    let sum = 0;
    for (let i = startBin; i <= endBin; i++) {
      sum += dataArray[i];
    }
    
    // Normalize to 0-1
    return (sum / (endBin - startBin + 1)) / 255;
  }, [freqToBin]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // Important: reset transform before scaling.
      // In React 18 StrictMode (dev), effects can run twice on mount; without reset,
      // repeated ctx.scale() accumulates and can push all drawings off-screen (appears as blank).
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Get audio context sample rate
    const sampleRate = analyser?.context?.sampleRate || 44100;
    const fftSize = analyser?.fftSize || 2048;

    // ---- dt core (frame-rate independent) ----
    let lastNow = performance.now();
    let tSec = 0; // accumulated seconds (replaces Date.now() usage for stable phase)

    const resetClock = () => {
      lastNow = performance.now();
    };
    const onVisibilityChange = () => {
      // Prevent a huge dt on the first frame after returning to foreground
      if (!document.hidden) resetClock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Helper function to draw a parallax layer with seamless looping
    const drawParallaxLayer = (
      images: HTMLImageElement[],
      offset: number,
      yPosition: number,  // Where to position the layer vertically (0 = top, can be negative)
      fillHeight: number, // Height to scale images to
      canvasWidth: number // Canvas width for bounds checking
    ) => {
      if (images.length === 0 || !images[0].complete) return;

      // Calculate total width of all images in sequence
      const aspectRatios = images.map(img => img.width / img.height);
      const scaledWidths = aspectRatios.map(ratio => ratio * fillHeight);
      const totalSequenceWidth = scaledWidths.reduce((sum, w) => sum + w, 0);

      // Normalize offset to loop within sequence
      const normalizedOffset = offset % totalSequenceWidth;

      // We need to draw enough images to cover the screen
      // Start from a position that accounts for the offset
      let currentX = -normalizedOffset;

      // Keep drawing until we've covered the entire width
      while (currentX < canvasWidth) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const imgWidth = scaledWidths[i];

          // Only draw if image is in viewport
          if (currentX + imgWidth > 0 && currentX < canvasWidth) {
            // Use integer coordinates to avoid subpixel rendering artifacts
            // Add 1px overlap to eliminate seam lines between images
            const drawX = Math.floor(currentX);
            const drawY = Math.floor(yPosition);
            const drawWidth = Math.ceil(imgWidth) + 1; // +1px overlap
            const drawHeight = Math.ceil(fillHeight);
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
          }

          currentX += imgWidth;

          // Early exit if we've covered the screen
          if (currentX >= canvasWidth) break;
        }
      }
    };

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const now = performance.now();
      let dt = (now - lastNow) / 1000;
      lastNow = now;
      if (!Number.isFinite(dt) || dt < 0) dt = 0;
      if (dt > MAX_DT) dt = MAX_DT;
      const frameScale = dt * REF_FPS;
      tSec += dt;

      // Keep old "frame counter" semantics by counting in REF_FPS-frames.
      frameCountRef.current += frameScale;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      // Update parallax offsets only when playing
      if (isPlaying) {
        const speed = params.sceneSpeed || 1.0;
        bottomOffsetRef.current += BOTTOM_SPEED * speed * frameScale;
        middleOffsetRef.current += MIDDLE_SPEED * speed * frameScale;
        topOffsetRef.current += TOP_SPEED * speed * frameScale;
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Helper: draw mid overlay (must be called between bottom and middle layers)
      const drawMidOverlay = () => {
        const lyricText = lyricLineRef.current;
        const infoText = songInfoRef.current;

        // If lyric becomes empty (e.g. before first timestamp), keep last displayed lyric to avoid flicker.
        const incoming = lyricText.length > 0 ? lyricText : lastLyricPropRef.current;
        if (incoming.length > 0) {
          lastLyricPropRef.current = incoming;
        }

        // Detect lyric changes (string compare) and start transition.
        // We do not transition for empty -> empty.
        const o = overlayRef.current;
        const incomingLyric = lastLyricPropRef.current;
        if (incomingLyric && incomingLyric !== o.currentLyric && incomingLyric !== o.nextLyric) {
          o.nextLyric = incomingLyric;
          o.phase = 'fadeOut';
          o.alpha = Math.min(1, Math.max(0, o.alpha));
        }

        // Advance fade state machine.
        // FADE_STEP is tuned per-frame on desktop; scale by frameScale to keep seconds consistent.
        const FADE_STEP = 0.04;
        if (o.phase === 'fadeOut') {
          o.alpha = Math.max(0, o.alpha - FADE_STEP * frameScale);
          if (o.alpha <= 0.01) {
            if (o.nextLyric) o.currentLyric = o.nextLyric;
            o.nextLyric = null;
            o.phase = 'fadeIn';
          }
        } else if (o.phase === 'fadeIn') {
          o.alpha = Math.min(1, o.alpha + FADE_STEP * frameScale);
          if (o.alpha >= 0.99) {
            o.alpha = 1;
            o.phase = 'idle';
          }
        } else {
          // idle: ensure stable alpha
          o.alpha = 1;
          // Initialize first lyric if needed
          if (!o.currentLyric && incomingLyric) {
            o.currentLyric = incomingLyric;
          }
        }

        // Layout: roughly center-ish, slightly below center like the screenshot.
        const baseX = width * 0.5;
        const baseY = height * 0.63;

        // Gentle floating (not tied to sceneSpeed).
        // Slower, smoother, and larger amplitude for a "floating balloon" feel.
        const t = tSec;
        
        // Lyric: Main floater (larger amplitude)
        // Horizontal: ±12px
        const floatX = Math.cos(t * 0.3) * 12;
        // Vertical: ±16px (12 + 4)
        const floatY = Math.sin(t * 0.5) * 12 + Math.sin(t * 1.2) * 4;

        // Song Info: Secondary floater (desynced)
        // Different phase and slightly different frequency to avoid "static relative to lyric" look.
        const infoFloatX = Math.cos(t * 0.35 + 2.0) * 10; // Phase shift + diff freq
        const infoFloatY = Math.sin(t * 0.55 + 1.5) * 10 + Math.sin(t * 1.3) * 3;

        // Typography (breakpoint-based like Tailwind defaults):
        // - < md(768): "sm" bucket
        // - md(768) ~ < lg(1024): "md" bucket
        // - >= lg(1024): "lg" bucket
        const isSm = width < 768;
        const isMd = width >= 768 && width < 1024;

        const lyricFontSize = isSm ? 20 : isMd ? 26 : 34;
        const infoFontSize = isSm ? 12 : isMd ? 14 : 18;

        // Weights: keep sm lighter as requested previously; md/lg keep original weights.
        const lyricWeight = isSm ? 500 : 600; // sm: medium
        const infoWeight = isSm ? 400 : 500;  // sm: regular

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Subtle shadow for blending (very light, not a glow).
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        // 1) Lyric line (40% white) with animated alpha.
        const lyricAlpha = 0.40 * o.alpha;
        if (o.currentLyric) {
          ctx.font = `${lyricWeight} ${lyricFontSize}px Inter, system-ui, -apple-system, Segoe UI, sans-serif`;
          ctx.fillStyle = `rgba(255,255,255,${lyricAlpha})`;
          // sm: constrain width + wrap (long lyrics shouldn't overflow)
          if (isSm) {
            const PADDING_X = 24; // keep whitespace on both sides (similar to px-6)
            const maxWidth = Math.max(80, width - PADDING_X * 2);
            const maxLines = 2;
            const lineHeight = Math.round(lyricFontSize * 1.2);

            const measure = (s: string) => ctx.measureText(s).width;
            const ellipsize = (s: string) => {
              const ellipsis = '…';
              if (measure(s) <= maxWidth) return s;
              let trimmed = s;
              while (trimmed.length > 0 && measure(trimmed + ellipsis) > maxWidth) {
                trimmed = trimmed.slice(0, -1);
              }
              return trimmed.length > 0 ? trimmed + ellipsis : ellipsis;
            };

            const wrapLines = (text: string): string[] => {
              const t = (text ?? '').trim();
              if (!t) return [];

              const hasSpaces = /\s/.test(t);
              const tokens = hasSpaces ? t.split(/\s+/) : Array.from(t);
              const joiner = hasSpaces ? ' ' : '';

              const lines: string[] = [];
              let current = '';

              const pushCurrent = () => {
                if (current) lines.push(current);
                current = '';
              };

              for (const token of tokens) {
                const candidate = current ? current + joiner + token : token;
                if (measure(candidate) <= maxWidth) {
                  current = candidate;
                  continue;
                }

                // If we already have some content, push it and start new line.
                if (current) {
                  pushCurrent();
                  // If reached max lines, stop.
                  if (lines.length >= maxLines) break;
                  // Try token on new line
                  if (measure(token) <= maxWidth) {
                    current = token;
                    continue;
                  }
                }

                // Token itself is too long: break by characters.
                let chunk = '';
                for (const ch of Array.from(token)) {
                  const cand = chunk + ch;
                  if (measure(cand) <= maxWidth) {
                    chunk = cand;
                  } else {
                    if (chunk) {
                      current = chunk;
                      pushCurrent();
                      if (lines.length >= maxLines) {
                        chunk = '';
                        break;
                      }
                      chunk = ch;
                    } else {
                      // Single char still too wide (extremely unlikely); force it.
                      current = ch;
                      pushCurrent();
                      if (lines.length >= maxLines) {
                        chunk = '';
                        break;
                      }
                    }
                  }
                }
                if (lines.length >= maxLines) break;
                if (chunk) current = chunk;
              }

              if (lines.length < maxLines && current) {
                pushCurrent();
              }

              // If we overflowed, ellipsize the last visible line.
              if (lines.length > maxLines) {
                return lines.slice(0, maxLines);
              }
              if (lines.length === maxLines) {
                lines[maxLines - 1] = ellipsize(lines[maxLines - 1]);
              }
              return lines;
            };

            // Use cached wrap result if lyric and width haven't changed
            const cache = wrapCacheRef.current;
            let lines: string[];
            if (cache && cache.text === o.currentLyric && cache.width === maxWidth) {
              lines = cache.lines;  // Cache hit - skip expensive calculation
            } else {
              lines = wrapLines(o.currentLyric);  // Cache miss - calculate and store
              wrapCacheRef.current = { text: o.currentLyric, width: maxWidth, lines };
            }
            
            const startX = baseX + floatX;
            const startY = baseY + floatY;
            for (let i = 0; i < lines.length; i++) {
              ctx.fillText(lines[i], startX, startY + i * lineHeight, maxWidth);
            }

            // Store how many lines we actually drew for downstream layout (song info below).
            (drawMidOverlay as any)._lyricLines = Math.max(1, lines.length);
            (drawMidOverlay as any)._lyricLineHeight = lineHeight;
            (drawMidOverlay as any)._lyricMaxWidth = maxWidth;
          } else {
            ctx.fillText(o.currentLyric, baseX + floatX, baseY + floatY);
          }
        }

          // 2) Song info line (20% white), fixed alpha.
          if (infoText) {
            ctx.font = `${infoWeight} ${infoFontSize}px Inter, system-ui, -apple-system, Segoe UI, sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.20)';
            const lyricLines = isSm ? Number((drawMidOverlay as any)._lyricLines ?? 1) : 1;
            const lyricLineHeight = isSm ? Number((drawMidOverlay as any)._lyricLineHeight ?? Math.round(lyricFontSize * 1.2)) : 0;
            const maxWidth = isSm ? Number((drawMidOverlay as any)._lyricMaxWidth ?? (width - 48)) : undefined;

            // Calculate independent target Y positions
            const lyricCurrentY = baseY + floatY + (isSm ? (lyricLines - 1) * lyricLineHeight : 0);
            
            // "Ideal" position for info line (independent floating)
            const targetInfoY = 
              baseY + 
              infoFloatY + 
              (isSm ? (lyricLines - 1) * lyricLineHeight : 0) + 
              Math.round(lyricFontSize * 1.25);

            // Collision Detection:
            // Calculate safety boundary based on lyric's current position + font size padding.
            // Minimum gap = 0.9 * lyricFontSize
            const safeBoundaryY = lyricCurrentY + (lyricFontSize * 0.9);
            
            // Final Y is the lower (larger value) of the two: either its ideal spot, or pushed down by safety boundary.
            const infoY = Math.max(targetInfoY, safeBoundaryY);

            // In sm, keep the same max width constraint for consistency (prevents long song info overflow too).
            if (isSm && typeof maxWidth === 'number' && maxWidth > 0) {
              ctx.fillText(infoText, baseX + infoFloatX, infoY, maxWidth); // Use independent floatX
            } else {
              ctx.fillText(infoText, baseX + infoFloatX, infoY); // Use independent floatX
            }
          }

        ctx.restore();
      };

      // Draw parallax background layers (back to front)
      if (bgImagesLoadedRef.current) {
        // Bottom layer - covers full height (sky + distant city)
        drawParallaxLayer(bottomImagesRef.current, bottomOffsetRef.current, 0, height, width);

        // Draw gingerbread man (attached to bottom3 specifically)
        if (gingermanLoadedRef.current && gingermanImagesRef.current.length > 0 && bottomImagesRef.current.length >= 3) {
          // Update gingerman animation frame
          gingermanTimerRef.current += frameScale;
          while (gingermanTimerRef.current >= GINGERMAN_FRAME_DURATION) {
            gingermanTimerRef.current -= GINGERMAN_FRAME_DURATION;
            gingermanFrameRef.current = (gingermanFrameRef.current + 1) % GINGERMAN_FRAMES.length;
          }
          
          // Calculate gingerman size (maintain aspect ratio)
          const gingermanImg = gingermanImagesRef.current[gingermanFrameRef.current];
          const gingermanHeight = height * GINGERMAN_HEIGHT_RATIO;
          const aspectRatio = gingermanImg.width / gingermanImg.height;
          const gingermanWidth = gingermanHeight * aspectRatio;
          
          // Calculate the widths of bottom1, bottom2, bottom3 (scaled to screen height)
          const bottom1Width = (bottomImagesRef.current[0].width / bottomImagesRef.current[0].height) * height;
          const bottom2Width = (bottomImagesRef.current[1].width / bottomImagesRef.current[1].height) * height;
          const bottom3Width = (bottomImagesRef.current[2].width / bottomImagesRef.current[2].height) * height;
          const totalSequenceWidth = bottom1Width + bottom2Width + bottom3Width;
          
          // Position where bottom3 starts in the sequence
          const bottom3StartOffset = bottom1Width + bottom2Width;
          
          // Gingerman position within bottom3 (middle-left of bottom3)
          const gingermanOffsetInBottom3 = bottom3Width * 0.3; // 30% from left of bottom3
          
          // Calculate gingerman absolute position in the sequence
          const gingermanAbsoluteX = bottom3StartOffset + gingermanOffsetInBottom3;
          
          // Apply scroll offset and normalize
          const normalizedOffset = bottomOffsetRef.current % totalSequenceWidth;
          let gingermanX = gingermanAbsoluteX - normalizedOffset;
          
          // Wrap around for seamless looping
          if (gingermanX < -gingermanWidth) {
            gingermanX += totalSequenceWidth;
          }
          if (gingermanX > width + totalSequenceWidth - gingermanWidth) {
            gingermanX -= totalSequenceWidth;
          }
          
          // Only draw if gingerman is visible on screen
          if (gingermanX > -gingermanWidth && gingermanX < width) {
            // Position gingerman at bottom of screen (on the ground with buildings)
            const gingermanY = height - gingermanHeight - (height * 0.05); // 5% margin from bottom
            
            // Draw gingerman
            ctx.drawImage(
              gingermanImg,
              gingermanX,
              gingermanY,
              gingermanWidth,
              gingermanHeight
            );
          }
        }

        // Draw skating rabbit (attached to bottom2 specifically)
        // FIX: forwardRun is now based on how far THIS instance has traveled on screen,
        // so each time bottom2 enters screen, rabbit starts at the anchor point.
        if (
          rabbitLoadedRef.current &&
          rabbitImagesRef.current.length > 0 &&
          bottomImagesRef.current.length >= 3 &&
          bottomImagesRef.current[0].width > 0 &&
          bottomImagesRef.current[1].width > 0 &&
          bottomImagesRef.current[2].width > 0
        ) {
          // Update rabbit animation frame
          rabbitTimerRef.current += frameScale;
          while (rabbitTimerRef.current >= RABBIT_FRAME_DURATION) {
            rabbitTimerRef.current -= RABBIT_FRAME_DURATION;
            rabbitFrameRef.current = (rabbitFrameRef.current + 1) % RABBIT_FRAMES.length;
          }
          
          const rabbitImg = rabbitImagesRef.current[rabbitFrameRef.current];
          const rabbitHeight = height * RABBIT_HEIGHT_RATIO;
          const aspectRatio = rabbitImg.width / rabbitImg.height;
          const rabbitWidth = rabbitHeight * aspectRatio;
          
          const bottom1Width = (bottomImagesRef.current[0].width / bottomImagesRef.current[0].height) * height;
          const bottom2Width = (bottomImagesRef.current[1].width / bottomImagesRef.current[1].height) * height;
          const bottom3Width = (bottomImagesRef.current[2].width / bottomImagesRef.current[2].height) * height;
          const totalSequenceWidth = bottom1Width + bottom2Width + bottom3Width;
          
          const bottom2StartOffset = bottom1Width;
          const rabbitOffsetInBottom2 = bottom2Width * 0.3; // Fixed anchor: 30% from left
          const rabbitScrollSpeed = 0.90; // < 1 means rabbit moves slower than bg = runs forward
          const cycleOffset = bottomOffsetRef.current % totalSequenceWidth;
          const rabbitY = height - rabbitHeight - (height * 0.05);
          
          // Max forward distance (don't run past end of bottom2)
          const maxForwardRun = Math.max(0, bottom2Width - rabbitOffsetInBottom2 - rabbitWidth);
          
          // Draw rabbit on each visible bottom2 instance
          for (let i = -1; i <= 1; i++) {
            const bottom2InstanceX = -cycleOffset + bottom2StartOffset + i * totalSequenceWidth;
            
            // Calculate how far this instance has traveled on screen (from right edge entering)
            // When just entering (bottom2InstanceX = width), travelDistance = 0
            // As it moves left, travelDistance increases
            const travelDistance = Math.max(0, width - bottom2InstanceX);
            
            // Forward run for THIS instance only
            const forwardRun = Math.min(travelDistance * (1 - rabbitScrollSpeed), maxForwardRun);
            
            const rabbitX = bottom2InstanceX + rabbitOffsetInBottom2 + forwardRun;
            
            if (rabbitX > -rabbitWidth && rabbitX < width) {
              ctx.drawImage(rabbitImg, rabbitX, rabbitY, rabbitWidth, rabbitHeight);
            }
          }
        }

        // Draw deer (attached to bottom1 specifically)
        // FIX: forwardRun is now based on how far THIS instance has traveled on screen,
        // so each time bottom1 enters screen, deer starts at the anchor point.
        if (
          deerLoadedRef.current &&
          deerImagesRef.current.length > 0 &&
          bottomImagesRef.current.length >= 3 &&
          bottomImagesRef.current[0].width > 0 &&
          bottomImagesRef.current[1].width > 0 &&
          bottomImagesRef.current[2].width > 0
        ) {
          // Update deer animation frame
          deerTimerRef.current += frameScale;
          while (deerTimerRef.current >= DEER_FRAME_DURATION) {
            deerTimerRef.current -= DEER_FRAME_DURATION;
            deerFrameRef.current = (deerFrameRef.current + 1) % DEER_FRAMES.length;
          }
          
          const deerImg = deerImagesRef.current[deerFrameRef.current];
          const deerHeight = height * DEER_HEIGHT_RATIO;
          const aspectRatio = deerImg.width / deerImg.height;
          const deerWidth = deerHeight * aspectRatio;
          
          const bottom1Width = (bottomImagesRef.current[0].width / bottomImagesRef.current[0].height) * height;
          const bottom2Width = (bottomImagesRef.current[1].width / bottomImagesRef.current[1].height) * height;
          const bottom3Width = (bottomImagesRef.current[2].width / bottomImagesRef.current[2].height) * height;
          const totalSequenceWidth = bottom1Width + bottom2Width + bottom3Width;

          // bottom1 starts at position 0 in the sequence
          const bottom1StartOffset = 0;
          const deerOffsetInBottom1 = bottom1Width * 0.3; // Fixed anchor: 30% from left
          const deerScrollSpeed = 0.80; // < 1 means deer moves slower than bg = runs forward
          const cycleOffset = bottomOffsetRef.current % totalSequenceWidth;
          const deerY = height - deerHeight - (height * 0.05);
          
          // Max forward distance (don't run past end of bottom1)
          const maxForwardRun = Math.max(0, bottom1Width - deerOffsetInBottom1 - deerWidth);
          
          // Draw deer on each visible bottom1 instance
          for (let i = -1; i <= 1; i++) {
            const bottom1InstanceX = -cycleOffset + bottom1StartOffset + i * totalSequenceWidth;
            
            // Calculate how far this instance has traveled on screen (from right edge entering)
            // When just entering (bottom1InstanceX = width), travelDistance = 0
            // As it moves left, travelDistance increases
            const travelDistance = Math.max(0, width - bottom1InstanceX);
            
            // Forward run for THIS instance only
            const forwardRun = Math.min(travelDistance * (1 - deerScrollSpeed), maxForwardRun);
            
            const deerX = bottom1InstanceX + deerOffsetInBottom1 + forwardRun;
            
            if (deerX > -deerWidth && deerX < width) {
              ctx.drawImage(deerImg, deerX, deerY, deerWidth, deerHeight);
            }
          }
        }

        // Draw overlay between bottom and middle.
        drawMidOverlay();

        // Middle layer - buildings at bottom portion
        const middleHeight = height * 0.6;
        const middleY = height - middleHeight;
        drawParallaxLayer(middleImagesRef.current, middleOffsetRef.current, middleY, middleHeight, width);

        // Top layer - foreground clouds/decorations
        const topHeight = height * 0.3;
        const topY = height - topHeight;
        drawParallaxLayer(topImagesRef.current, topOffsetRef.current, topY, topHeight, width);
      } else {
        // Fallback solid color while loading
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, width, height);
      // Still draw overlay even when backgrounds are not ready.
      drawMidOverlay();
      }

      // === SNOW EFFECT ===
      // Initialize snowflakes if not done yet
      if (!snowInitializedRef.current || snowflakesRef.current.length === 0) {
        const flakes: Snowflake[] = [];
        for (let i = 0; i < SNOW_COUNT; i++) {
          flakes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: SNOW_SIZES[Math.floor(Math.random() * SNOW_SIZES.length)],
            speedY: SNOW_SPEED_Y.min + Math.random() * (SNOW_SPEED_Y.max - SNOW_SPEED_Y.min),
            speedX: SNOW_SPEED_X.min + Math.random() * (SNOW_SPEED_X.max - SNOW_SPEED_X.min),
            color: SNOW_COLORS[Math.floor(Math.random() * SNOW_COLORS.length)],
            swayOffset: Math.random() * Math.PI * 2,
          });
        }
        snowflakesRef.current = flakes;
        snowInitializedRef.current = true;
      }

      // Update and draw snowflakes (always animate, regardless of music state)
      snowflakesRef.current.forEach((flake) => {
        // Update position
        flake.y += flake.speedY * frameScale;
        // Treat drift + sway as per-frame velocities and scale by frameScale for dt equivalence.
        const swayPhase = tSec * (0.02 * REF_FPS) + flake.swayOffset;
        const swayVel = Math.sin(swayPhase) * SNOW_SWAY_AMOUNT * 0.1;
        flake.x += (flake.speedX + swayVel) * frameScale;

        // Wrap around when off screen
        if (flake.y > height + flake.size) {
          flake.y = -flake.size;
          flake.x = Math.random() * width;
        }
        if (flake.x > width + flake.size) {
          flake.x = -flake.size;
        } else if (flake.x < -flake.size) {
          flake.x = width + flake.size;
        }

        // Draw snowflake with pixel art patterns based on size
        ctx.fillStyle = flake.color;
        const drawX = Math.floor(flake.x);
        const drawY = Math.floor(flake.y);
        
        if (flake.size <= 2) {
          // Tiny flakes: simple square
          ctx.fillRect(drawX, drawY, flake.size, flake.size);
        } else if (flake.size === 3) {
          // Small flakes: plus/cross shape
          //   X
          //  XXX
          //   X
          ctx.fillRect(drawX + 1, drawY, 1, 1);     // top
          ctx.fillRect(drawX, drawY + 1, 3, 1);     // middle row
          ctx.fillRect(drawX + 1, drawY + 2, 1, 1); // bottom
        } else if (flake.size === 4) {
          // Medium flakes: diamond shape
          //   XX
          //  XXXX
          //  XXXX
          //   XX
          ctx.fillRect(drawX + 1, drawY, 2, 1);     // top
          ctx.fillRect(drawX, drawY + 1, 4, 2);     // middle
          ctx.fillRect(drawX + 1, drawY + 3, 2, 1); // bottom
        } else {
          // Large flakes: snowflake pattern
          //   X X
          //  XXXXX
          //   XXX
          //  XXXXX
          //   X X
          ctx.fillRect(drawX + 1, drawY, 1, 1);     // top left
          ctx.fillRect(drawX + 3, drawY, 1, 1);     // top right
          ctx.fillRect(drawX, drawY + 1, 5, 1);     // second row full
          ctx.fillRect(drawX + 1, drawY + 2, 3, 1); // middle row
          ctx.fillRect(drawX, drawY + 3, 5, 1);     // fourth row full
          ctx.fillRect(drawX + 1, drawY + 4, 1, 1); // bottom left
          ctx.fillRect(drawX + 3, drawY + 4, 1, 1); // bottom right
        }
      });

      // Get raw energy values from audio
      let rawEnergies: number[] = [0, 0, 0, 0, 0];

      if (analyser) {
        if (!audioDataRef.current || audioDataRef.current.length !== analyser.frequencyBinCount) {
          audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
        
        analyser.getByteFrequencyData(audioDataRef.current as Uint8Array<ArrayBuffer>);

        const audioData = audioDataRef.current;
        if (audioData) {
          rawEnergies = CHARACTERS.map(char => 
            getFrequencyRangeEnergy(
              audioData,
              char.freqStart,
              char.freqEnd,
              sampleRate,
              fftSize
            )
          );
        }
      }

      // Process each character
      const sensitivity = params.sensitivity || 0.5;
      const amplification = DELTA_AMPLIFICATION * (0.5 + sensitivity * 1.5);
      
      // Detect silence
      const isQuiet = rawEnergies.every(e => e < 0.03);

      CHARACTERS.forEach((char, i) => {
        const currentEnergy = rawEnergies[i];
        const currentBaseline = baselineRef.current[i];
        
        // Update baseline
        if (currentEnergy > currentBaseline) {
          // BASELINE_ATTACK is a per-frame rate tuned on desktop; convert to dt-equivalent.
          const attackAlpha = 1 - Math.pow(1 - BASELINE_ATTACK, frameScale);
          baselineRef.current[i] = currentBaseline + (currentEnergy - currentBaseline) * attackAlpha;
        } else {
          const decayRate = isQuiet ? 0.0002 : BASELINE_DECAY;
          const decayAlpha = 1 - Math.pow(1 - decayRate, frameScale);
          baselineRef.current[i] = currentBaseline + (currentEnergy - currentBaseline) * decayAlpha;
        }
        
        // Calculate delta
        let delta = currentEnergy - baselineRef.current[i];
        
        // Limit max delta
        const maxDelta = 0.08;
        if (delta > maxDelta) {
          baselineRef.current[i] = currentEnergy - maxDelta;
          delta = maxDelta;
        }
        
        // Calculate target value
        const extraBoost = (CHARACTERS[i] as any).extraBoost || 1.0;
        let targetValue = Math.max(0, delta * amplification * extraBoost);
        
        // Clamp to max
        targetValue = Math.min(targetValue, MAX_DISPLAY_VALUE);
        
        // Spring physics
        const currentDisplay = displayValuesRef.current[i];
        const currentVelocity = velocityRef.current[i];
        
        const displacement = targetValue - currentDisplay;
        const springForce = displacement * SPRING_STIFFNESS;
        
        // Spring integration in REF_FPS-frame units, scaled by frameScale to be dt-stable.
        velocityRef.current[i] = currentVelocity + springForce * frameScale;
        const friction = params.friction ?? 0.94;
        velocityRef.current[i] *= Math.pow(friction, frameScale);
        displayValuesRef.current[i] = currentDisplay + velocityRef.current[i] * frameScale;
        
        // Soft bounds
        if (displayValuesRef.current[i] < 0) {
          displayValuesRef.current[i] = 0;
          velocityRef.current[i] *= -0.2;
        }
        if (displayValuesRef.current[i] > 1.0) {
          displayValuesRef.current[i] = 1.0;
          velocityRef.current[i] *= -0.4;
        }
      });

      // Update frame animation timer (for animated characters)
      // TODO: When finalized, only animate when isPlaying is true
      frameTimerRef.current += frameScale;
      while (frameTimerRef.current >= FRAME_DURATION) {
        frameTimerRef.current -= FRAME_DURATION;
        // Advance frame for all animated characters
        CHARACTERS.forEach((char, index) => {
          if (char.isAnimated && char.frames.length > 1) {
            frameIndicesRef.current[index] =
              (frameIndicesRef.current[index] + 1) % char.frames.length;
          }
        });
      }

      // Initialize trail stars if not done yet
      if (!trailStarsInitializedRef.current) {
        trailStarsRef.current = CHARACTERS.map(() => {
          const stars: TrailStar[] = [];
          for (let i = 0; i < TRAIL_STARS_PER_CHARACTER; i++) {
            const baseSize = TRAIL_STAR_SIZES[Math.floor(Math.random() * TRAIL_STAR_SIZES.length)];
            stars.push({
              relativeX: Math.random(), // Random position along trail
              relativeY: (Math.random() - 0.5) * 0.8, // Random vertical offset
              size: baseSize,
              baseSize: baseSize,
              opacity: 0.5 + Math.random() * 0.5,
              speed: TRAIL_STAR_SPEED * (0.7 + Math.random() * 0.6), // Speed variation
            });
          }
          return stars;
        });
        trailStarsInitializedRef.current = true;
      }

      // Draw characters
      CHARACTERS.forEach((char, index) => {
        const displayValue = displayValuesRef.current[index];
        
        // Base positions with minimum spacing for narrow screens
        const baseX = (char as any).baseX as number;
        const centerX = width * 0.505;
        const minHalfSpacing = 90; // Minimum horizontal distance from center (pixels)
        
        let startX: number;
        if (baseX < 0.5) {
          // Left characters (blue, yellow): ensure they don't get too close to center
          startX = Math.min(width * baseX, centerX - minHalfSpacing);
        } else if (baseX > 0.51) {
          // Right characters (green, purple): ensure they don't get too close to center
          startX = Math.max(width * baseX, centerX + minHalfSpacing);
        } else {
          // Center character (pink)
          startX = centerX;
        }
        const startY = height * (char as any).baseY;
        
        // Dynamic movement (move to right)
        // Scaled by MAX_MOVE_DIST (e.g. 15% of screen width)
        const moveX = displayValue * width * MAX_MOVE_DIST;
        const currentX = startX + moveX;
        const currentY = startY; // Y stays constant

        // Draw trail - always visible with base length, extends with movement
        // Total trail length = base length + movement
        const totalTrailLength = BASE_TRAIL_LENGTH + moveX;
        const trailStartX = currentX - totalTrailLength;
        
        const gradient = ctx.createLinearGradient(trailStartX, 0, currentX, 0);
          gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, char.trailColor + '30'); // Softer fade
        gradient.addColorStop(0.7, char.trailColor + '70');
          gradient.addColorStop(1, char.trailColor);

          ctx.fillStyle = gradient;
          // Trail is centered vertically on character
        ctx.fillRect(trailStartX, currentY - TRAIL_HEIGHT / 2, totalTrailLength, TRAIL_HEIGHT);

        // Update and draw trail stars
        const stars = trailStarsRef.current[index];
        if (stars) {
          stars.forEach(star => {
            // Update star position (move left)
            star.relativeX -= (star.speed / totalTrailLength) * frameScale;
            
            // Shrink and fade as it moves left
            const distanceFromRight = 1 - star.relativeX;
            star.size = star.baseSize * (0.3 + star.relativeX * 0.7);
            star.opacity = Math.max(0, 0.9 * star.relativeX);
            
            // Respawn star if it's out of bounds or too small
            if (star.relativeX < 0 || star.size < 1 || star.opacity < 0.1) {
              star.relativeX = 0.85 + Math.random() * 0.15; // Spawn near character
              star.relativeY = (Math.random() - 0.5) * 0.8;
              star.baseSize = TRAIL_STAR_SIZES[Math.floor(Math.random() * TRAIL_STAR_SIZES.length)];
              star.size = star.baseSize;
              star.opacity = 0.7 + Math.random() * 0.3;
              star.speed = TRAIL_STAR_SPEED * (0.7 + Math.random() * 0.6);
            }
            
            // Calculate absolute position
            const starX = trailStartX + star.relativeX * totalTrailLength;
            const starY = currentY + star.relativeY * TRAIL_HEIGHT;
            
            // Draw pixel heart shape
            const size = Math.max(2, Math.floor(star.size));
            
            // Use white color with opacity (50% more transparent)
            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.5})`;
            
            const drawX = Math.floor(starX);
            const drawY = Math.floor(starY);
            
            if (size <= 12) {
              // Small heart (9x8 pixels)
              //  XXX XXX
              // XXXXXXXXX
              // XXXXXXXXX
              //  XXXXXXX
              //   XXXXX
              //    XXX
              //     X
              ctx.fillRect(drawX - 4, drawY - 3, 3, 2); // Top left bump
              ctx.fillRect(drawX + 1, drawY - 3, 3, 2); // Top right bump
              ctx.fillRect(drawX - 4, drawY - 1, 9, 2); // Upper body
              ctx.fillRect(drawX - 3, drawY + 1, 7, 1); // Upper middle
              ctx.fillRect(drawX - 2, drawY + 2, 5, 1); // Middle
              ctx.fillRect(drawX - 1, drawY + 3, 3, 1); // Lower middle
              ctx.fillRect(drawX, drawY + 4, 1, 1);     // Bottom point
            } else if (size <= 16) {
              // Medium heart (11x10 pixels)
              ctx.fillRect(drawX - 5, drawY - 4, 4, 2); // Top left bump
              ctx.fillRect(drawX + 1, drawY - 4, 4, 2); // Top right bump
              ctx.fillRect(drawX - 5, drawY - 2, 11, 3); // Upper body
              ctx.fillRect(drawX - 4, drawY + 1, 9, 2);  // Middle body
              ctx.fillRect(drawX - 3, drawY + 3, 7, 1);  // Upper middle
              ctx.fillRect(drawX - 2, drawY + 4, 5, 1);  // Middle
              ctx.fillRect(drawX - 1, drawY + 5, 3, 1);  // Lower middle
              ctx.fillRect(drawX, drawY + 6, 1, 1);      // Bottom point
            } else {
              // Large heart (13x12 pixels)
              ctx.fillRect(drawX - 6, drawY - 5, 5, 2); // Top left bump
              ctx.fillRect(drawX + 1, drawY - 5, 5, 2); // Top right bump
              ctx.fillRect(drawX - 6, drawY - 3, 13, 4); // Upper body
              ctx.fillRect(drawX - 5, drawY + 1, 11, 2); // Middle body
              ctx.fillRect(drawX - 4, drawY + 3, 9, 1);  // Upper middle
              ctx.fillRect(drawX - 3, drawY + 4, 7, 1);  // Middle
              ctx.fillRect(drawX - 2, drawY + 5, 5, 1);  // Lower middle
              ctx.fillRect(drawX - 1, drawY + 6, 3, 1);  // Lower
              ctx.fillRect(drawX, drawY + 7, 1, 1);      // Bottom point
            }
          });
        }

        // Draw character (use current frame for animated characters)
        const charFrames = imagesRef.current[index];
        if (imagesLoadedRef.current && charFrames && charFrames.length > 0) {
          const frameIndex = frameIndicesRef.current[index];
          const img = charFrames[frameIndex] || charFrames[0];
          ctx.drawImage(
            img,
            currentX - CHAR_SIZE / 2,
            currentY - CHAR_SIZE / 2,
            CHAR_SIZE,
            CHAR_SIZE
          );
        } else {
          ctx.fillStyle = char.trailColor;
          ctx.beginPath();
          ctx.arc(currentX, currentY, CHAR_SIZE / 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying, params, getFrequencyRangeEnergy]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full absolute inset-0"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

export default PowerpuffVisualizer;
