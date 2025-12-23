import React from 'react';
import { X, Check } from 'lucide-react';
import type { ThemeMode } from '../types';
import { useTranslation } from 'react-i18next';

// Preview images (optimized WebP)
import girlsPreview from '../assets/girls.webp';
import cubesPreview from '../assets/cubes.webp';
import particlesPreview from '../assets/particles.webp';
import vinylPreview from '../assets/vinyl.webp';

interface ThemeOption {
  id: ThemeMode;
  label: string;
  preview: string;
}

interface ThemeDrawerProps {
  isOpen: boolean;
  darkUI: boolean;
  currentTheme: ThemeMode;
  onClose: () => void;
  onSelectTheme: (theme: ThemeMode) => void;
}

const ThemeDrawer: React.FC<ThemeDrawerProps> = ({
  isOpen,
  darkUI,
  currentTheme,
  onClose,
  onSelectTheme
}) => {
  const { t } = useTranslation();

  const THEME_OPTIONS: ThemeOption[] = [
    { id: 'powerpuff', label: t('themes.powerpuff'), preview: girlsPreview },
    { id: 'cubes', label: t('themes.cubes'), preview: cubesPreview },
    { id: 'particle', label: t('themes.particle'), preview: particlesPreview },
    { id: 'vinyl', label: t('themes.vinyl'), preview: vinylPreview },
  ];

  return (
    <div
      className={`fixed inset-0 z-[120] ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop - transparent, just for click-to-close */}
      <div
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
        aria-label={t('ui.themes')}
      >
        {/* Mobile Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className={`w-10 h-1.5 rounded-full ${darkUI ? 'bg-white/10' : 'bg-black/10'}`} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 sm:pt-6">
          <h3 className={`text-base font-bold ${darkUI ? 'text-white/70' : 'text-gray-500'}`}>{t('ui.themes')}</h3>
          <button
            onClick={onClose}
            className={`transition-colors ${darkUI ? 'text-white/70 hover:text-white' : 'text-black/50 hover:text-black/80'}`}
            aria-label={t('ui.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme Grid */}
        <div className="px-3 pt-0 pb-2">
          <div className="grid grid-cols-2 gap-4">
            {THEME_OPTIONS.map((t) => {
              const selected = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    onSelectTheme(t.id);
                    onClose();
                  }}
                  className={`group flex flex-col items-start gap-2 p-3 rounded-xl transition-all ${
                    darkUI
                      ? 'hover:bg-white/10'
                      : 'hover:bg-black/5'
                  }`}
                >
                  {/* Preview Image */}
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden group-hover:scale-[1.02] transition-transform">
                    <img
                      src={t.preview}
                      alt={t.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Checkmark in top-right corner */}
                    {selected && (
                      <div className={`absolute top-2 right-2 rounded-full p-1 text-white shadow-md ${
                        darkUI ? 'bg-[#8B7CF7]' : 'bg-[#5A48DA]'
                      }`}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  {/* Label - left aligned, lighter color */}
                  <span className={`text-sm font-medium ${
                    selected
                      ? (darkUI ? 'text-[#8B7CF7]' : 'text-[#5A48DA]')
                      : darkUI
                        ? 'text-white/60'
                        : 'text-gray-500'
                  }`}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ThemeDrawer;

