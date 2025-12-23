import React, { useState } from 'react';
import { Settings2, X, RotateCcw } from 'lucide-react';
import LanguageToggle from './LanguageToggle';
import { useTranslation } from 'react-i18next';

export interface PowerpuffParams {
  bounceStrength: number;
  sensitivity: number;
  sceneSpeed: number;
  friction: number;
}

export const DEFAULT_POWERPUFF_PARAMS: PowerpuffParams = {
  bounceStrength: 1.0,
  sensitivity: 0.5,
  sceneSpeed: 1.0,
  friction: 0.94
};

interface PowerpuffControlsProps {
  params: PowerpuffParams;
  setParams: React.Dispatch<React.SetStateAction<PowerpuffParams>>;
  isUIHidden?: boolean;
}

const PowerpuffControls: React.FC<PowerpuffControlsProps> = ({ params, setParams, isUIHidden }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const handleReset = () => {
    setParams(DEFAULT_POWERPUFF_PARAMS);
  };

  const handleChange = (key: keyof PowerpuffParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
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
      <div className="absolute top-[70px] right-6 z-20 w-72 bg-white/10 backdrop-blur-xl rounded-2xl p-5 animate-in fade-in slide-in-from-right-4 duration-300 border border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">
              {t('controls.powerpuff_title')}
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
          {/* Scene Speed Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-white/50">
              <span>{t('controls.scene_speed')}</span>
              <span className="text-white/40">{params.sceneSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={params.sceneSpeed}
              onChange={(e) => handleChange('sceneSpeed', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white/60"
            />
          </div>

          {/* Friction Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-white/50">
              <span>{t('controls.friction')}</span>
              <span className="text-white/40">{((1 - params.friction) * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.20"
              step="0.01"
              value={(1 - params.friction).toFixed(2)}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                handleChange('friction', 1 - val);
              }}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white/60"
            />
          </div>

          {/* Bounce Strength Control - REMOVED per user request */}
          {/* 
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-white/50">
              <span>{t('controls.bounce_strength')}</span>
              <span className="text-white/40">{(params.bounceStrength * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={params.bounceStrength}
              onChange={(e) => handleChange('bounceStrength', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white/60"
            />
          </div>
          */}

          {/* Sensitivity Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-white/50">
              <span>{t('controls.sensitivity')}</span>
              <span className="text-white/40">{(params.sensitivity * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={params.sensitivity}
              onChange={(e) => handleChange('sensitivity', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white/60"
            />
          </div>

          <LanguageToggle darkUI />
        </div>
      </div>
    </>
  );
};

export default PowerpuffControls;
