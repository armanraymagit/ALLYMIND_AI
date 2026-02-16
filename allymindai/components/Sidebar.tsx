import React from 'react';
import { View } from '../types';
import { preloadTextModel, preloadVisionModel } from '../services/ai';

interface SidebarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  studySeconds?: number;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, onLogout, studySeconds = 0 }) => {
  const handleHover = (id: string) => {
    if (id === 'summarizer') {
      preloadVisionModel();
    } else if (['explainer', 'quiz', 'flashcards'].includes(id)) {
      preloadTextModel();
    }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: 'explainer',
      label: 'AI Explainer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.364-6.364l-.707-.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      id: 'summarizer',
      label: 'Note Summarizer',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      id: 'quiz',
      label: 'Quiz Master',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r hidden lg:flex flex-col z-30">
      <div className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 bg-transparent rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-100 overflow-hidden">
            <img src="/allymind_logo.png" alt="Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <h1 className="text-2xl font-display font-bold text-indigo-900 tracking-tight">
            ALLYMIND
          </h1>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            onMouseEnter={() => handleHover(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${activeView === item.id
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-rose-500 hover:bg-rose-50 mt-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out</span>
        </button>
      </nav>

      <div className="p-4 border-t space-y-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Session Time
          </span>
          <div className="flex items-center space-x-1.5 text-indigo-600">
            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
            <span className="text-sm font-mono font-bold">{formatTime(studySeconds)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
