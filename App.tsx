
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

// Preload Cubes theme rabbit images (default theme - load immediately)
import rabbitImg from './assets/rabbit.webp';
import rabbitFlyUpImg from './assets/rabbitflyup.webp';
import rabbitDropDownImg from './assets/rabbitdropdown.webp';
import rabbitLeftImg from './assets/rabbitleft.webp';
import rabbitLeftFlyUpImg from './assets/leftflyup.webp';
import rabbitLeftDropDownImg from './assets/leftdropdown.webp';

// Start preloading before component mounts (browser will cache these)
[rabbitImg, rabbitFlyUpImg, rabbitDropDownImg, rabbitLeftImg, rabbitLeftFlyUpImg, rabbitLeftDropDownImg]
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
  const [smallLyricTop, setSmallLyricTop] = useState<number | null>(null);
  const [smallLyricMaxHeight, setSmallLyricMaxHeight] = useState<number | null>(null);
  
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
      damping: 0.19,
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

  // Initialize Audio Context
  useEffect(() => {
    const initAudioContext = () => {
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
    };

    // Audio context must be resumed/created after user interaction
    const handleInteraction = () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      if (!audioContextRef.current) {
         initAudioContext();
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });
    
    // Try init immediately if possible (some browsers allow)
    if (isPlaying) initAudioContext();

    return () => {
       window.removeEventListener('click', handleInteraction);
       window.removeEventListener('keydown', handleInteraction);
    }
  }, [isPlaying]);

  // Toggle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
        audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

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
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      // 如果当前是暂停状态，自动开始播放
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Handle song end - auto play next song
  const onEnded = () => {
    // Auto skip to next song in playlist
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

  // Auto-play when song changes
  useEffect(() => {
     if(currentSong.audioSrc && audioRef.current) {
         audioRef.current.play().catch(e => console.log("Autoplay prevented", e));
     }
  }, [currentSong])

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
    <div className="relative w-full h-screen h-[100dvh] bg-gray-50 overflow-hidden flex flex-col font-sans selection:bg-[#ff4d6a] selection:text-white">
      
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
               {/* 滚动歌词容器 */}
               <div className="h-[52px] overflow-hidden relative text-center w-full px-10">
                 <div 
                   className="transition-transform duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)"
                   style={{ 
                     transform: `translateY(-${Math.max(0, currentIndex - 1) * 26}px)` 
                   }}
                 >
                   {lyrics.map((line, index) => (
                     <div 
                       key={index}
                       className="h-[26px] text-[16px] font-normal leading-[26px] transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)"
                       style={{ 
                         opacity: index === currentIndex ? 0.7 : index === currentIndex - 1 ? 0.4 : 0,
                         color: 'white'
                       }}
                     >
                       {line.text}
                     </div>
                   ))}
                 </div>
               </div>

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
           />
           <CubesControls 
             params={cubesParams}
             onChange={setCubesParams}
             isUIHidden={isUIHidden}
           />
           
           {/* Hidden UI Lyrics & Song Info (Bottom Left) */}
           {isUIHidden && (
             <div className="absolute bottom-12 left-12 z-20 flex flex-col pointer-events-none animate-in fade-in duration-500">
               {/* Scrolling Lyrics Container */}
               <div className="h-[52px] overflow-hidden relative">
                 <div 
                   className="transition-transform duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)"
                   style={{ 
                     transform: `translateY(-${Math.max(0, currentIndex - 1) * 26}px)` 
                   }}
                 >
                   {lyrics.map((line, index) => (
                     <div 
                       key={index}
                       className="h-[26px] text-[16px] font-normal leading-[26px] transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)"
                       style={{ 
                         opacity: index === currentIndex ? 1 : index === currentIndex - 1 ? 0.4 : 0,
                         color: index === currentIndex ? currentSong.themeColor : 'black'
                       }}
                     >
                       {line.text}
              </div>
                   ))}
              </div>
           </div>

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
               <div className="mb-6 flex-shrink-0 text-center lg:text-left">
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
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
