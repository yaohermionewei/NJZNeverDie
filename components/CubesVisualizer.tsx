import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import rabbitRightIdleImg from '../assets/rabbit/rabbit_right_idle.webp';
import rabbitRightUpImg from '../assets/rabbit/rabbit_right_up.webp';
import rabbitRightDownImg from '../assets/rabbit/rabbit_right_down.webp';
import rabbitLeftIdleImg from '../assets/rabbit/rabbit_left_idle.webp';
import rabbitLeftUpImg from '../assets/rabbit/rabbit_left_up.webp';
import rabbitLeftDownImg from '../assets/rabbit/rabbit_left_down.webp';

export interface CubesParams {
  height: number;
  spread: number;
  damping: number;
  showRabbits: boolean;
}

// 配色方案类型
export type CubesTheme = 'pink' | 'purple' | 'green';

// 配色方案定义
interface CubesColorScheme {
  bgTop: string;      // 背景顶部
  bgBottom: string;   // 背景底部 (同时也是雾效颜色)
  cubeBottom: [number, number, number]; // 方块底部 RGB (0-1)
  cubeTop: [number, number, number];    // 方块顶部 RGB (0-1)
}

const CUBES_COLOR_SCHEMES: Record<CubesTheme, CubesColorScheme> = {
  pink: {
    bgTop: '#FFF2F4',
    bgBottom: '#FFE5E8',
    cubeBottom: [0.953, 0.380, 0.435], // #F3616F
    cubeTop: [1.0, 0.898, 0.910],      // #FFE5E8
  },
  purple: {
    bgTop: '#EFEFF7',
    bgBottom: '#CFD1F3',
    cubeBottom: [0.396, 0.431, 0.898], // #656EE5
    cubeTop: [0.933, 0.937, 1.0],      // #EEEFFF
  },
  green: {
    bgTop: '#ECF3EC',
    bgBottom: '#D1ECD0',
    cubeBottom: [0.345, 0.741, 0.325], // #58BD53
    cubeTop: [0.867, 0.965, 0.863],    // #DDF6DC
  },
};

interface CubesVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  params: CubesParams;
  colorTheme: CubesTheme;
  // Bottom UI inset in pixels (e.g. controls height + gap). Used to shift objects up on screen
  // while keeping the background full-screen.
  uiBottomInsetPx?: number;
}

// 8x8 grid as per reference image
const GRID_SIZE = 8;
const CUBE_SPACING = 1.2;

// Maximum height for color mapping (global setting)
// Lowered to 6.0 so mid-height cubes can reach brighter colors more easily
const MAX_HEIGHT = 6.0;

// Rabbit physics tuning
const RABBIT_SPRITE_SIZE = 2.0; // 精灵的宽高尺寸（Three.js 世界单位）
const RABBIT_Y_OFFSET = (RABBIT_SPRITE_SIZE / 2) * 0.75; // 精灵底部相对于方块顶面的垂直偏移
const MAX_RABBIT_HEIGHT = 6.0; // safety cap above cube top to prevent numeric explosions

// Rabbit motion calibration:
// Keep the legacy “desktop feel” (which on modern MacBooks often runs at ~120fps / ProMotion)
// consistent across devices by converting old per-frame constants into per-second units.
const RABBIT_REF_FPS = 120;
const RABBIT_AIR_DAMP_PER_FRAME = 0.985;
const RABBIT_GRAVITY_PER_FRAME = 0.015;
const RABBIT_JUMP_TRIGGER_DY_PER_FRAME = 0.05;
const RABBIT_POP_VY_PER_FRAME = 0.18;
const RABBIT_BOUNCE_STOP_VY_PER_FRAME = 0.025;
const RABBIT_BOUNCE_DAMPING = 0.22;

const RABBIT_JUMP_TRIGGER_VY_PER_SEC = RABBIT_JUMP_TRIGGER_DY_PER_FRAME * RABBIT_REF_FPS; // units/sec
const RABBIT_POP_VY_PER_SEC = RABBIT_POP_VY_PER_FRAME * RABBIT_REF_FPS; // units/sec
const RABBIT_BOUNCE_STOP_VY_PER_SEC = RABBIT_BOUNCE_STOP_VY_PER_FRAME * RABBIT_REF_FPS; // units/sec
const RABBIT_GRAVITY_PER_SEC2 = RABBIT_GRAVITY_PER_FRAME * RABBIT_REF_FPS * RABBIT_REF_FPS; // units/sec^2
const RABBIT_AIR_DAMP_LOG_PER_SEC = Math.log(RABBIT_AIR_DAMP_PER_FRAME) * RABBIT_REF_FPS; // for exp(log(d)*dt)

// Time-step configuration (frame-rate independent)
const BASELINE_FPS = 60;
const MAX_DT = 1 / 30; // clamp to avoid huge jumps on background/tab-switch or frame spikes

// Rabbit horizontal hop settings
const HOP_VELOCITY_THRESHOLD = 15.0;  // 动势超过此值才跳到其他方块
const MAX_HOP_GRID_DISTANCE = 2;      // 最大跳跃格子数（曼哈顿距离）

// 创建梯形圆角方块几何体
const createTaperedRoundedBox = (
  width: number, 
  height: number, 
  depth: number, 
  smooth: number,    // 圆角平滑度（分段数）
  radius: number,    // 圆角半径
  taperScale: number // 顶部缩放比例 (0.82 = 顶部是底部的82%)
): THREE.BufferGeometry => {
  // 使用 RoundedBoxGeometry 作为基础
  const geometry = new RoundedBoxGeometry(width, height, depth, smooth, radius);
  const positions = geometry.attributes.position;
  
  // 修改顶部顶点，实现梯形效果
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    // 根据Y位置计算缩放（底部不变，顶部缩小）
    const normalizedY = (y + height / 2) / height; // 0 at bottom, 1 at top
    const scale = 1 - (1 - taperScale) * normalizedY;
    
    positions.setX(i, positions.getX(i) * scale);
    positions.setZ(i, positions.getZ(i) * scale);
  }
  
  positions.needsUpdate = true;
  geometry.computeVertexNormals(); // 重新计算法线
  
  return geometry;
};

// Vertex Shader: Pass world Y position AND world normal to fragment shader
const vertexShader = `
  varying float vWorldY;
  varying vec3 vWorldNormal;
  
  void main() {
    // Calculate world position
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldY = worldPosition.y;
    
    // Transform normal to world space
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    
    // Standard vertex transformation
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment Shader: Color based on GLOBAL world Y coordinate + face lighting
// Y=0 → saturated blue, Y=maxHeight → blue-tinted white
// Top face is brightest (+15%), right side is slightly brighter than left (+5%)
const fragmentShader = `
  uniform vec3 colorBottom;
  uniform vec3 colorTop;
  uniform float maxHeight;
  
  varying float vWorldY;
  varying vec3 vWorldNormal;
  
  // Linear to sRGB conversion (for output)
  vec3 linearToSRGB(vec3 linear) {
    return pow(linear, vec3(1.0/2.2));
  }
  
  void main() {
    // Map world Y (0 to maxHeight) to color gradient
    float t = clamp(vWorldY / maxHeight, 0.0, 1.0);
    
    // Use smooth interpolation for nicer gradient
    float smoothT = t * t * (3.0 - 2.0 * t);
    
    // Interpolate between bottom (saturated blue) and top (blue-tinted white) colors
    vec3 baseColor = mix(colorBottom, colorTop, smoothT);
    
    // === FACE-BASED LIGHTING ===
    // Simulates a light source from above-right
    // Top face (normal.y close to 1): +15% brightness
    // Right side (normal.x close to 1): +5% brightness
    // Left side (normal.x close to -1): base brightness
    
    float topFactor = smoothstep(0.5, 1.0, vWorldNormal.y);
    float rightFactor = smoothstep(0.5, 1.0, vWorldNormal.x);
    
    // Brightness multiplier: 
    // - Left side = 1.0 (base)
    // - Right side = 1.05 (+5%)
    // - Top face = 1.15 (+15%)
    float brightness = 1.0 + topFactor * 0.15 + rightFactor * 0.05;
    
    vec3 color = baseColor * brightness;
    
    // Clamp to prevent over-bright
    color = min(color, vec3(1.0));
    
    // Apply gamma correction for proper brightness in sRGB display
    color = linearToSRGB(color);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

const CubesVisualizer: React.FC<CubesVisualizerProps> = ({
  analyser,
  isPlaying,
  params,
  colorTheme,
  uiBottomInsetPx
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubesRef = useRef<THREE.Mesh[]>([]);
  // Refs for color theme updates (avoid full scene rebuild)
  const shaderMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const bgTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const colorThemeRef = useRef<CubesTheme>(colorTheme); // Track current theme for init
  const rabbitsRef = useRef<{
    sprite: THREE.Sprite;
    cubeIndex: number;
    targetCubeIndex: number;  // 跳跃目标方块（预订机制）
    velocityY: number;
    isJumping: boolean;
    startX: number;           // 跳跃起始X位置
    startZ: number;           // 跳跃起始Z位置
    hopProgress: number;      // 水平移动进度 0-1
    textures: {
      idle: THREE.Texture;
      up: THREE.Texture;
      down: THREE.Texture;
    };
  }[]>([]);
  const audioDataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(128));
  const currentScalesRef = useRef<Float32Array>(new Float32Array(GRID_SIZE * GRID_SIZE).fill(1));
  const animationIdRef = useRef<number | null>(null);
  const noiseRef = useRef<SimplexNoise>(new SimplexNoise());
  const uiBottomInsetPxRef = useRef<number>(0);
  const lookAtShiftRef = useRef<number>(0);
  
  // ===== RABBIT HOP HELPER FUNCTIONS =====
  // 获取所有被占用的方块（包括已预订的目标）- 防止冲突
  const getOccupiedCubes = (
    rabbits: typeof rabbitsRef.current,
    excludeRabbit: typeof rabbitsRef.current[0]
  ): Set<number> => {
    const occupied = new Set<number>();
    
    for (const r of rabbits) {
      if (r === excludeRabbit) continue;
      
      // 当前所在方块
      occupied.add(r.cubeIndex);
      
      // 如果正在跳跃，目标方块也算占用（预订机制）
      if (r.isJumping && r.targetCubeIndex !== r.cubeIndex) {
        occupied.add(r.targetCubeIndex);
      }
    }
    
    return occupied;
  };

  // 获取附近可跳跃的方块索引列表
  const getNearbyCubes = (currentIndex: number, maxDistance: number, excludeIndices: Set<number>): number[] => {
    const currentRow = Math.floor(currentIndex / GRID_SIZE);
    const currentCol = currentIndex % GRID_SIZE;
    const candidates: number[] = [];
    
    for (let dr = -maxDistance; dr <= maxDistance; dr++) {
      for (let dc = -maxDistance; dc <= maxDistance; dc++) {
        if (dr === 0 && dc === 0) continue; // 排除自己
        if (Math.abs(dr) + Math.abs(dc) > maxDistance) continue; // 曼哈顿距离限制
        
        const newRow = currentRow + dr;
        const newCol = currentCol + dc;
        
        if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
          const newIndex = newRow * GRID_SIZE + newCol;
          if (!excludeIndices.has(newIndex)) {
            candidates.push(newIndex);
          }
        }
      }
    }
    return candidates;
  };

  // Initialize Three.js scene (runs once, never rebuilds)
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // ===== SCENE =====
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // ===== BACKGROUND GRADIENT =====
    // Use ref to get initial color (avoid adding colorTheme as dependency)
    const colorScheme = CUBES_COLOR_SCHEMES[colorThemeRef.current];
    
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    
    gradient.addColorStop(0, colorScheme.bgTop);
    gradient.addColorStop(1, colorScheme.bgBottom);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    
    const bgTexture = new THREE.CanvasTexture(canvas);
    bgTextureRef.current = bgTexture;
    scene.background = bgTexture;

    // ===== FOG =====
    // Fog color matches bottom of gradient for seamless blending
    const fogColor = new THREE.Color(colorScheme.bgBottom);
    scene.fog = new THREE.Fog(fogColor, 12, 45);

    // ===== CAMERA ===== 
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(12, 12, 12);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // ===== RENDERER =====
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ===== CUBE GEOMETRY =====
    const cubeGeometry = createTaperedRoundedBox(1.0, 1, 1.0, 4, 0.1, 0.82);
    cubeGeometry.translate(0, 0.5, 0); // Pivot at bottom

    // ===== SHADER MATERIAL =====
    // Global height-to-color mapping:
    // Y=0 (ground) → saturated color
    // Y=MAX_HEIGHT → very light tinted white
    const shaderMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        colorBottom: { value: new THREE.Color(...colorScheme.cubeBottom) },
        colorTop: { value: new THREE.Color(...colorScheme.cubeTop) },
        maxHeight: { value: MAX_HEIGHT }
      }
    });
    shaderMaterialRef.current = shaderMaterial;

    const cubes: THREE.Mesh[] = [];
    const halfGrid = (GRID_SIZE - 1) * CUBE_SPACING / 2;
    const count = GRID_SIZE * GRID_SIZE;
    
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      const x = col * CUBE_SPACING - halfGrid;
      const z = row * CUBE_SPACING - halfGrid;

      // All cubes share the same geometry and shader material
      const cube = new THREE.Mesh(cubeGeometry, shaderMaterial);
      cube.position.set(x, 0, z);
      cube.scale.set(1, 1, 1);
      
      scene.add(cube);
      cubes.push(cube);
    }
    
    cubesRef.current = cubes;

    // ===== RABBIT INITIALIZATION =====
    const textureLoader = new THREE.TextureLoader();
    // Right-facing rabbit textures
    const rabbitTextureIdle = textureLoader.load(rabbitRightIdleImg);
    const rabbitTextureUp = textureLoader.load(rabbitRightUpImg);
    const rabbitTextureDown = textureLoader.load(rabbitRightDownImg);
    // Left-facing rabbit textures
    const rabbitLeftTextureIdle = textureLoader.load(rabbitLeftIdleImg);
    const rabbitLeftTextureUp = textureLoader.load(rabbitLeftUpImg);
    const rabbitLeftTextureDown = textureLoader.load(rabbitLeftDownImg);
    
    const numRightRabbits = 4;
    const numLeftRabbits = 4;
    const totalRabbits = numRightRabbits + numLeftRabbits; // 4 right + 4 left = 8 total
    const rabbits: typeof rabbitsRef.current = [];
    const usedIndices = new Set<number>();
    
    for (let i = 0; i < totalRabbits; i++) {
      let cubeIndex;
      do {
        cubeIndex = Math.floor(Math.random() * count);
      } while (usedIndices.has(cubeIndex));
      usedIndices.add(cubeIndex);
      
      // First 4 rabbits use right-facing textures, next 3 use left-facing
      const isLeftFacing = i >= numRightRabbits;
      const idleTexture = isLeftFacing ? rabbitLeftTextureIdle : rabbitTextureIdle;
      const upTexture = isLeftFacing ? rabbitLeftTextureUp : rabbitTextureUp;
      const downTexture = isLeftFacing ? rabbitLeftTextureDown : rabbitTextureDown;
      
      // Each rabbit gets its own material so we can switch textures independently
      const material = new THREE.SpriteMaterial({ map: idleTexture });
      const sprite = new THREE.Sprite(material);
      // Use unified sprite size for both directions
      sprite.scale.set(RABBIT_SPRITE_SIZE, RABBIT_SPRITE_SIZE, 1);
      
      // 获取初始方块位置
      const initCube = cubes[cubeIndex];
      
      // 设置 sprite 初始位置（修复：之前没有设置，导致兔子都在原点）
      sprite.position.set(
        initCube.position.x,
        initCube.scale.y + RABBIT_Y_OFFSET,
        initCube.position.z
      );
      
      scene.add(sprite);
      
      rabbits.push({
        sprite,
        cubeIndex,
        targetCubeIndex: cubeIndex,  // 初始等于当前
        velocityY: 0,
        isJumping: false,
        startX: initCube.position.x,
        startZ: initCube.position.z,
        hopProgress: 1,  // 1表示已到达目标
        textures: {
          idle: idleTexture,
          up: upTexture,
          down: downTexture
        }
      });
    }
    rabbitsRef.current = rabbits;

    // ===== RESIZE HANDLER =====
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ===== CLEANUP =====
    return () => {
      resizeObserver.disconnect();
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      cubeGeometry.dispose();
      shaderMaterial.dispose();
    };
  }, []); // Only run once - color updates handled by separate useEffect

  // ===== COLOR THEME UPDATE (lightweight, no scene rebuild) =====
  useEffect(() => {
    // Update ref for future initializations
    colorThemeRef.current = colorTheme;
    
    // Skip if scene not initialized yet
    if (!sceneRef.current || !shaderMaterialRef.current || !bgTextureRef.current) {
      return;
    }

    const colorScheme = CUBES_COLOR_SCHEMES[colorTheme];
    const scene = sceneRef.current;
    const shaderMaterial = shaderMaterialRef.current;
    const bgTexture = bgTextureRef.current;

    // 1. Update background gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, colorScheme.bgTop);
    gradient.addColorStop(1, colorScheme.bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    
    // Update existing texture instead of creating new one
    bgTexture.image = canvas;
    bgTexture.needsUpdate = true;

    // 2. Update fog color
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.set(colorScheme.bgBottom);
    }

    // 3. Update shader uniforms (cube colors)
    shaderMaterial.uniforms.colorBottom.value.setRGB(...colorScheme.cubeBottom);
    shaderMaterial.uniforms.colorTop.value.setRGB(...colorScheme.cubeTop);
  }, [colorTheme]);

  // Track bottom inset (controls height) without retriggering heavy effects
  useEffect(() => {
    uiBottomInsetPxRef.current = uiBottomInsetPx ?? 0;
  }, [uiBottomInsetPx]);

  // ===== ANIMATION LOOP =====
  useEffect(() => {
    if (cubesRef.current.length === 0 || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return;
    }

    if (analyser) {
      audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const cubes = cubesRef.current;
    const noise = noiseRef.current;
    const container = containerRef.current;
    const halfGrid = (GRID_SIZE - 1) * CUBE_SPACING / 2;
    const maxDistance = Math.sqrt(halfGrid * halfGrid + halfGrid * halfGrid);

    // Use a stable time source + dt clamp to make motion frame-rate independent.
    let lastNow = performance.now();
    let t = 0; // accumulated seconds for idle/noise time

    const resetClock = () => {
      lastNow = performance.now();
    };
    const onVisibilityChange = () => {
      // Prevent a huge dt on the first frame after returning to foreground
      if (!document.hidden) resetClock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      let dt = (now - lastNow) / 1000;
      lastNow = now;
      if (!Number.isFinite(dt) || dt < 0) dt = 0;
      if (dt > MAX_DT) dt = MAX_DT;
      const frameScale = dt * BASELINE_FPS; // how many 60fps steps this tick represents
      t += dt;

      // Keep background full-screen; only shift the framing up to avoid overlapping bottom controls.
      // IMPORTANT: Do NOT move the scene in world space, because the shader colors depend on WORLD Y.
      if (container) {
        const insetPx = Math.max(0, uiBottomInsetPxRef.current);
        const h = Math.max(1, container.clientHeight);
        const ratio = THREE.MathUtils.clamp(insetPx / h, 0, 0.5);
        // Ratio -> lookAt shift (tuned). Looking slightly lower pushes the content upward on screen.
        const targetShift = THREE.MathUtils.clamp(ratio * 6.0, 0, 2.5);
        // Time-based smoothing: keep the same feel across FPS (0.12 tuned for ~60fps).
        const camAlpha = 1 - Math.pow(1 - 0.12, frameScale);
        lookAtShiftRef.current = THREE.MathUtils.lerp(lookAtShiftRef.current, targetShift, camAlpha);
        camera.lookAt(0, 1 - lookAtShiftRef.current, 0);
      }

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(audioDataRef.current);
      }

      const audioData = audioDataRef.current;
      const count = cubes.length;
      // Old: Date.now() * 0.0005 increases by 0.5 per second. Keep the same slope using accumulated time.
      const time = t * 0.5;
        
        for (let i = 0; i < count; i++) {
        const cube = cubes[i];
        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;
        const x = col * CUBE_SPACING - halfGrid;
        const z = row * CUBE_SPACING - halfGrid;

        const distance = Math.sqrt(x * x + z * z);
        const normalizedDistance = distance / maxDistance;

        const spreadFactor = 1.0 / Math.max(0.1, params.spread);
        const frequencyIndex = Math.floor(
          Math.pow(normalizedDistance, spreadFactor) * audioData.length * 0.4
        );
          
          let audioValue = 0;
        if (isPlaying && analyser && audioData.length > 0) {
          const idx = Math.min(frequencyIndex, audioData.length - 1);
          const rawValue = audioData[idx] / 255.0;
          audioValue = Math.pow(rawValue, 2.5);
          } else {
          // Idle animation - gentle wave
          audioValue = (Math.sin(distance * 0.5 - time * 2.0) + 1.0) * 0.05;
          }

        const noiseVal = (noise.noise3d(x * 0.2, z * 0.2, time * 0.5) + 1) * 0.5;
        const maskedAudioValue = audioValue * (0.4 + 0.6 * noiseVal);

        const baseScale = 0.3 + noiseVal * 0.4;
        const targetScale = baseScale + maskedAudioValue * params.height * 10.0;

        const currentScale = currentScalesRef.current[i];
        // params.damping is a per-frame lerp factor (tuned for ~60fps).
        // Convert to time-based alpha so response-per-second is consistent across FPS.
        const lerpFactor = THREE.MathUtils.clamp(params.damping, 0, 1);
        const alpha = 1 - Math.pow(1 - lerpFactor, frameScale);
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, alpha);
        currentScalesRef.current[i] = newScale;

        // Update cube height (scale Y)
        // The SHADER automatically colors based on WORLD Y position!
        // - Y=0 (ground) → blue
        // - Y=MAX_HEIGHT → white
        // The gradient is FIXED in world space, NOT stretched!
        // A short cube only reaches a bluer color at its top
        // A tall cube reaches a whiter color at its top
        const oldScaleY = cube.scale.y;
        cube.scale.y = newScale;

        // Physics for rabbits attached to this cube
        const rabbit = rabbitsRef.current.find(r => r.cubeIndex === i);
        if (rabbit) {
          // Control rabbit visibility based on params
          rabbit.sprite.visible = params.showRabbits;
          const cubeTopY = newScale;
          const targetTopY = cubeTopY + RABBIT_Y_OFFSET;
          // Rabbit physics runs in units/sec to be frame-rate independent.
          const dtSec = dt;
          // Cube top velocity (units/sec) for jump trigger & initial impulse.
          const cubeDeltaY = newScale - oldScaleY;
          const cubeTopVelPerSec = dtSec > 0 ? (cubeDeltaY / dtSec) : 0;
          
                  // When NOT playing: freeze rabbit completely on cube top
                  if (!isPlaying) {
                    rabbit.isJumping = false;
                    rabbit.velocityY = 0;
                    rabbit.sprite.position.x = cube.position.x;
                    rabbit.sprite.position.y = targetTopY;
                    rabbit.sprite.position.z = cube.position.z;
                    rabbit.sprite.material.map = rabbit.textures.idle;
                  } else {
            // Only trigger jump when cube rises significantly
            if (cubeTopVelPerSec > RABBIT_JUMP_TRIGGER_VY_PER_SEC && !rabbit.isJumping) {
              // Initial impulse = cube's upward velocity + a constant "pop"
              rabbit.velocityY = cubeTopVelPerSec + RABBIT_POP_VY_PER_SEC;
              rabbit.isJumping = true;
              rabbit.targetCubeIndex = rabbit.cubeIndex; // 默认原地跳
              
              // 只有动势足够大才跳到其他方块
              if (rabbit.velocityY > HOP_VELOCITY_THRESHOLD) {
                // 获取所有被占用的方块（当前位置 + 已预订的目标）
                const occupiedIndices = getOccupiedCubes(rabbitsRef.current, rabbit);
                
                const nearbyCubes = getNearbyCubes(rabbit.cubeIndex, MAX_HOP_GRID_DISTANCE, occupiedIndices);
                if (nearbyCubes.length > 0) {
                  rabbit.startX = rabbit.sprite.position.x;
                  rabbit.startZ = rabbit.sprite.position.z;
                  rabbit.targetCubeIndex = nearbyCubes[Math.floor(Math.random() * nearbyCubes.length)];
                  rabbit.hopProgress = 0;
                }
                // 如果附近都被占了，保持原地跳
              }
            }
            
            if (rabbit.isJumping) {
              // Air resistance (exponential decay, frame-rate independent)
              rabbit.velocityY *= Math.exp(RABBIT_AIR_DAMP_LOG_PER_SEC * dtSec);
              // Gravity (units/sec^2)
              rabbit.velocityY -= RABBIT_GRAVITY_PER_SEC2 * dtSec;
              // Integrate vertical position
              rabbit.sprite.position.y += rabbit.velocityY * dtSec;
              
              // 水平移动插值（跳到其他方块时）
              if (rabbit.hopProgress < 1 && rabbit.targetCubeIndex !== rabbit.cubeIndex) {
                rabbit.hopProgress = Math.min(1, rabbit.hopProgress + dtSec * 2.5);
                const t = rabbit.hopProgress;
                // easeInOutQuad 缓动函数
                const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                
                const targetCube = cubes[rabbit.targetCubeIndex];
                rabbit.sprite.position.x = THREE.MathUtils.lerp(rabbit.startX, targetCube.position.x, easeT);
                rabbit.sprite.position.z = THREE.MathUtils.lerp(rabbit.startZ, targetCube.position.z, easeT);
              }
              
              // Switch texture based on vertical direction
              if (rabbit.velocityY > 0) {
                rabbit.sprite.material.map = rabbit.textures.up;
              } else {
                rabbit.sprite.material.map = rabbit.textures.down;
              }
              
              // 落地检测 - 使用目标方块高度
              const targetCube = cubes[rabbit.targetCubeIndex];
              const landingTopY = targetCube.scale.y + RABBIT_Y_OFFSET;
              
              if (rabbit.velocityY < 0 && rabbit.sprite.position.y <= landingTopY) {
                // 兜底冲突检测：检查目标方块是否被别人抢了
                const isTargetOccupied = rabbitsRef.current.some(
                  r => r !== rabbit && 
                       !r.isJumping && 
                       r.cubeIndex === rabbit.targetCubeIndex
                );
                
                if (isTargetOccupied) {
                  // 被抢了，弹回原位
                  rabbit.targetCubeIndex = rabbit.cubeIndex;
                  rabbit.velocityY = 3.0; // 小幅弹起重新找位置
                } else {
                  // 正常落地：更新当前方块为目标方块
                  rabbit.cubeIndex = rabbit.targetCubeIndex;
                  rabbit.sprite.position.y = landingTopY;
                  rabbit.hopProgress = 1;
                  
                  // 落地直接进入 idle（取消弹跳）
                  rabbit.velocityY = 0;
                  rabbit.isJumping = false;
                  rabbit.sprite.material.map = rabbit.textures.idle;
                }
              }
            } else {
              // Stick to cube top
              rabbit.velocityY = 0;
              rabbit.sprite.position.y = targetTopY;
              rabbit.sprite.material.map = rabbit.textures.idle;
              
              // 静止时XZ跟随当前方块
              rabbit.sprite.position.x = cube.position.x;
              rabbit.sprite.position.z = cube.position.z;
            }

            // Safety cap: if rabbit flies too high, reset to current cube top
            if (rabbit.sprite.position.y > targetTopY + MAX_RABBIT_HEIGHT) {
              rabbit.sprite.position.y = targetTopY;
              rabbit.velocityY = 0;
              rabbit.isJumping = false;
              rabbit.targetCubeIndex = rabbit.cubeIndex;
              rabbit.hopProgress = 1;
              rabbit.sprite.material.map = rabbit.textures.idle;
            }
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [analyser, isPlaying, params]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
    />
  );
};

export default CubesVisualizer;
