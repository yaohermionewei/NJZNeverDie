import React from 'react';
import { ThemeMode } from '../types';
import blackVinyl from '../blackvinyl.png';

export type ThemeMeta = {
  id: ThemeMode;
  label: string;
  visible: boolean;
  isDark: boolean;
  isFullscreen: boolean;
  Preview: React.FC;
};

const VinylPreview: React.FC = () => (
  <div className="w-full aspect-square rounded-md overflow-hidden bg-gray-200 relative shadow-sm flex items-center justify-center">
    <img src={blackVinyl} alt="Transparent Vinyl" className="w-full h-full object-cover" />
  </div>
);

const ParticlePreview: React.FC = () => (
  <div className="w-full aspect-square rounded-md overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-800 to-black relative shadow-sm flex items-center justify-center">
    <div className="absolute w-2 h-2 bg-cyan-400 rounded-full blur-[1px] top-1/3 left-1/3 opacity-80"></div>
    <div className="absolute w-1.5 h-1.5 bg-purple-400 rounded-full blur-[1px] bottom-1/3 right-1/3 opacity-80"></div>
    <div className="absolute w-1 h-1 bg-white rounded-full blur-[0.5px] top-1/2 right-1/4 opacity-60"></div>
  </div>
);

const FireworksPreview: React.FC = () => (
  <div className="w-full aspect-square rounded-md overflow-hidden bg-black relative shadow-sm flex items-center justify-center">
    <div className="absolute w-1 h-1 bg-yellow-400 rounded-full top-1/2 left-1/2 shadow-[0_0_4px_yellow]"></div>
    <div className="absolute w-0.5 h-0.5 bg-red-500 rounded-full top-[40%] left-[40%] opacity-80"></div>
    <div className="absolute w-0.5 h-0.5 bg-blue-500 rounded-full top-[40%] left-[60%] opacity-80"></div>
    <div className="absolute w-0.5 h-0.5 bg-green-500 rounded-full top-[60%] left-[50%] opacity-80"></div>
  </div>
);

const CubesPreview: React.FC = () => (
  <div className="w-full aspect-square rounded-md overflow-hidden bg-[#e0f7fa] relative shadow-sm flex items-center justify-center">
    <div className="absolute inset-0 bg-gradient-to-b from-white/0 to-white/50"></div>
    <div className="grid grid-cols-3 gap-1 rotate-45 scale-75 transform-gpu">
      <div className="w-2 h-2 bg-white shadow-sm"></div>
      <div className="w-2 h-2 bg-white shadow-sm translate-y-[-2px]"></div>
      <div className="w-2 h-2 bg-white shadow-sm"></div>

      <div className="w-2 h-2 bg-white shadow-sm translate-y-[-2px]"></div>
      <div className="w-2 h-2 bg-white shadow-sm translate-y-[-4px]"></div>
      <div className="w-2 h-2 bg-white shadow-sm translate-y-[-2px]"></div>

      <div className="w-2 h-2 bg-white shadow-sm"></div>
      <div className="w-2 h-2 bg-white shadow-sm translate-y-[-2px]"></div>
      <div className="w-2 h-2 bg-white shadow-sm"></div>
    </div>
  </div>
);

const LiquidPreview: React.FC = () => (
  <div className="w-full aspect-square rounded-md overflow-hidden bg-gradient-to-br from-gray-800 via-gray-600 to-gray-900 relative shadow-sm flex items-center justify-center">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 via-white to-gray-400 shadow-lg relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/60 to-transparent opacity-80"></div>
      <div className="absolute top-1 left-2 w-2 h-1 bg-white/80 rounded-full blur-[0.5px]"></div>
    </div>
  </div>
);

const PowerpuffPreview: React.FC = () => (
  <div className="w-full aspect-square rounded-md overflow-hidden bg-gradient-to-br from-pink-200 via-blue-200 to-green-200 relative shadow-sm flex items-center justify-center">
    <div className="flex gap-1">
      <div className="w-2 h-2 rounded-full bg-pink-500 shadow-sm"></div>
      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></div>
      <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm"></div>
    </div>
  </div>
);

/**
 * 主题注册表（顺序即 UI 展示顺序）
 * - visible=false 的主题：代码保留、可手动切换用于调试，但 UI 面板不展示
 */
export const THEMES: ThemeMeta[] = [
  {
    id: 'powerpuff',
    label: '飞天小女警',
    visible: true,
    // 深色场景：底部 icon / 抽屉等应使用白色系
    isDark: true,
    isFullscreen: true,
    Preview: PowerpuffPreview
  },
  {
    id: 'cubes',
    label: '方块音阶',
    visible: true,
    isDark: false,
    isFullscreen: true,
    Preview: CubesPreview
  },
  {
    id: 'particle',
    label: '封面粒子',
    visible: true,
    isDark: true,
    isFullscreen: true,
    Preview: ParticlePreview
  },
  {
    id: 'vinyl',
    label: '涂鸦黑胶',
    visible: true,
    isDark: false,
    isFullscreen: false,
    Preview: VinylPreview
  },

  // Hidden for now (keep code + params state for debugging)
  {
    id: 'liquid',
    label: '水银球体',
    visible: false,
    isDark: true,
    isFullscreen: true,
    Preview: LiquidPreview
  },
  {
    id: 'fireworks',
    label: '礼花绽放',
    visible: false,
    isDark: true,
    isFullscreen: true,
    Preview: FireworksPreview
  }
];

export function getThemeMeta(id: ThemeMode): ThemeMeta | undefined {
  return THEMES.find((t) => t.id === id);
}

export function isDarkTheme(id: ThemeMode): boolean {
  return getThemeMeta(id)?.isDark ?? false;
}

export function isFullscreenTheme(id: ThemeMode): boolean {
  return getThemeMeta(id)?.isFullscreen ?? false;
}


