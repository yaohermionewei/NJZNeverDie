import React from 'react';
import { useTranslation } from 'react-i18next';

interface LanguageToggleProps {
  darkUI?: boolean;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ darkUI }) => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language.startsWith('zh') ? 'zh' : 'en';

  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  // 优化样式变量
  const labelColor = darkUI ? 'text-white/50' : 'text-black/40';
  const bgColor = darkUI ? 'bg-white/10' : 'bg-black/10';
  const activeBg = darkUI ? 'bg-white/25' : 'bg-white shadow-sm'; 
  
  // 1. 选中文字颜色：浅色模式下从 text-gray-900 (100%黑) 改为 text-black/70 (70%黑)
  const activeText = darkUI ? 'text-white' : 'text-black/70';
  const inactiveText = darkUI ? 'text-white/40' : 'text-black/30';
  
  // 2. 分割线颜色：浅色模式下从 border-black/15 调淡为 border-black/5 (5%透明度，更微妙)
  const borderColor = darkUI ? 'border-white/10' : 'border-black/5';

  return (
    <div className={`flex items-center justify-between mt-4 pt-4 border-t ${borderColor}`}>
      <span className={`text-xs font-medium ${labelColor}`}>
        {t('ui.language')}
      </span>
      <div className={`flex p-0.5 rounded-lg ${bgColor}`}>
        <button
          onClick={() => toggleLanguage('zh')}
          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-300 ${
            currentLang === 'zh'
              ? `${activeBg} ${activeText}`
              : `${inactiveText} hover:opacity-70`
          }`}
        >
          中文
        </button>
        <button
          onClick={() => toggleLanguage('en')}
          className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-300 ${
            currentLang === 'en'
              ? `${activeBg} ${activeText}`
              : `${inactiveText} hover:opacity-70`
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
};

export default LanguageToggle;
