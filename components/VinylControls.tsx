import React from 'react';
import { Settings2, X, RotateCcw } from 'lucide-react';
import { VinylParams } from '../types';
import LanguageToggle from './LanguageToggle';
import { useTranslation } from 'react-i18next';

export const DEFAULT_VINYL_PARAMS: VinylParams = {
  vinylSpeed: 1.0,
  rabbitSpeed: 1.0,
};

interface VinylControlsProps {
  params: VinylParams;
  onChange: (newParams: VinylParams) => void;
  isUIHidden?: boolean;
}

const VinylControls: React.FC<VinylControlsProps> = ({ params, onChange, isUIHidden }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { t } = useTranslation();

  const handleReset = () => {
    onChange(DEFAULT_VINYL_PARAMS);
  };

  const handleChange = (key: keyof VinylParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  if (isUIHidden) {
    return null;
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-[70px] right-6 z-20 bg-black/5 backdrop-blur-md p-2 rounded-full transition-all text-gray-400 hover:text-gray-500 hover:bg-black/10"
      >
        <Settings2 className="w-[20px] h-[20px]" />
      </button>
    );
  }

  return (
    <>
      <div 
        className="fixed inset-0 z-[19] bg-transparent" 
        onClick={() => setIsOpen(false)}
      />
      <div className="absolute top-[70px] right-6 z-20 w-64 bg-black/5 backdrop-blur-xl rounded-2xl p-5 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-black/50 uppercase tracking-wider font-sans">
              {t('controls.vinyl_title')}
            </h3>
            <button 
              onClick={handleReset}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              title={t('ui.reset')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Vinyl Speed */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-black/40">
              <span>{t('controls.vinyl_speed')}</span>
              <span className="text-black/50">{params.vinylSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={params.vinylSpeed}
              onChange={(e) => handleChange('vinylSpeed', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black/40"
            />
          </div>

          {/* Rabbit Speed */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-black/40">
              <span>{t('controls.rabbit_speed')}</span>
              <span className="text-black/50">{params.rabbitSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={params.rabbitSpeed}
              onChange={(e) => handleChange('rabbitSpeed', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black/40"
            />
          </div>

          <LanguageToggle />
        </div>
      </div>
    </>
  );
};

export default VinylControls;

