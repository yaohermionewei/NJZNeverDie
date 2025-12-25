
import React, { useEffect, useRef, useState } from 'react';
import doodleVinyl from '../doodlevingl.webp';
import rabbitSkate1 from '../assets/rabbitSkate1.webp';
import rabbitSkate2 from '../assets/rabbitSkate2.webp';
import rabbitSkate3 from '../assets/rabbitSkate3.webp';
import rabbitSkate4 from '../assets/rabbitSkate4.webp';
import rabbitSkate5 from '../assets/rabbitSkate5.webp';
import rabbitSkate6 from '../assets/rabbitSkate6.webp';

const RABBIT_FRAMES = [
  rabbitSkate1,
  rabbitSkate2,
  rabbitSkate3,
  rabbitSkate4,
  rabbitSkate5,
  rabbitSkate6,
];

interface VinylRecordProps {
  coverUrl: string;
  isPlaying: boolean;
  vinylSpeed?: number;
  rabbitSpeed?: number;
}

const VinylRecord: React.FC<VinylRecordProps> = ({ coverUrl, isPlaying, vinylSpeed = 1.0, rabbitSpeed = 1.0 }) => {
  const [imgError, setImgError] = useState(false);
  const [skateFrame, setSkateFrame] = useState(0);
  const dirRef = useRef<1 | -1>(1);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Preload rabbit frames to improve desktop reliability and avoid first-frame stalls.
  useEffect(() => {
    for (const src of RABBIT_FRAMES) {
      const img = new Image();
      img.src = src;
    }
  }, []);

  // Rabbit skating sprite animation: 1234565432... @ 12fps
  // Use requestAnimationFrame (more reliable on desktop compositing) and pause/resume with isPlaying.
  useEffect(() => {
    if (!isPlaying) return;
    if (RABBIT_FRAMES.length <= 1) return;

    const FPS = 12;
    const frameInterval = 1000 / FPS;
    lastTickRef.current = performance.now();

    const loop = (now: number) => {
      if (now - lastTickRef.current >= frameInterval) {
        lastTickRef.current = now;
        setSkateFrame((prev) => {
          const max = RABBIT_FRAMES.length - 1;
          if (max <= 0) return 0;

          const dir = dirRef.current;
          let next = prev + dir;

          // Bounce at ends without repeating endpoints:
          // 0,1,2,3,4,5,4,3,2,1,0,1...
          if (next > max) {
            dirRef.current = -1;
            next = max - 1;
          } else if (next < 0) {
            dirRef.current = 1;
            next = 1;
          }

          return Math.max(0, Math.min(max, next));
        });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
    };
  }, [isPlaying]);

  return (
    <div className="relative flex items-center justify-center transition-all duration-500">
      {/* Container Size - 夹紧策略：小/中屏居中背景时不要太大，大屏偏移时可以稍大 */}
      {/* 小屏：60vw；中屏(md)：更小一点；大屏(lg+)：50vw，最大限制 700px */}
      <div className="w-[346px] h-[346px] md:w-[360px] md:h-[360px] lg:w-[55vw] lg:h-[55vw] max-w-[850px] max-h-[850px] relative flex items-center justify-center">
        
        {/* Rabbit Orbiting Container */}
        {/* 16s rotation makes it faster than the 20s vinyl rotation, creating forward motion */}
        <div 
          className="absolute inset-0 z-50 pointer-events-none will-change-transform"
          style={{ 
            animation: `spin ${16 / rabbitSpeed}s linear infinite`, 
            animationPlayState: isPlaying ? 'running' : 'paused' 
          }}
        >
          {/* 
            Mobile flicker fix:
            - Don't remount <img> each frame (key/src swap can cause decode/blank frames on mobile Safari).
            - Pre-render all frames stacked and toggle opacity.
          */}
          {RABBIT_FRAMES.map((src, idx) => (
            <img
              key={src}
              src={src}
              alt="Skating Rabbit"
              loading="eager"
              decoding="async"
              className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[85%] w-16 h-16 md:w-20 md:h-20 lg:w-[12%] lg:h-[12%] object-contain scale-x-[-1] transition-opacity duration-75 will-change-opacity ${
                idx === skateFrame ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </div>
        
        {/* Outer Glow/Shadow - Slightly richer pink with shorter distance */}
        {/* <div className="absolute inset-0 rounded-full bg-[#ff4d6a]/60 blur-[60px] transform scale-95"></div> */}
        
        {/* The Record Disc */}
        <div 
          className={`relative w-full h-full rounded-full flex items-center justify-center overflow-hidden ${isPlaying ? 'animate-spin-slow' : 'animate-spin-slow paused-anim'}`}
          style={isPlaying ? { animationDuration: `${20 / vinylSpeed}s` } : { animationDuration: `${20 / vinylSpeed}s`, animationPlayState: 'paused' }}
          /* 原红色阴影已注释: shadow-[0_25px_50px_-12px_rgba(255,77,106,0.4)] */
        >
          {/* Base Vinyl Texture */}
          <img 
            src={doodleVinyl} 
            alt="Vinyl Record" 
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Pink Color Overlay - Vivid #FF5252 with hard-light for strong saturation */}
          {/* <div className="absolute inset-0 bg-[#FF5252] mix-blend-hard-light opacity-90 rounded-full"></div> */}
          
          {/* Second overlay to boost redness and depth */}
          {/* <div className="absolute inset-0 bg-[#FF5252] mix-blend-overlay opacity-40 rounded-full"></div> */}
          
          {/* Vinyl Texture/Sheen (Keep original sheen for extra depth) */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent opacity-30 pointer-events-none z-20"></div>
          
          {/* Album Cover (Center Label) */}
          {/* Increased size significantly to reduce gap between cover and vinyl edge */}
          <div className="absolute w-[65%] h-[65%] rounded-full overflow-hidden z-30 shadow-inner bg-gray-900 flex items-center justify-center">
              {!imgError ? (
                <img 
                  src={coverUrl} 
                  alt="Ditto Cover" 
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-[#ff4d6a] font-bold text-center p-2">
                  <span>DITTO</span>
                  <span className="text-xs opacity-75">NewJeans</span>
                </div>
              )}
          </div>
          
          {/* Center Hole */}
          <div className="absolute w-3 h-3 bg-[#1a1a1a] rounded-full z-40 shadow-inner border border-gray-700"></div>
        </div>
      </div>
    </div>
  );
};

export default VinylRecord;
