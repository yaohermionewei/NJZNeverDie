
import React, { useEffect, useRef, useState } from 'react';
import { LyricLine } from '../types';

interface LyricsViewProps {
  lyrics: LyricLine[];
  currentTime: number;
  onLyricClick?: (time: number) => void;
  compact?: boolean; // 紧凑模式：行间距更小（用于小屏4行模式）
  maxLines?: number; // 最多显示几行（小屏用，0或undefined表示显示全部）
  themeColor?: string; // 主题色，用于高亮歌词
  variant?: 'default' | 'fullscreen'; // default: 桌面/常规；fullscreen: 移动端全屏歌词页
}

const LyricsView: React.FC<LyricsViewProps> = ({ lyrics, currentTime, onLyricClick, compact = false, maxLines, themeColor = '#ff4d6a', variant = 'default' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoScrolling = useRef(false);
  
  // Find the active lyric index
  const activeIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
  });

  const markUserScrolling = () => {
    if (!containerRef.current) return;
    
    // If we are in the middle of an auto-scroll, ignore this event
    if (isAutoScrolling.current) {
        return;
    }

    setIsUserScrolling(true);

    if (userScrollTimeout.current) {
      clearTimeout(userScrollTimeout.current);
    }

    userScrollTimeout.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 4000);
  };

  // Handle user scroll interaction (wheel, touch)
  const handleUserScroll = () => markUserScrolling();

  // Scroll event (for keyboard / other interactions)
  const handleScrollEvent = (event: React.UIEvent<HTMLDivElement>) => {
    if (event.isTrusted) {
      markUserScrolling();
    }
  };

  useEffect(() => {
    return () => {
      if (userScrollTimeout.current) {
        clearTimeout(userScrollTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    // Check if current line is one of the last 3 lines
    const isLastThreeLines = activeIndex >= lyrics.length - 3;
    
    // Only auto-scroll if user is not manually scrolling and not one of the last 3 lines
    if (containerRef.current && activeIndex !== -1 && !isUserScrolling && !isLastThreeLines) {
      const container = containerRef.current;
      const activeElement = container.children[activeIndex] as HTMLElement;
      
      if (activeElement) {
        // Calculate position to center the active element at roughly 35% of container height
        const containerHeight = container.clientHeight;
        const elementTop = activeElement.offsetTop;
        const elementHeight = activeElement.clientHeight;
        
        // Position calculation: Element Top - 35% Container + Half Element
        const scrollTo = elementTop - (containerHeight * 0.35) + (elementHeight / 2);
        
        // Set flag BEFORE scrolling
        isAutoScrolling.current = true;
        
        container.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        });
        
        // Clear the flag after smooth scroll completes
        // Smooth scroll typically takes 300-800ms, use 800ms to be safe
        setTimeout(() => {
            isAutoScrolling.current = false;
        }, 800);
      }
    }
  }, [activeIndex, isUserScrolling, lyrics]);

  // 如果指定了 maxLines，只显示当前歌词附近的行
  const displayLyrics = maxLines && maxLines > 0 && activeIndex !== -1
    ? (() => {
        // 计算起始位置：当前行上面显示 floor((maxLines-1)/2) 行
        const before = Math.floor((maxLines - 1) / 2);
        const start = Math.max(0, activeIndex - before);
        const end = Math.min(lyrics.length, start + maxLines);
        // 如果末尾不够，往前调整起始位置
        const adjustedStart = Math.max(0, end - maxLines);
        return lyrics.slice(adjustedStart, end).map((line, idx) => ({
          ...line,
          originalIndex: adjustedStart + idx
        }));
      })()
    : lyrics.map((line, idx) => ({ ...line, originalIndex: idx }));

  // 小屏简化模式：不需要滚动，直接居中显示
  if (maxLines && maxLines > 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden">
        {/* 恢复原先的折行策略：不固定每行高度/行高，让长句自然换行 */}
        {/* 去掉过窄的 max-width，避免左右留白过大导致过度折行；宽度由外层容器(px-6)决定，视觉上更贴近唱片宽度 */}
        <div className="w-full mx-auto max-w-full">
          {displayLyrics.map((line) => {
            const isActive = line.originalIndex === activeIndex;
            return (
              <div
                key={line.originalIndex}
                onClick={() => onLyricClick?.(line.time)}
                className={`transition-all duration-500 ease-out ${compact ? 'mb-1.5' : 'mb-4'} font-bold tracking-tight cursor-pointer text-center transform break-words whitespace-normal
                  ${isActive 
                    ? 'text-2xl scale-100 opacity-100' 
                    : 'text-[22px] scale-100 opacity-50 text-gray-400/50'
                  }`}
                style={isActive ? { color: themeColor } : undefined}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    // 大屏完整模式：带滚动
    <div className="h-full w-full flex flex-col items-center lg:items-start justify-center relative overflow-hidden">
      {/* CSS Mask applied here for seamless fade out at top and bottom */}
      <div 
        ref={containerRef}
        onScroll={handleScrollEvent}
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
        className="w-full h-full overflow-y-auto no-scrollbar pt-[35vh] pb-[15vh] relative z-0"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
        }}
      >
        {displayLyrics.map((line) => {
          const isActive = line.originalIndex === activeIndex;
          return (
            <div
              key={line.originalIndex}
              onClick={() => onLyricClick?.(line.time)}
              className={
                variant === 'fullscreen'
                  ? `transition-all duration-700 ease-out mb-10 tracking-tight cursor-pointer text-center lg:text-left origin-center lg:origin-left transform break-words whitespace-normal
                      ${
                        // 高亮26px/semibold，非高亮24px/regular，差距小以降低换行跳变概率
                        isActive
                          ? 'text-[26px] font-semibold scale-100 opacity-100 translate-x-0'
                          : 'text-2xl font-normal text-gray-700/70 scale-100 opacity-80 hover:opacity-100'
                      }`
                  : `transition-all duration-700 ease-out mb-10 text-xl sm:text-2xl lg:text-4xl font-bold tracking-tight cursor-pointer text-center lg:text-left origin-center lg:origin-left transform
                      ${isActive 
                        ? 'scale-100 opacity-100 blur-none translate-x-0' 
                        : 'text-gray-400/60 scale-95 opacity-40 blur-[0.5px] hover:opacity-60 hover:text-gray-500'
                      }`
              }
              style={isActive ? { color: themeColor } : undefined}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LyricsView;
