import React from 'react';
import { Settings2, X, RotateCcw } from 'lucide-react';
import { CubesParams } from './CubesVisualizer';
import LanguageToggle from './LanguageToggle';
import { useTranslation } from 'react-i18next';

const DEFAULT_PARAMS: CubesParams = {
  height: 0.9,
  spread: 1.5,
  damping: 0.25,
  showRabbits: true,
  showHearts: true
};

interface CubesControlsProps {
  params: CubesParams;
  onChange: (newParams: CubesParams) => void;
  isUIHidden?: boolean;
}

const CubesControls: React.FC<CubesControlsProps> = ({ params, onChange, isUIHidden }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { t } = useTranslation();

  const handleReset = () => {
    onChange(DEFAULT_PARAMS);
  };

  const handleChange = (key: keyof CubesParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  const handleToggleRabbits = () => {
    onChange({ ...params, showRabbits: !params.showRabbits });
  };

  const handleToggleHearts = () => {
    onChange({ ...params, showHearts: !params.showHearts });
  };

  // UI隐藏时整个控制面板都隐藏
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
      {/* Backdrop for click-outside-to-close */}
      <div 
        className="fixed inset-0 z-[19] bg-transparent" 
        onClick={() => setIsOpen(false)}
      />
      <div className="absolute top-[70px] right-6 z-20 w-64 bg-black/5 backdrop-blur-xl rounded-2xl p-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-black/50 uppercase tracking-wider font-sans">
              {t('controls.cubes_title')}
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
        {/* Height Control */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-black/40">
            <span>{t('controls.bounce_height')}</span>
            <span className="text-black/50">{params.height.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={params.height}
            onChange={(e) => handleChange('height', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black/40"
          />
        </div>

        {/* Damping Control */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-black/40">
            <span>{t('controls.damping')}</span>
            <span className="text-black/50">{params.damping.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.5"
            step="0.01"
            value={params.damping}
            onChange={(e) => handleChange('damping', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black/40"
          />
        </div>

        {/* Show Rabbits Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-black/40">{t('controls.show_rabbits')}</span>
          <button
            onClick={handleToggleRabbits}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
              params.showRabbits ? 'bg-black/40' : 'bg-black/15'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                params.showRabbits ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Show Hearts Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-black/40">{t('controls.show_heart')}</span>
          <button
            onClick={handleToggleHearts}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
              params.showHearts ? 'bg-black/40' : 'bg-black/15'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                params.showHearts ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <LanguageToggle />
      </div>
    </div>
    </>
  );
};

export default CubesControls;

