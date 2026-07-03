import { getPlatformLanguage } from './locales';

// Dynamic helper to retrieve configurable settings with fallbacks
export const getPlatformSettings = () => {
  const storedNameEn = localStorage.getItem("platform_name_en") || "Academia Platform";
  const storedNameAr = localStorage.getItem("platform_name_ar") || "منصة أكاديميا التعليمية";
  const storedVodafone = localStorage.getItem("platform_vodafone") || "01012345678";
  const storedLogo = localStorage.getItem("platform_logo") || "🎓";

  return {
    brandName: {
      en: storedNameEn,
      ar: storedNameAr
    },
    vodafoneCashNumber: storedVodafone,
    logoSymbol: storedLogo
  };
};

export const THEME_CONFIG = {
  get logoSymbol() {
    return getPlatformSettings().logoSymbol;
  },
  classes: {
    primaryButton: "px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-xs sm:text-sm tracking-wide uppercase",
    secondaryButton: "px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer text-xs sm:text-sm",
    card: "bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:shadow-md",
    input: "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs text-sm",
    label: "block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5",
    badge: "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700"
  }
};

export function getBrandName(): string {
  const lang = getPlatformLanguage() as 'en' | 'ar';
  const settings = getPlatformSettings();
  return settings.brandName[lang] || settings.brandName.en;
}
