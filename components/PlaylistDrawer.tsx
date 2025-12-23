import React from 'react';
import { Play, Pause, X } from 'lucide-react';
import type { SongInfo } from '../songRegistry';
import { useTranslation } from 'react-i18next';

interface PlaylistDrawerProps {
  isOpen: boolean;
  darkUI: boolean;
  songs: SongInfo[];
  currentSongId: string;
  isPlaying: boolean;
  onClose: () => void;
  onPlayPause: () => void;
  onSelectSong: (songId: string) => void;
}

const PlaylistDrawer: React.FC<PlaylistDrawerProps> = ({
  isOpen,
  darkUI,
  songs,
  currentSongId,
  isPlaying,
  onClose,
  onPlayPause,
  onSelectSong
}) => {
  const { t } = useTranslation();

  // Render always; animate using translate + opacity.
  return (
    <div
      className={`fixed inset-0 z-[120] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        // 透明遮罩：不压暗整屏，但保留“点空白处关闭”的交互
        className={`absolute inset-0 bg-transparent transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`absolute transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${
          darkUI
            ? 'bg-[#272727] shadow-2xl'
            : 'bg-white shadow-xl'
        } 
        /* Mobile: Bottom Action Sheet */
        bottom-0 left-0 right-0 w-full h-[75vh] max-h-[85vh] rounded-t-[32px]
        ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        
        /* Desktop: Right Sidebar */
        sm:top-0 sm:right-0 sm:left-auto sm:bottom-auto sm:w-[420px] sm:h-screen sm:max-h-none sm:rounded-none
        ${isOpen ? 'sm:translate-x-0 sm:translate-y-0' : 'sm:translate-x-full sm:translate-y-0'}
        `}
        role="dialog"
        aria-label={t('ui.playlist')}
      >
        {/* Mobile Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className={`w-10 h-1.5 rounded-full ${darkUI ? 'bg-white/10' : 'bg-black/10'}`} />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-5 pb-2 sm:pt-6">
          <h3 className={`text-base font-bold ${darkUI ? 'text-white' : 'text-gray-900'}`}>{t('ui.playlist')}</h3>
          <button
            onClick={onClose}
            className={`transition-colors ${darkUI ? 'text-white/70 hover:text-white' : 'text-black/50 hover:text-black/80'}`}
            aria-label={t('ui.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="relative flex-1 overflow-y-auto px-3 pt-0 pb-4">
          <div className="flex flex-col gap-1">
            {songs.map((song) => {
              const isCurrentSong = currentSongId === song.id;
              const isThisSongPlaying = isCurrentSong && isPlaying;

              return (
                <div
                  key={song.id}
                  className={`group flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                    darkUI ? 'hover:bg-white/10' : 'hover:bg-black/5'
                  }`}
                  onClick={() => {
                    if (!isCurrentSong) onSelectSong(song.id);
                  }}
                >
                  {/* Cover */}
                  <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 shadow-sm">
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay */}
                    <button
                      className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCurrentSong) {
                          onPlayPause();
                        } else {
                          onSelectSong(song.id);
                        }
                      }}
                      aria-label={isThisSongPlaying ? t('ui.pause') : t('ui.play')}
                    >
                      {isThisSongPlaying ? (
                        <Pause className="w-5 h-5 text-white fill-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      )}
                    </button>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isCurrentSong 
                          ? (darkUI ? 'text-[#8B7CF7]' : 'text-[#5A48DA]') 
                          : darkUI ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {song.title}
                    </p>
                    <p className={`text-xs truncate ${
                      isCurrentSong 
                        ? (darkUI ? 'text-[#8B7CF7]/80' : 'text-[#5A48DA]/80') 
                        : darkUI ? 'text-white/55' : 'text-gray-500'
                    }`}>{song.artist}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default PlaylistDrawer;


