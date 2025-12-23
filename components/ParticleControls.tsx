import React from 'react';
import { Settings2, X, RotateCcw } from 'lucide-react';
import { ParticleParams } from './ParticleVisualizer';
import LanguageToggle from './LanguageToggle';
import { useTranslation } from 'react-i18next';

const DEFAULT_PARAMS: ParticleParams = {
  density: 2,
  baseSize: 2.0,
  amplitude: 2.1,
  speed: 1.5
};

interface ParticleControlsProps {
  params: ParticleParams;
  onChange: (newParams: ParticleParams) => void;
  isUIHidden?: boolean;
}

const ParticleControls: React.FC<ParticleControlsProps> = ({ params, onChange, isUIHidden }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { t } = useTranslation();

  const handleReset = () => {
    onChange(DEFAULT_PARAMS);
  };

  const handleChange = (key: keyof ParticleParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  // UI隐藏时整个控制面板都隐藏
  if (isUIHidden) {
    return null;
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute top-[70px] right-6 z-20 bg-white/10 backdrop-blur-md p-2 rounded-full transition-all text-gray-400 hover:text-gray-300 hover:bg-white/15"
      >
        <Settings2 className="w-[20px] h-[20px]" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop for click-outside-to-close */}
      <div 
        className="fixed inset-0 z-[19] bg-transparent" 
        onClick={() => setIsOpen(false)}
      />
      <div className="absolute top-[70px] right-6 z-20 w-64 bg-white/10 backdrop-blur-xl rounded-2xl p-5 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">
              {t('controls.particle_title')}
            </h3>
            <button 
              onClick={handleReset}
              className="text-gray-400 hover:text-gray-300 transition-colors"
              title={t('ui.reset')}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <div className="space-y-6">
        {/* Density Control */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-white/50">
            <span>{t('controls.density')}</span>
            <span className="text-white/40">{11 - params.density}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={11 - params.density} 
            onChange={(e) => handleChange('density', 11 - parseInt(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white/60"
          />
        </div>

        {/* Base Size Control */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-white/50">
            <span>{t('controls.size')}</span>
            <span className="text-white/40">{params.baseSize.toFixed(1)}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={params.baseSize}
            onChange={(e) => handleChange('baseSize', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white/60"
          />
        </div>

        {/* Amplitude Control */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-white/50">
            <span>{t('controls.amplitude')}</span>
            <span className="text-white/40">{params.amplitude.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={params.amplitude}
            onChange={(e) => handleChange('amplitude', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white/60"
          />
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-white/50">
            <span>{t('controls.speed')}</span>
            <span className="text-white/40">{params.speed.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={params.speed}
            onChange={(e) => handleChange('speed', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white/60"
          />
        </div>

        <LanguageToggle darkUI />
      </div>
    </div>
    </>
  );
};

export default ParticleControls;

