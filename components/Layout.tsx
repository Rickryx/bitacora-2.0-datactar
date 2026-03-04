
import React from 'react';
import { AppView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onVoiceClick: () => void;
  hideNav?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate, onVoiceClick, hideNav }) => {
  return (
    <div className="flex flex-col h-screen">
      <main className={`flex-1 overflow-y-auto ${hideNav ? '' : 'pb-24'}`}>
        {children}
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#192233] border-t border-slate-200 dark:border-[#324467] px-10 pt-3 pb-8 flex justify-between items-center z-50 max-w-md mx-auto">
          <button
            onClick={() => onNavigate(AppView.DASHBOARD)}
            className={`flex flex-col items-center gap-1 ${activeView === AppView.DASHBOARD ? 'text-primary' : 'text-slate-400'}`}
          >
            <span className="material-symbols-outlined !text-2xl">home</span>
            <span className="text-[10px] font-bold">INICIO</span>
          </button>

          <div className="relative -top-6">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-125"></div>
            <button
              onClick={onVoiceClick}
              className="bg-primary text-white w-16 h-16 rounded-full shadow-lg shadow-primary/40 flex items-center justify-center relative z-10 border-4 border-white dark:border-[#111722] active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined !text-3xl">mic</span>
            </button>
          </div>

          <button
            onClick={() => onNavigate(AppView.MINUTA)}
            className={`flex flex-col items-center gap-1 ${activeView === AppView.MINUTA ? 'text-primary' : 'text-slate-400'}`}
          >
            <span className="material-symbols-outlined !text-2xl">description</span>
            <span className="text-[10px] font-bold">MINUTA</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default Layout;
