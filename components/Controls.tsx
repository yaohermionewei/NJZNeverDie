
import React from 'react';
import { Play, Pause, Menu, Palette } from 'lucide-react';
import { ThemeMode } from '../types';
import { isDarkTheme } from './themeRegistry';
import { useTranslation } from 'react-i18next';
import carrot from '../assets/carrot.png';

// Filled skip icons (player-style): solid triangle + bar.
// Uses currentColor so fill color always matches the button color (dark/light themes).
// More rounded corners for a softer, friendlier look.
const FilledSkipBackIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <rect x="5" y="6.5" width="2.5" height="11" rx="1.25" />
    <path d="M18 7.2c0-1-.9-1.6-1.7-1.1L9.5 10.8c-.7.4-.7 1.4 0 1.9l6.8 4.7c.8.5 1.7-.1 1.7-1.1V7.2z" />
  </svg>
);

const FilledSkipForwardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <rect x="16.5" y="6.5" width="2.5" height="11" rx="1.25" />
    <path d="M6 7.2c0-1 .9-1.6 1.7-1.1l6.8 4.7c.7.4.7 1.4 0 1.9l-6.8 4.7c-.8.5-1.7-.1-1.7-1.1V7.2z" />
  </svg>
);


interface ControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  theme: ThemeMode;
  currentSongId: string;
  onSongChange: (songId: string) => void;
  isPlaylistOpen: boolean;
  onTogglePlaylist: () => void;
  isThemeOpen: boolean;
  onToggleTheme: () => void;
  onSkipPrev: () => void;
  onSkipNext: () => void;
  // Song info for display
  coverUrl: string;
  songTitle: string;
  artistName: string;
}

const formatTime = (time: number) => {
  if (!time || isNaN(time)) return "00:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const Controls: React.FC<ControlsProps> = ({ 
  isPlaying, 
  onPlayPause, 
  currentTime, 
  duration, 
  onSeek,
  theme,
  currentSongId,
  onSongChange,
  isPlaylistOpen,
  onTogglePlaylist,
  isThemeOpen,
  onToggleTheme,
  onSkipPrev,
  onSkipNext,
  coverUrl,
  songTitle,
  artistName
}) => {
  const darkUI = isDarkTheme(theme);
  const isCubes = theme === 'cubes';
  const { t } = useTranslation();
  
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(Number(e.target.value));
  };

  return (
    // Removed background color and border-top to blend seamlessly with the page
    <div
      className="w-full px-6 md:px-12 pt-2 flex flex-col gap-2 z-50 relative"
      // iOS: 预留 home indicator 的安全区；部分浏览器对 tailwind arbitrary env()/max() 解析不稳定，使用 inline 更可靠
      style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
    >
      
      {/* Control Icons Row - Moved above progress bar */}
      <div className="flex items-center justify-between mb-2">
        
        {/* Left: Song Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {theme !== 'vinyl' && (
            <img 
              src={coverUrl} 
              alt={songTitle}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-md"
            />
          )}
          <div className="min-w-0">
            <p className={`text-sm font-normal truncate ${darkUI ? 'text-white/80' : 'text-gray-700'}`}>
              {songTitle}
            </p>
            <p className={`text-xs truncate ${darkUI ? 'text-white/50' : 'text-gray-400'}`}>
              {artistName}
            </p>
          </div>
        </div>

        {/* Center: Playback */}
        <div className="flex items-center gap-6 md:gap-8 flex-1 justify-center">
          <button 
            onClick={onSkipPrev}
            className={`${darkUI ? 'text-white/60 hover:text-white/80' : 'text-black/45 hover:text-black/65'} transition-colors active:scale-90`}
          >
            <FilledSkipBackIcon className="w-10 h-10" />
          </button>
          <button 
            onClick={onPlayPause}
            className={`w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-all active:scale-95 ${
              isCubes
                ? 'bg-black/5 text-black/70 hover:bg-black/10'
                : darkUI
                  ? 'shadow-xl bg-white/20 text-white/90 hover:bg-white/30 shadow-black/20'
                  : 'bg-black/5 text-black/70 hover:bg-black/10'
            }`}
          >
            {isPlaying ? <Pause className="w-7 h-7 fill-current stroke-none" /> : <Play className="w-7 h-7 fill-current stroke-none ml-1" />}
          </button>
          <button 
            onClick={onSkipNext}
            className={`${darkUI ? 'text-white/60 hover:text-white/80' : 'text-black/45 hover:text-black/65'} transition-colors active:scale-90`}
          >
            <FilledSkipForwardIcon className="w-10 h-10" />
          </button>
          
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-6 flex-1 justify-end">
          {/* Theme Button */}
          <button 
            className={`flex items-center justify-center transition-colors ${isThemeOpen ? 'text-[#ff4d6a]' : darkUI ? 'text-white/60 hover:text-white/80' : 'text-black/40 hover:text-black/60'}`} 
            title={t('ui.themes')}
            onClick={onToggleTheme}
          >
             <Palette className="w-[22px] h-[22px]" />
          </button>
          
          {/* Playlist Button */}
          <button 
            className={`flex items-center justify-center transition-colors ${isPlaylistOpen ? 'text-[#ff4d6a]' : darkUI ? 'text-white/60 hover:text-white/80' : 'text-black/40 hover:text-black/60'}`}
            title={t('ui.playlist')}
            onClick={onTogglePlaylist}
          >
            <Menu className="w-[22px] h-[22px]" />
          </button>
        </div>

      </div>

      {/* Progress Bar - Moved below controls */}
      <div className={`flex items-center gap-3 w-full max-w-3xl mx-auto text-xs font-medium transition-colors ${
        darkUI ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'
      }`}>
        <span className="w-10 text-right tabular-nums">{formatTime(currentTime)}</span>
        <div className="relative flex-1 h-[3px] group cursor-pointer flex items-center">
           <input 
            type="range" 
            min={0} 
            max={duration || 100} 
            value={currentTime} 
            onChange={handleSeekChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
          {/* Track Background */}
          <div className={`absolute top-0 left-0 h-full rounded-full w-full ${darkUI ? 'bg-white/20' : 'bg-black/15'}`}></div>
          
          {/* Progress Fill */}
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-100 ${darkUI ? 'bg-white' : 'bg-black/70'}`}
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          ></div>
          
          {/* Drag Handle - vinyl 用胡萝卜，其他用圆形；触屏设备始终显示，桌面端 hover 才显示 */}
          {theme === 'vinyl' ? (
            <img 
              src={carrot}
              alt=""
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 object-contain opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity pointer-events-none drop-shadow-sm"
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          ) : (
            <div 
              className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-md opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity pointer-events-none ${
                darkUI ? 'bg-white border border-white/20' : 'bg-white border border-black/10'
              }`}
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          )}
        </div>
        <span className="w-10 tabular-nums">{formatTime(duration)}</span>
      </div>

      {/* 播放列表抽屉已移动到 App.tsx（避免底部栏 transform 导致 fixed 失效） */}

    </div>
  );
};

export default Controls;
