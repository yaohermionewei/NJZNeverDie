import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import rabbitImg from '../assets/rabbit.webp';
import rabbitFlyUpImg from '../assets/rabbitflyup.webp';
import rabbitDropDownImg from '../assets/rabbitdropdown.webp';
import rabbitLeftImg from '../assets/rabbitleft.webp';
import rabbitLeftFlyUpImg from '../assets/leftflyup.webp';
import rabbitLeftDropDownImg from '../assets/leftdropdown.webp';

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
    bgTop: '#F5EEEE',
    bgBottom: '#F3D4D6',
    cubeBottom: [0.875, 0.392, 0.416], // #DF646A
    cubeTop: [1.0, 0.969, 0.969],      // #FFF7F7
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
const RABBIT_Y_OFFSET = 0.6; // feet sit on cube top (increased from 0.4 for larger sprite)
const MAX_RABBIT_HEIGHT = 6.0; // safety cap above cube top to prevent numeric explosions

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
    velocityY: number;
    isJumping: boolean;
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
    const cubeGeometry = new THREE.BoxGeometry(1.0, 1, 1.0);
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
    const rabbitTextureIdle = textureLoader.load(rabbitImg);
    const rabbitTextureUp = textureLoader.load(rabbitFlyUpImg);
    const rabbitTextureDown = textureLoader.load(rabbitDropDownImg);
    // Left-facing rabbit textures
    const rabbitLeftTextureIdle = textureLoader.load(rabbitLeftImg);
    const rabbitLeftTextureUp = textureLoader.load(rabbitLeftFlyUpImg);
    const rabbitLeftTextureDown = textureLoader.load(rabbitLeftDropDownImg);
    
    const numRightRabbits = 4;
    const numLeftRabbits = 3;
    const totalRabbits = numRightRabbits + numLeftRabbits; // 4 right + 3 left = 7 total
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
      // Right-facing rabbits: 1.2, Left-facing rabbits: 1.4 (to match different asset sizes)
      const spriteSize = isLeftFacing ? 1.4 : 1.2;
      sprite.scale.set(spriteSize, spriteSize, 1);
      scene.add(sprite);
      
      rabbits.push({
        sprite,
        cubeIndex,
        velocityY: 0,
        isJumping: false,
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

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Keep background full-screen; only shift the framing up to avoid overlapping bottom controls.
      // IMPORTANT: Do NOT move the scene in world space, because the shader colors depend on WORLD Y.
      if (container) {
        const insetPx = Math.max(0, uiBottomInsetPxRef.current);
        const h = Math.max(1, container.clientHeight);
        const ratio = THREE.MathUtils.clamp(insetPx / h, 0, 0.5);
        // Ratio -> lookAt shift (tuned). Looking slightly lower pushes the content upward on screen.
        const targetShift = THREE.MathUtils.clamp(ratio * 6.0, 0, 2.5);
        lookAtShiftRef.current = THREE.MathUtils.lerp(lookAtShiftRef.current, targetShift, 0.12);
        camera.lookAt(0, 1 - lookAtShiftRef.current, 0);
      }

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(audioDataRef.current);
      }

      const audioData = audioDataRef.current;
      const count = cubes.length;
      const time = Date.now() * 0.0005;
        
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
        const lerpFactor = params.damping;
        const newScale = THREE.MathUtils.lerp(currentScale, targetScale, lerpFactor);
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
          const cubeVelocityY = newScale - oldScaleY;
          
          // When NOT playing: freeze rabbit completely on cube top
          if (!isPlaying) {
            rabbit.isJumping = false;
            rabbit.velocityY = 0;
            rabbit.sprite.position.y = targetTopY;
            rabbit.sprite.material.map = rabbit.textures.idle;
          } else {
            // Only trigger jump when cube rises significantly
            if (cubeVelocityY > 0.06 && !rabbit.isJumping) {
              // Vital Fix: Rabbit velocity must be GREATER than cube velocity to "break away"
              // Add a small constant "pop" so it always lifts off
              rabbit.velocityY = cubeVelocityY + 0.15; 
              rabbit.isJumping = true;
            }
            
            if (rabbit.isJumping) {
              // Air resistance (damping)
              rabbit.velocityY *= 0.97;
              // Gravity
              rabbit.velocityY -= 0.015;
              rabbit.sprite.position.y += rabbit.velocityY;
              
              // Switch texture based on vertical direction
              if (rabbit.velocityY > 0) {
                rabbit.sprite.material.map = rabbit.textures.up;
              } else {
                rabbit.sprite.material.map = rabbit.textures.down;
              }
              
              // Collision with cube top - ONLY detect when falling down
              if (rabbit.velocityY < 0 && rabbit.sprite.position.y <= targetTopY) {
                rabbit.sprite.position.y = targetTopY;
                
                // If hitting hard enough, tiny bounce, otherwise stay
                if (Math.abs(rabbit.velocityY) > 0.03) {
                  rabbit.velocityY = -rabbit.velocityY * 0.15; // Damping
                } else {
                  rabbit.velocityY = 0;
                  rabbit.isJumping = false;
                  rabbit.sprite.material.map = rabbit.textures.idle;
                }
              }
            } else {
              // Stick to cube top
              rabbit.sprite.position.y = targetTopY;
              rabbit.sprite.material.map = rabbit.textures.idle;
            }

            // Safety cap: if rabbit flies too high, reset to top
            if (rabbit.sprite.position.y > targetTopY + MAX_RABBIT_HEIGHT) {
              rabbit.sprite.position.y = targetTopY;
              rabbit.velocityY = 0;
              rabbit.isJumping = false;
              rabbit.sprite.material.map = rabbit.textures.idle;
            }
          }
          
          // Position XZ matches cube
          rabbit.sprite.position.x = cube.position.x;
          rabbit.sprite.position.z = cube.position.z;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
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
