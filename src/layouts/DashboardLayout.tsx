import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { getPlatformDirection, t, getPlatformLanguage } from "../locales";
import { getBrandName, THEME_CONFIG } from "../theme.config";
import { LogOut, ShieldCheck, User, Globe, Grid } from "lucide-react";
import { motion } from "motion/react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const dir = getPlatformDirection();
  const lang = getPlatformLanguage();

  if (!user) return null;

  return (
    <div dir={dir} className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
            <span className="font-display font-bold text-base sm:text-lg text-slate-800 tracking-tight uppercase">
              {getBrandName()}
            </span>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {/* Active Lang indicator */}
            <div className="hidden xs:flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
              <Globe className="w-3.5 h-3.5" />
              <span>{lang.toUpperCase()}</span>
            </div>

            {/* User Profile info */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-semibold text-slate-700 leading-tight">{user.name}</div>
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{user.role}</div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className="p-2 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all cursor-pointer"
              title={t("logout")}
              id="btn-logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer layout */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-[10px] text-slate-400 font-mono select-none">
        <div>{getBrandName()} &bull; Foundation Architecture Shell (Phase 1 Approved)</div>
        <div className="mt-1">PLATFORM_LANGUAGE: {lang.toUpperCase()} &bull; TEXT_DIRECTION: {dir.toUpperCase()}</div>
      </footer>
    </div>
  );
};
