
import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import LyricsView from './components/LyricsView';
import VinylRecord from './components/VinylRecord';
import Controls from './components/Controls';
import AudioVisualizer from './components/AudioVisualizer';
import ParticleVisualizer, { ParticleParams } from './components/ParticleVisualizer';
import ParticleControls from './components/ParticleControls';
import CubesVisualizer, { CubesParams } from './components/CubesVisualizer';
import CubesControls from './components/CubesControls';
import VinylControls, { DEFAULT_VINYL_PARAMS } from './components/VinylControls';
import PowerpuffVisualizer from './components/PowerpuffVisualizer';
import PowerpuffControls, { DEFAULT_POWERPUFF_PARAMS } from './components/PowerpuffControls';
import { isFullscreenTheme, isDarkTheme } from './components/themeRegistry';
import PlaylistDrawer from './components/PlaylistDrawer';
import ThemeDrawer from './components/ThemeDrawer';
import { SONGS, getSongById, getDefaultSong } from './songRegistry';
import { parseLrc } from './utils/lrcParser';
import { LyricLine, ThemeMode, VinylParams } from './types';

// ===== Hidden-UI two-line lyric renderer (scrolling + wrap-aware) =====
// Used by Cubes/Particle themes when UI is hidden.
// Goals:
// - Keep the original smooth "scroll" feel (like the old translateY implementation)
// - Allow a lyric line to wrap to 2 lines when needed (with maxWidth constraint)
// - If a line wraps to 2 lines, it occupies both rows while active, then yields BOTH rows on next timestamp
//   (so we show: current + next, rather than leaving the previous line's second row lingering).
const HIDDEN_LYRIC_LINE_HEIGHT_PX = 26;
const HIDDEN_LYRIC_BLOCK_HEIGHT_PX = HIDDEN_LYRIC_LINE_HEIGHT_PX * 2;

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

const HiddenLyricScroller: React.FC<{
  lyrics: LyricLine[];
  currentIndex: number;
  align: 'left' | 'center';
  paddingClassName?: string;
  widthStyle?: React.CSSProperties;
  inactiveColor: string;
  activeColor: string;
  inactiveOpacity: number;
  activeOpacity: number;
}> = ({
  lyrics,
  currentIndex,
  align,
  paddingClassName,
  widthStyle,
  inactiveColor,
  activeColor,
  inactiveOpacity,
  activeOpacity
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [lineUnits, setLineUnits] = useState<number[]>([]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useLayoutEffect(() => {
    const m = measureRef.current;
    if (!m || containerWidth <= 0) return;
    if (!lyrics || lyrics.length === 0) {
      setLineUnits([]);
      return;
    }

    // Measure each lyric line: if it needs >1 line at this width, treat as 2-line block.
    // This drives both layout (height 26/52) and scroll offset (prefix sums).
    const units: number[] = new Array(lyrics.length).fill(1);
    for (let i = 0; i < lyrics.length; i++) {
      m.textContent = lyrics[i]?.text ?? '';
      // If scrollHeight exceeds one row, we consider it a 2-line lyric for this UI.
      const wraps = (m.scrollHeight ?? 0) > HIDDEN_LYRIC_LINE_HEIGHT_PX + 1;
      units[i] = wraps ? 2 : 1;
    }
    setLineUnits(units);
  }, [lyrics, containerWidth]);

  const units = lineUnits.length === lyrics.length ? lineUnits : lyrics.map(() => 1);
  const prefix = useMemo(() => {
    const p: number[] = new Array(units.length + 1);
    p[0] = 0;
    for (let i = 0; i < units.length; i++) {
      p[i + 1] = p[i] + units[i] * HIDDEN_LYRIC_LINE_HEIGHT_PX;
    }
    return p;
  }, [units]);

  // NOTE: Keep line-height in inline styles (per-line) so Tailwind build doesn't need to generate dynamic leading-[...]
  const baseTextClass = 'text-[16px] font-normal transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)]';
  const alignClass = align === 'left' ? 'text-left' : 'text-center';
  const paddingClass = paddingClassName ?? '';

  const safeIndex = currentIndex >= 0 ? Math.min(currentIndex, Math.max(0, lyrics.length - 1)) : -1;
  const currentWraps = safeIndex >= 0 ? units[safeIndex] === 2 : false;
  const prevWraps = safeIndex > 0 ? units[safeIndex - 1] === 2 : false;

  // Windowing rule:
  // - If current wraps, it occupies both rows.
  // - If previous wraps, previous yields BOTH rows after it ends, so we show current + next.
  // - Otherwise, show previous + current (original behavior).
  const startIndex =
    safeIndex < 0 ? 0
      : currentWraps ? safeIndex
        : (safeIndex === 0 || prevWraps) ? safeIndex
          : Math.max(0, safeIndex - 1);

  const scrollPx = prefix[startIndex] ?? 0;

  // Which non-active line is the "secondary" line in the 2-row window
  const secondaryIndex =
    safeIndex < 0 ? -1
      : currentWraps ? -1
        : (safeIndex === 0 || prevWraps) ? safeIndex + 1
          : safeIndex - 1;

  const measureStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    // Match rendering typography + wrapping rules
    lineHeight: `${HIDDEN_LYRIC_LINE_HEIGHT_PX}px`,
    fontSize: '16px',
    fontWeight: 400,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word',
    // Allow natural height for measurement
    height: 'auto',
    pointerEvents: 'none',
    opacity: 0
  };

  const lineClampStyle = (clampLines: number): React.CSSProperties => ({
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical' as any,
    WebkitLineClamp: clampLines as any,
    overflow: 'hidden',
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word'
  });

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${alignClass}`}
      style={{ height: `${HIDDEN_LYRIC_BLOCK_HEIGHT_PX}px`, ...(widthStyle ?? {}) }}
    >
      {/* Invisible measurer: shares the same width/padding constraints as the visible list */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className={`${paddingClass}`}
        style={measureStyle}
      />

      {/* Scrolling list (smooth translateY) */}
      <div
        className={`transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${paddingClass}`}
        style={{ transform: `translateY(-${scrollPx}px)` }}
      >
        {lyrics.map((line, idx) => {
          const u = units[idx] ?? 1;
          const h = u * HIDDEN_LYRIC_LINE_HEIGHT_PX;
          const isActive = idx === safeIndex;
          const isSecondary = idx === secondaryIndex;
          const opacity = isActive ? activeOpacity : isSecondary ? inactiveOpacity : 0;
          const color = isActive ? activeColor : inactiveColor;

          return (
            <div
              key={idx}
              className={baseTextClass}
              style={{
                height: `${h}px`,
                lineHeight: `${HIDDEN_LYRIC_LINE_HEIGHT_PX}px`,
                opacity: clamp01(opacity),
                color,
                ...lineClampStyle(u)
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Preload Cubes theme rabbit images (default theme - load immediately)
import rabbitRightIdleImg from './assets/rabbit/rabbit_right_idle.webp';
import rabbitRightUpImg from './assets/rabbit/rabbit_right_up.webp';
import rabbitRightDownImg from './assets/rabbit/rabbit_right_down.webp';
import rabbitLeftIdleImg from './assets/rabbit/rabbit_left_idle.webp';
import rabbitLeftUpImg from './assets/rabbit/rabbit_left_up.webp';
import rabbitLeftDownImg from './assets/rabbit/rabbit_left_down.webp';

// Start preloading before component mounts (browser will cache these)
[rabbitRightIdleImg, rabbitRightUpImg, rabbitRightDownImg, rabbitLeftIdleImg, rabbitLeftUpImg, rabbitLeftDownImg]
  .forEach(src => { const img = new Image(); img.src = src; });

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('cubes');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSongId, setCurrentSongId] = useState<string>(getDefaultSong().id);
  const [volume, setVolume] = useState(0.8);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [isUIHidden, setIsUIHidden] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isThemeDrawerOpen, setIsThemeDrawerOpen] = useState(false);
  const [isLyricsPageOpen, setIsLyricsPageOpen] = useState(false); // 移动端全屏歌词页面
  const mouseIdleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const vinylRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  // Performance optimization: throttle currentTime updates
  const lastTimeUpdateRef = useRef<number>(0);
  const lastLyricIndexRef = useRef<number>(-1);
  // Mobile layout: measure bottom controls height to avoid visualizer overlap
  const [controlsHeightPx, setControlsHeightPx] = useState<number>(0);
  const [smallLyricTop, setSmallLyricTop] = useState<number | null>(null);
  const [smallLyricMaxHeight, setSmallLyricMaxHeight] = useState<number | null>(null);
  
  // iOS/移动端：使用 VisualViewport 拿到“真实可见高度”，避免底部浏览器栏覆盖内容
  useEffect(() => {
    const vv = window.visualViewport;
    const syncViewport = () => {
      const h = vv?.height ?? window.innerHeight;
      // round to avoid sub-pixel thrash in layout
      document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`);
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    vv?.addEventListener('resize', syncViewport);
    vv?.addEventListener('scroll', syncViewport);
    return () => {
      window.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);
    };
  }, []);

  // Measure bottom controls height (dynamic, responsive to iOS browser bars / font size changes)
  useLayoutEffect(() => {
    const el = controlsRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const h = Math.max(0, Math.round(rect.height));
      setControlsHeightPx(h);
    };

    measure();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    ro?.observe(el);

    const vv = window.visualViewport;
    vv?.addEventListener('resize', measure);
    vv?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);

    return () => {
      ro?.disconnect();
      vv?.removeEventListener('resize', measure);
      vv?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, []);
  
  // Get current song info from registry
  const currentSong = useMemo(() => getSongById(currentSongId) || getDefaultSong(), [currentSongId]);

  // Helper to format song title with Remix info
  const formattedSongInfo = useMemo(() => {
    const title = currentSong.title;
    // Ditto - 250 Remix -> Ditto(250Remix)
    const remixMatch = title.match(/^(.*?)\s*-\s*(.*Remix)$/i);
    if (remixMatch) {
      const baseTitle = remixMatch[1].trim();
      const remixPart = remixMatch[2].replace(/\s+/g, '');
      return `${baseTitle}(${remixPart}) - ${currentSong.artist}`;
    }
    return `${title} - ${currentSong.artist}`;
  }, [currentSong]);

  // Calculate current and previous lyrics for the hidden UI
  const currentIndex = useMemo(() => {
    return lyrics.findIndex((l, i) => {
      const nextL = lyrics[i + 1];
      return currentTime >= l.time && (!nextL || currentTime < nextL.time);
    });
  }, [lyrics, currentTime]);

  const { currentLyric, prevLyric } = useMemo(() => {
    return {
      currentLyric: currentIndex !== -1 ? lyrics[currentIndex].text : '',
      prevLyric: currentIndex > 0 ? lyrics[currentIndex - 1].text : ''
    };
  }, [lyrics, currentIndex]);
  
  // Particle Params State
  const [particleParams, setParticleParams] = useState<ParticleParams>(() => {
    const saved = localStorage.getItem('particleParams');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse particle params", e);
      }
    }
    return {
      density: 2, // Default step size (Display: 9)
      baseSize: 2.0,
      amplitude: 2.1,
      speed: 1.5
    };
  });

  // Cubes Params State
  const [cubesParams, setCubesParams] = useState<CubesParams>(() => {
    const saved = localStorage.getItem('cubesParams');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse cubes params", e);
      }
    }
    return {
      height: 0.9,
      spread: 1.5,
      damping: 0.25,
      showRabbits: true
    };
  });

  // Powerpuff Params State
  const [powerpuffParams, setPowerpuffParams] = useState(() => {
    const saved = localStorage.getItem('powerpuffParams');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_POWERPUFF_PARAMS, ...parsed };
      } catch (e) {
        console.error("Failed to parse powerpuff params", e);
      }
    }
    return DEFAULT_POWERPUFF_PARAMS;
  });

  // Vinyl Params State
  const [vinylParams, setVinylParams] = useState<VinylParams>(() => {
    const saved = localStorage.getItem('vinylParams');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse vinyl params", e);
      }
    }
    return DEFAULT_VINYL_PARAMS;
  });

  useEffect(() => {
    localStorage.setItem('cubesParams', JSON.stringify(cubesParams));
  }, [cubesParams]);

  useEffect(() => {
    localStorage.setItem('vinylParams', JSON.stringify(vinylParams));
  }, [vinylParams]);

  useEffect(() => {
    localStorage.setItem('powerpuffParams', JSON.stringify(powerpuffParams));
  }, [powerpuffParams]);

  useEffect(() => {
    localStorage.setItem('particleParams', JSON.stringify(particleParams));
  }, [particleParams]);

  // Parse and load lyrics when song changes
  useEffect(() => {
    if (currentSong.lrcSrc) {
      setLyrics(parseLrc(currentSong.lrcSrc));
    }
  }, [currentSong]);
  
  // Handle song change
  const handleSongChange = (songId: string) => {
    const newSong = getSongById(songId);
    if (!newSong || songId === currentSongId) return;
    
    const wasPlaying = audioRef.current ? !audioRef.current.paused : isPlaying;
    const shouldAutoPlay = forceAutoPlayRef.current || wasPlaying;
    forceAutoPlayRef.current = false;
    
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Reset state
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    
    // Reset throttle refs for new song
    lastTimeUpdateRef.current = 0;
    lastLyricIndexRef.current = -1;
    
    // Switch to new song
    shouldAutoPlayRef.current = shouldAutoPlay;
    setCurrentSongId(songId);
  };

  // Skip to previous song in playlist
  const handleSkipPrev = () => {
    const currentIndex = SONGS.findIndex(s => s.id === currentSongId);
    const prevIndex = currentIndex <= 0 ? SONGS.length - 1 : currentIndex - 1;
    handleSongChange(SONGS[prevIndex].id);
  };

  // Skip to next song in playlist
  const handleSkipNext = () => {
    const currentIndex = SONGS.findIndex(s => s.id === currentSongId);
    const nextIndex = currentIndex >= SONGS.length - 1 ? 0 : currentIndex + 1;
    handleSongChange(SONGS[nextIndex].id);
  };

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const pendingSeekRef = useRef<{
    targetTime: number;
    startedAtMs: number;
    deadlineAtMs: number;
  } | null>(null);
  const lastUserSeekAtMsRef = useRef<number>(0);
  const lastPlayAttemptAtMsRef = useRef<number>(0);
  const shouldAutoPlayRef = useRef<boolean>(false);
  const forceAutoPlayRef = useRef<boolean>(false);
  const recoveringRef = useRef<boolean>(false);
  const cooldownUntilMsRef = useRef<number>(0);
  const lastBackgroundTimeRef = useRef<number | null>(null);

  const initAudioContext = React.useCallback(() => {
      if (!audioRef.current || sourceRef.current) return;
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;
        
        const source = audioContext.createMediaElementSource(audioRef.current);
        source.connect(analyserNode);
        analyserNode.connect(audioContext.destination);
        
        audioContextRef.current = audioContext;
        sourceRef.current = source;
        setAnalyser(analyserNode);
      } catch (e) {
        console.error("Audio Context setup failed:", e);
      }
  }, []);

  const ensureAudioContext = React.useCallback(async () => {
      if (!audioContextRef.current) {
         initAudioContext();
      }
    const ctx = audioContextRef.current;
    if (ctx?.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        // iOS may reject resume() without a user gesture; ignore.
      }
    }
  }, [initAudioContext]);

  // Background handling: force pause and freeze time to avoid mobile pipeline drift.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const pauseAndFreeze = () => {
      const t = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      lastBackgroundTimeRef.current = t;
      pendingSeekRef.current = null;
      shouldAutoPlayRef.current = false;
      forceAutoPlayRef.current = false;
      try {
        audio.pause();
      } catch {
        // ignore
      }
      setIsPlaying(false);
      const ctx = audioContextRef.current;
      if (ctx) {
        ctx.suspend().catch(() => {});
      }
    };

    const restoreTime = () => {
      const t = lastBackgroundTimeRef.current;
      if (t == null || !Number.isFinite(t)) return;
      try {
        audio.currentTime = t;
      } catch {
        // ignore
      }
      setCurrentTime(t);
      lastTimeUpdateRef.current = t;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseAndFreeze();
      } else {
        restoreTime();
      }
    };

    const handlePageHide = () => pauseAndFreeze();
    const handlePageShow = () => restoreTime();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Initialize/Resume AudioContext on first real user interaction (mobile autoplay policies)
  useEffect(() => {
    const handleInteraction = () => {
      void ensureAudioContext();
    };
    window.addEventListener('pointerdown', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleInteraction);
       window.removeEventListener('keydown', handleInteraction);
    };
  }, [ensureAudioContext]);

  // Auto-play after song change when the previous song was playing
  useEffect(() => {
    if (!shouldAutoPlayRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    shouldAutoPlayRef.current = false;

    const playNext = async () => {
      try {
        lastPlayAttemptAtMsRef.current = performance.now();
        await ensureAudioContext();
        await audio.play();
      } catch {
        // Ignore: play() can reject on mobile due to gesture policy or transient pipeline issues.
      }
    };

    void playNext();
  }, [currentSongId, ensureAudioContext]);

  // Toggle Play/Pause
  const togglePlay = React.useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.paused) {
        lastPlayAttemptAtMsRef.current = performance.now();
        await ensureAudioContext();
        await audio.play();
    } else {
        audio.pause();
      }
    } catch {
      // Ignore: play() can reject on mobile due to gesture policy or transient pipeline issues.
    }
  }, [ensureAudioContext]);

  const waitForTimeNear = React.useCallback(async (targetTime: number, timeoutMs: number) => {
    const audio = audioRef.current;
    if (!audio) return false;
    const start = performance.now();
    const EPS = 0.25; // seconds
    while (performance.now() - start < timeoutMs) {
      const t = audio.currentTime;
      if (Number.isFinite(t) && Math.abs(t - targetTime) <= EPS) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }, []);

  const selfHeal = React.useCallback(async (reason: 'watchdog' | 'seek') => {
    const audio = audioRef.current;
    if (!audio) return false;
    const now = performance.now();
    if (recoveringRef.current) return false;
    if (now < cooldownUntilMsRef.current) return false;
    recoveringRef.current = true;
    cooldownUntilMsRef.current = now + 5000;

    const t0 = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;

    const trySoft = async () => {
      try { await ensureAudioContext(); } catch {}
      try { audio.pause(); } catch {}
      try { audio.currentTime = Math.max(0, t0 - 0.05); } catch {}
      try {
        lastPlayAttemptAtMsRef.current = performance.now();
        await audio.play();
        // Give it a brief moment to move.
        const ok = await waitForTimeNear(Math.max(0, t0 - 0.05), 400);
        return ok;
      } catch {
        return false;
      }
    };

    const waitCanPlay = async () => {
      return await new Promise<boolean>((resolve) => {
        let done = false;
        const finish = (ok: boolean) => {
          if (done) return;
          done = true;
          audio.removeEventListener('canplay', onCanPlay);
          audio.removeEventListener('loadedmetadata', onCanPlay);
          audio.removeEventListener('error', onErr);
          resolve(ok);
        };
        const onCanPlay = () => finish(true);
        const onErr = () => finish(false);
        audio.addEventListener('canplay', onCanPlay, { once: true });
        audio.addEventListener('loadedmetadata', onCanPlay, { once: true });
        audio.addEventListener('error', onErr, { once: true });
        setTimeout(() => finish(true), 1500);
      });
    };

    const tryHard = async () => {
      try { await ensureAudioContext(); } catch {}
      try { audio.pause(); } catch {}
      try {
        const src = (audio as any).currentSrc || audio.src;
        if (src) (audio as any).src = src;
        audio.load();
        await waitCanPlay();
        const d = Number.isFinite(audio.duration) ? audio.duration : duration;
        const t = Math.max(0, Math.min(t0, Number.isFinite(d) && d > 0 ? d - 0.01 : t0));
        try { audio.currentTime = t; } catch {}
        lastPlayAttemptAtMsRef.current = performance.now();
        await audio.play();
        const ok = await waitForTimeNear(t, 600);
        return ok;
      } catch {
        return false;
      }
    };

    let ok = false;
    ok = await trySoft();
    if (!ok) ok = await tryHard();

    recoveringRef.current = false;
    return ok;
  }, [ensureAudioContext, waitForTimeNear, duration]);

  const safeSeek = React.useCallback(async (time: number, opts?: { autoPlay?: boolean }) => {
    const audio = audioRef.current;
    if (!audio) return;
    const autoPlay = opts?.autoPlay ?? true;
    const now = performance.now();
    lastUserSeekAtMsRef.current = now;

    const d = Number.isFinite(audio.duration) ? audio.duration : duration;
    const t = Math.max(0, Math.min(time, Number.isFinite(d) && d > 0 ? d : time));

    // Expose desired time immediately for UI; onTimeUpdate will respect seek grace.
    pendingSeekRef.current = { targetTime: t, startedAtMs: now, deadlineAtMs: now + 1200 };
    setCurrentTime(t);
    lastTimeUpdateRef.current = t;

    const attempt = async () => {
      try { await ensureAudioContext(); } catch {}
      try { audio.currentTime = t; } catch {}
      if (autoPlay) {
        try {
          lastPlayAttemptAtMsRef.current = performance.now();
          await audio.play();
        } catch {
          // ignore
        }
      }
      const ok = await waitForTimeNear(t, 900);
      return ok;
    };

    let ok = await attempt();
    if (!ok) {
      // heal and retry once
      await selfHeal('seek');
      ok = await attempt();
    }

    if (ok) {
      pendingSeekRef.current = null;
      // Keep throttle refs consistent with a successful user seek.
      lastTimeUpdateRef.current = t;
    } else {
      // Give up: fall back to real audio time to avoid a permanently fake UI.
      pendingSeekRef.current = null;
      const real = audio.currentTime;
      if (Number.isFinite(real)) {
        lastTimeUpdateRef.current = real;
        setCurrentTime(real);
      }
    }
  }, [duration, ensureAudioContext, selfHeal, waitForTimeNear]);

  // Handle Volume
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Update time - optimized to reduce unnecessary re-renders
  // Only update state when: 1) lyric changes, or 2) 1 second has passed
  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    const newTime = audioRef.current.currentTime;

    // Seek grace: after a user seek, avoid having timeupdate immediately snap UI back to 0
    // if the underlying media pipeline failed to apply the seek yet. If it doesn't settle
    // within the deadline, safeSeek will clear pending and UI will fall back to real time.
    const pending = pendingSeekRef.current;
    if (pending) {
      const now = performance.now();
      if (now <= pending.deadlineAtMs) {
        if (Number.isFinite(newTime) && Math.abs(newTime - pending.targetTime) > 2.0) {
          return;
        }
      } else {
        pendingSeekRef.current = null;
      }
    }
    
    // Calculate which lyric line should be active
    const newLyricIndex = lyrics.findIndex((l, i) => {
      const nextL = lyrics[i + 1];
      return newTime >= l.time && (!nextL || newTime < nextL.time);
    });
    
    // Condition 1: Lyric changed → update immediately
    const lyricChanged = newLyricIndex !== lastLyricIndexRef.current;
    
    // Condition 2: More than 1 second since last update → update (for progress bar & time display)
    const timeSinceLastUpdate = Math.abs(newTime - lastTimeUpdateRef.current);
    const needsPeriodicUpdate = timeSinceLastUpdate >= 1.0;
    
    if (lyricChanged || needsPeriodicUpdate) {
      lastLyricIndexRef.current = newLyricIndex;
      lastTimeUpdateRef.current = newTime;
      setCurrentTime(newTime);
    }
  };

  // Loaded Meta
  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Seek - 如果是暂停状态，跳转后自动播放
  const handleSeek = (time: number) => {
    void safeSeek(time, { autoPlay: true });
  };

  // Handle song end - auto play next song
  const onEnded = () => {
    // Auto skip to next song in playlist
    forceAutoPlayRef.current = true;
    handleSkipNext();
  };

  // Sync playing state with audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Initialize volume
    audio.volume = volume;

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [currentSong]);

  // Watchdog: detect "playing but audio.currentTime not advancing" and self-heal.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let lastAudioTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    let lastWall = performance.now();
    let stalledMs = 0;

    const tick = () => {
      const now = performance.now();
      const dtWall = now - lastWall;
      lastWall = now;

      // Don't heal in background or during explicit seeking.
      if (document.hidden || audio.seeking) {
        stalledMs = 0;
        lastAudioTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        return;
      }

      // Grace after user seek / play attempt to avoid false positives.
      const seekGrace = now - lastUserSeekAtMsRef.current < 1500;
      const playGrace = now - lastPlayAttemptAtMsRef.current < 1500;
      const pending = pendingSeekRef.current;
      const pendingGrace = pending ? now <= pending.deadlineAtMs : false;
      if (seekGrace || playGrace || pendingGrace) {
        stalledMs = 0;
        lastAudioTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        return;
      }

      if (audio.paused) {
        stalledMs = 0;
        lastAudioTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        return;
      }

      const t = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const advanced = t > lastAudioTime + 0.02;
      if (advanced) {
        stalledMs = 0;
        lastAudioTime = t;
        return;
      }

      stalledMs += dtWall;
      if (stalledMs >= 1500) {
        stalledMs = 0;
        void selfHeal('watchdog');
      }
    };

    const id = window.setInterval(tick, 250);

    // If the media pipeline reports waiting/stalled/error while not paused, try healing.
    const onWaiting = () => { if (!audio.paused) void selfHeal('watchdog'); };
    const onStalled = () => { if (!audio.paused) void selfHeal('watchdog'); };
    const onError = () => { if (!audio.paused) void selfHeal('watchdog'); };
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('error', onError);

    return () => {
      window.clearInterval(id);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('error', onError);
    };
  }, [currentSongId, selfHeal]);

  // Mouse idle detection - hide UI after 4 seconds of no mouse movement
  useEffect(() => {
    const handleMouseMove = () => {
      // Show UI when mouse moves
      setIsUIHidden(false);
      
      // Clear existing timer
      if (mouseIdleTimerRef.current) {
        clearTimeout(mouseIdleTimerRef.current);
      }
      
      // Set new timer to hide UI after 4 seconds
      mouseIdleTimerRef.current = setTimeout(() => {
        setIsUIHidden(true);
      }, 4000);
    };

    // Add mouse move listener
    window.addEventListener('mousemove', handleMouseMove);
    
    // Initialize the timer
    handleMouseMove();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseIdleTimerRef.current) {
        clearTimeout(mouseIdleTimerRef.current);
      }
    };
  }, []);

  // Small screen lyric positioning: place lyrics strictly BELOW the vinyl bottom edge.
  // We compute: lyricTop = vinylRect.bottom + gap, then clamp maxHeight to controlsTop (when controls visible)
  // or viewport bottom (when controls hidden).
  useLayoutEffect(() => {
    if (theme !== 'vinyl') return;

    const isSmall = () => window.innerWidth < 1024; // Tailwind lg breakpoint
    const bottomPadding = () => (isUIHidden ? 10 : 12);

    const update = () => {
      if (!isSmall()) {
        setSmallLyricTop(null);
        setSmallLyricMaxHeight(null);
        return;
      }
      if (!vinylRef.current) return;

      const vinylRect = vinylRef.current.getBoundingClientRect();
      const spaceBelowVinyl = Math.max(0, window.innerHeight - vinylRect.bottom);
      // Gap is derived from available empty space so we don't "guess" numbers:
      // - Visible: move down a bit (small fraction of empty space)
      // - Hidden: move down much more (larger fraction of empty space)
      // Use the same Y position for both visible/hidden states (same top).
      const g = Math.round(Math.min(72, Math.max(18, spaceBelowVinyl * 0.18)));

      const top = Math.round(vinylRect.bottom + g);

      const controlsTop = !isUIHidden && controlsRef.current
        ? Math.round(controlsRef.current.getBoundingClientRect().top)
        : null;

      const bottomLimit = controlsTop !== null
        ? Math.max(0, controlsTop - bottomPadding())
        : Math.max(0, window.innerHeight - bottomPadding());

      const maxH = Math.max(0, bottomLimit - top);

      setSmallLyricTop(top);
      setSmallLyricMaxHeight(maxH);
    };

    // Initial + next frame (helps when layout settles after transforms/fonts)
    update();
    const raf = requestAnimationFrame(update);

    const onResize = () => update();
    window.addEventListener('resize', onResize);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => update()) : null;
    if (ro) {
      if (vinylRef.current) ro.observe(vinylRef.current);
      if (controlsRef.current) ro.observe(controlsRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [theme, isUIHidden, currentSongId]);

  return (
    <div
      className="relative w-full bg-gray-50 overflow-hidden flex flex-col font-sans selection:bg-[#ff4d6a] selection:text-white"
      style={{ height: 'var(--app-height, 100vh)' }}
    >
      
      {/* Vinyl 背景模糊层：常驻挂载 + inline blur，避免 Tailwind CDN 首次进入时 blur 类“现编译”导致的露馅闪屏 */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 bg-cover bg-center scale-125 origin-top-right transition-opacity transition-transform duration-1000 ${
          theme === 'vinyl' ? 'opacity-25' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `url(${currentSong.coverUrl})`,
          filter: 'blur(120px)',
        }}
      />

      {/* Gradient Overlay Layer */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-0 bg-gradient-to-r from-gray-50 via-gray-50/90 to-transparent transition-opacity duration-500 ${
          theme === 'vinyl' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={currentSong.audioSrc}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        crossOrigin="anonymous"
        preload="metadata"
      />

      {/* Conditional Rendering based on Theme */}
      {theme === 'particle' && (
        <div className="absolute inset-0 z-10 overflow-hidden bg-black">
           <ParticleVisualizer 
             analyser={analyser} 
             coverUrl={currentSong.coverUrl}
             isPlaying={isPlaying}
             params={particleParams}
           />
           <ParticleControls 
             params={particleParams}
             onChange={setParticleParams}
             isUIHidden={isUIHidden}
           />
           
           {/* 新增：隐藏 UI 时的居中歌词与歌曲信息 */}
           {isUIHidden && (
             <div className="absolute bottom-12 left-0 right-0 z-20 flex flex-col items-center pointer-events-none animate-in fade-in duration-500">
               {/* 两行歌词（滚动 + 折行占两行 + 下一句延后显示） */}
               <HiddenLyricScroller
                 lyrics={lyrics}
                 currentIndex={currentIndex}
                 align="center"
                 paddingClassName="px-10"
                 widthStyle={{ width: '100%' }}
                 inactiveColor="white"
                 activeColor="white"
                 inactiveOpacity={0.4}
                 activeOpacity={0.7}
               />

               {/* 歌曲信息 */}
               <div className="text-[14px] text-white/30 font-normal mt-4 text-center">
                 {formattedSongInfo}
               </div>
             </div>
           )}
        </div>
      )}

      {theme === 'cubes' && (
        <div className="absolute inset-0 z-10 overflow-hidden">
           <CubesVisualizer 
             analyser={analyser} 
             isPlaying={isPlaying}
             params={cubesParams}
             colorTheme={currentSong.cubesTheme}
             // Keep background full-screen; only shift the "objects" framing up to avoid overlapping the controls.
             // Keep the scene stable when UI auto-hides: always reserve the same bottom inset.
             uiBottomInsetPx={Math.max(0, controlsHeightPx) + 12}
           />
           <CubesControls 
             params={cubesParams}
             onChange={setCubesParams}
             isUIHidden={isUIHidden}
           />
           
           {/* Hidden UI Lyrics & Song Info (Bottom Left) */}
           {isUIHidden && (
             <div className="absolute bottom-12 left-12 z-20 flex flex-col pointer-events-none animate-in fade-in duration-500">
               {/* 两行歌词（滚动 + 折行占两行 + 下一句延后显示） */}
               <HiddenLyricScroller
                 lyrics={lyrics}
                 currentIndex={currentIndex}
                 align="left"
                 // Max width is crucial on mobile here; otherwise the container shrink-wraps and text can't wrap.
                 widthStyle={{ width: 'min(520px, calc(100vw - 96px))' }}
                 inactiveColor="black"
                 activeColor={currentSong.themeColor}
                 inactiveOpacity={0.4}
                 activeOpacity={1}
               />

          {/* Song Info */}
              <div className="text-[14px] text-black/20 font-normal mt-4">
                {formattedSongInfo}
              </div>
           </div>
           )}
        </div>
      )}

      {theme === 'powerpuff' && (
        <div className="absolute inset-0 z-10 overflow-hidden">
           <PowerpuffVisualizer 
             analyser={analyser} 
             isPlaying={isPlaying}
             params={powerpuffParams}
             lyricLine={currentLyric}
             songInfo={formattedSongInfo}
           />
           <PowerpuffControls 
             params={powerpuffParams}
             setParams={setPowerpuffParams}
             isUIHidden={isUIHidden}
           />
           {/* 底部黑色渐变遮罩 - 让操作区图标更清晰 */}
           <div 
             className={`absolute bottom-0 left-0 right-0 h-32 pointer-events-none transition-opacity duration-500 ${
               isUIHidden ? 'opacity-0' : 'opacity-100'
             }`}
             style={{
               background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)'
             }}
           />
        </div>
      )}

      {theme === 'vinyl' && (
        /* Vinyl 主题 - 重构为背景层 + 前景层结构 */
        <div className="relative z-10 flex-1 min-h-0">
          
          {/* ========== Vinyl 背景层 - 绝对定位居中，不参与布局流 ========== */}
          {/* z-0 确保在标题/歌词下面；pointer-events-none 让点击穿透到前景 */}
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-visible">
            {/* 大屏时偏右上角露出部分，小/中屏居中 */}
            {/* 调整：非常靠上(top-0 + 负translate-y)，往右35% */}
            <div ref={vinylRef} className="lg:absolute lg:top-0 lg:right-0 lg:-translate-y-[25%] lg:translate-x-[35%]">
              <VinylRecord 
                coverUrl={currentSong.coverUrl} 
                isPlaying={isPlaying} 
                vinylSpeed={vinylParams.vinylSpeed}
                rabbitSpeed={vinylParams.rabbitSpeed}
              />
                </div>
          </div>
          
          {/* ========== 前景内容层 - 标题/歌词 ========== */}
          {/* z-10 确保在 Vinyl 上面 */}
          <div className="relative z-10 h-full flex flex-col lg:flex-row w-full px-6 lg:pl-40 lg:pr-0 pt-12 pb-10">
            
            {/* 左侧：标题 + 歌词(大屏) */}
            {/* 竖排时居中对齐，大屏时左对齐 */}
            <div className="w-full lg:w-5/12 flex flex-col h-full lg:pr-8 mt-4 items-center lg:items-start">
               {/* Song Header - 小屏时字号缩小 */}
               <div className="mb-6 flex-shrink-0 text-center lg:text-left relative -top-[10px] sm:top-0">
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                      <h1 className="text-[18px] lg:text-3xl font-bold text-gray-900 tracking-tight leading-tight">{currentSong.title}</h1>
                  </div>
                  <div className="flex items-center justify-center lg:justify-start gap-2 text-gray-600 text-sm lg:text-lg mb-5 font-normal">
                    <span>{currentSong.artist}</span>
                </div>
             </div>
  
               {/* 大屏时的歌词 - 占满剩余空间 */}
               <div className="hidden lg:block lg:flex-1 min-h-0 relative lg:mb-8 overflow-hidden w-full">
               <LyricsView lyrics={lyrics} currentTime={currentTime} onLyricClick={handleSeek} themeColor={currentSong.themeColor} />
             </div>
          </div>
  
            {/* 右侧：大屏时的占位（Vinyl 已经用绝对定位放到背景层了） */}
            <div className="hidden lg:block lg:w-7/12" />

            {/* Vinyl Controls Panel (Top Right) */}
            <VinylControls 
              params={vinylParams}
              onChange={setVinylParams}
              isUIHidden={isUIHidden}
            />
             </div>

          {/* ========== 小屏时的歌词 - 绝对定位固定在底部空白区域 ========== */}
          {/* 通过计算 vinyl bottom y 值精确定位（永不遮挡 vinyl）。 */}
          <div
            className="lg:hidden absolute left-0 right-0 z-10 px-6 text-center overflow-hidden transition-all duration-500 cursor-pointer"
            style={{
              top: smallLyricTop ?? undefined,
              maxHeight: smallLyricMaxHeight ?? undefined
            }}
            onClick={() => !isUIHidden && setIsLyricsPageOpen(true)}
          >
              <LyricsView 
                lyrics={lyrics} 
                currentTime={currentTime} 
                onLyricClick={isUIHidden ? handleSeek : undefined} 
                compact={isUIHidden} 
                maxLines={isUIHidden ? 4 : 1}
                themeColor={currentSong.themeColor}
              />
          </div>
  
        </div>
      )}

      {/* Spacer to push controls to bottom in full-screen visualizer themes */}
      {isFullscreenTheme(theme) && <div className="flex-1" />}

      {/* 隐藏状态下的波形图 - 固定在窗口底部 */}
      {theme === 'vinyl' && isUIHidden && (
        <div className="fixed bottom-4 left-0 right-0 z-10 flex justify-center pointer-events-none">
          <div className="w-full">
            {/* <AudioVisualizer analyser={analyser} isPlaying={isPlaying} themeColor={currentSong.themeColor} /> */}
          </div>
        </div>
      )}

      {/* Bottom Controls - Hide after 5s of mouse inactivity */}
      <div 
        ref={controlsRef}
        className={`relative z-20 flex-shrink-0 w-full px-0 transition-all duration-500 ease-in-out ${
          isUIHidden ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Only show the simple wave visualizer in vinyl mode when UI is visible */}
        {theme === 'vinyl' && !isUIHidden && (
          /* <AudioVisualizer analyser={analyser} isPlaying={isPlaying} themeColor={currentSong.themeColor} /> */
          null
        )}
        <Controls 
          isPlaying={isPlaying}  
          onPlayPause={togglePlay} 
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          theme={theme}
          currentSongId={currentSongId}
          onSongChange={(id) => {
            handleSongChange(id);
            setIsPlaylistOpen(false);
          }}
          isPlaylistOpen={isPlaylistOpen}
          onTogglePlaylist={() => setIsPlaylistOpen((v) => !v)}
          isThemeOpen={isThemeDrawerOpen}
          onToggleTheme={() => setIsThemeDrawerOpen((v) => !v)}
          onSkipPrev={handleSkipPrev}
          onSkipNext={handleSkipNext}
          coverUrl={currentSong.coverUrl}
          songTitle={currentSong.title}
          artistName={currentSong.artist}
        />
      </div>

      {/* Playlist Drawer */}
      <PlaylistDrawer
        isOpen={isPlaylistOpen}
        darkUI={isDarkTheme(theme)}
        songs={SONGS}
        currentSongId={currentSongId}
        isPlaying={isPlaying}
        onClose={() => setIsPlaylistOpen(false)}
        onPlayPause={togglePlay}
        onSelectSong={(id) => {
          handleSongChange(id);
        }}
      />

      {/* Theme Drawer */}
      <ThemeDrawer
        isOpen={isThemeDrawerOpen}
        darkUI={isDarkTheme(theme)}
        currentTheme={theme}
        onClose={() => setIsThemeDrawerOpen(false)}
        onSelectTheme={setTheme}
      />

      {/* 移动端全屏歌词页面 */}
      {isLyricsPageOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* 毛玻璃背景 */}
          <div 
            className="absolute inset-0 backdrop-blur-xl bg-white/70"
            onClick={() => setIsLyricsPageOpen(false)}
          />
          
          {/* 关闭按钮 */}
          <button
            onClick={() => setIsLyricsPageOpen(false)}
            className="absolute top-6 right-6 z-10 p-2"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          {/* 歌词内容 */}
          <div className="relative z-0 h-full w-full px-6 pt-16 pb-8">
            <LyricsView 
              lyrics={lyrics} 
              currentTime={currentTime} 
              onLyricClick={handleSeek}
              themeColor={currentSong.themeColor}
              variant="fullscreen"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
