import React, { useState, useEffect, Suspense, lazy } from 'react';
import { View, ViewUsage } from './types';
import Sidebar from './components/Sidebar';
// import LectureBuddy from './components/LectureBuddy';
import { preloadModel } from './services/ai';
import Auth from './components/Auth';
import { api } from './services/api';

// Lazy load view components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Explainer = lazy(() => import('./components/Explainer'));
const Summarizer = lazy(() => import('./components/Summarizer'));
const FlashcardsView = lazy(() => import('./components/FlashcardsView'));
const QuizView = lazy(() => import('./components/QuizView'));

// Loading Fallback
const ViewLoading = () => (
  <div className="flex-1 flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium animate-pulse">Waking up EduGenie...</p>
    </div>
  </div>
);

// Mobile Header with 3-dot menu
const MobileHeader: React.FC<{
  activeView: View;
  onViewChange: (view: View) => void;
  studySeconds: number;
}> = ({ activeView, onViewChange, studySeconds }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
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
    // {
    //   id: 'lectureBuddy',
    //   label: 'Lecture Buddy',
    //   icon: (
    //     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //       <path
    //         strokeLinecap="round"
    //         strokeLinejoin="round"
    //         strokeWidth="2"
    //         d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
    //       />
    //     </svg>
    //   ),
    // },
  ];

  return (
    <>
      <header className="lg:hidden h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
            E
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-base text-indigo-900 leading-tight">
              EduGenie
            </span>
            <span className="text-[10px] font-mono font-bold text-indigo-500 leading-tight uppercase">
              {formatTime(studySeconds)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Menu"
        >
          <svg
            className="w-6 h-6 text-slate-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 mt-16"
            onClick={() => setMenuOpen(false)}
          />
          <div className="lg:hidden fixed top-16 right-4 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 min-w-[200px] py-2 animate-slideDown">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onViewChange(item.id);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${activeView === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
};

// Footer Component
const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t bg-white py-4 px-4 md:px-8">
      <div className="max-w-6xl mx-auto flex justify-center items-center text-sm text-slate-600">
        <p>
          © 2026 <span className="font-semibold text-indigo-600">Arman</span>. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

const STORAGE_KEY = 'edugenie_study_data_v2';

const INITIAL_CHART_DATA = [
  { name: 'Mon', hours: 0 },
  { name: 'Tue', hours: 0 },
  { name: 'Wed', hours: 0 },
  { name: 'Thu', hours: 0 },
  { name: 'Fri', hours: 0 },
  { name: 'Sat', hours: 0 },
  { name: 'Sun', hours: 0 },
];

const INITIAL_STATS = {
  studySeconds: 0,
  quizzesTaken: 0,
  avgScore: 0,
};

const INITIAL_VIEW_USAGE: ViewUsage = {
  dashboard: 0,
  explainer: 0,
  summarizer: 0,
  flashcards: 0,
  quiz: 0,
  // lectureBuddy: 0,
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('access_token'));

  // Initialize state from localStorage or defaults
  const [chartData, setChartData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).chartData : INITIAL_CHART_DATA;
  });

  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).stats : INITIAL_STATS;
  });

  const [viewUsage, setViewUsage] = useState<ViewUsage>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).viewUsage || INITIAL_VIEW_USAGE : INITIAL_VIEW_USAGE;
  });

  const updateStudyProgress = (secondsToAdd: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = days[new Date().getDay()];

    setStats((prev: any) => ({
      ...prev,
      studySeconds: (prev.studySeconds || 0) + secondsToAdd,
    }));

    setChartData((prev: any[]) =>
      prev.map((item) => {
        if (item.name === today) {
          // We store hours in the chart for better visual scale
          const currentSeconds = (item.hours || 0) * 3600;
          const newHours = parseFloat(((currentSeconds + secondsToAdd) / 3600).toFixed(4));
          return { ...item, hours: newHours };
        }
        return item;
      })
    );
  };

  // Sync with localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chartData, stats, viewUsage }));
  }, [chartData, stats, viewUsage]);

  // Track time spent on each view
  useEffect(() => {
    // Only update the state every 10 seconds to reduce re-renders,
    // but track every second internally if needed.
    // For now, let's keep the 1s resolution but it's the main perf killer.
    // Optimization: Sync view usage less frequently or on component switch.
    const interval = setInterval(() => {
      setViewUsage((prev) => ({
        ...prev,
        [activeView]: (prev[activeView] || 0) + 1,
      }));

      updateStudyProgress(1);

      // Periodically sync to backend (every 30 seconds)
      const currentUsageForView = (viewUsage[activeView] || 0) + 1;
      if (currentUsageForView % 30 === 0) {
        syncStudyTimeToBackend(30);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeView]);

  // Preload AI model to reduce TTFT
  useEffect(() => {
    if (isAuthenticated) {
      preloadModel();
      syncDataFromBackend();
    }
  }, [isAuthenticated]);

  const syncDataFromBackend = async () => {
    try {
      const backendStats = await api.getStudyStats();
      if (Array.isArray(backendStats)) {
        // Update stats
        const totals = backendStats.reduce((acc: any, curr: any) => {
          acc.studySeconds += curr.duration;
          return acc;
        }, { studySeconds: 0 });

        setStats((prev: any) => ({
          ...prev,
          studySeconds: totals.studySeconds
        }));

        // Update chart data
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const newChartData = [...INITIAL_CHART_DATA];

        backendStats.forEach((entry: any) => {
          const date = new Date(entry.date);
          const dayName = days[date.getDay()];
          const chartEntry = newChartData.find(d => d.name.startsWith(dayName.substring(0, 3)));
          if (chartEntry) {
            chartEntry.hours = parseFloat((entry.duration / 3600).toFixed(4));
          }
        });

        setChartData(newChartData);
      }
    } catch (error) {
      console.warn('Failed to sync data from backend:', error);
    }
  };

  const syncStudyTimeToBackend = async (seconds: number) => {
    if (!isAuthenticated) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.syncStudyTime(today, seconds);
    } catch (error) {
      console.warn('Failed to sync study time to backend:', error);
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setIsAuthenticated(false);
    setActiveView('dashboard');
  };

  const handleResetDashboard = () => {
    setChartData(INITIAL_CHART_DATA);
    setStats(INITIAL_STATS);
    setViewUsage(INITIAL_VIEW_USAGE);
  };

  // Shared content state for cross-component workflows
  const [sharedContent, setSharedContent] = useState({ topic: '', content: '' });

  const handleCreateFromSummary = (type: 'quiz' | 'flashcards', content: string) => {
    // Extract a potential topic from the first line or use a default
    const firstLine = content.split('\n')[0].replace(/[#*]/g, '').trim().substring(0, 50);
    setSharedContent({ topic: firstLine || 'New Topic', content });
    setActiveView(type);
  };

  const updateQuizMetrics = (score: number, total: number) => {
    const percentage = (score / total) * 100;

    setStats((prev) => {
      const newQuizzesTaken = prev.quizzesTaken + 1;
      const newAvgScore = Math.round(
        (prev.avgScore * prev.quizzesTaken + percentage) / newQuizzesTaken
      );
      return {
        ...prev,
        quizzesTaken: newQuizzesTaken,
        avgScore: newAvgScore,
      };
    });

    // Note: Time spent is now tracked automatically by the screen-based tracker
    // updateStudyProgress(timeSpentMinutes);
  };

  const renderView = () => {
    let content;
    switch (activeView) {
      case 'dashboard':
        content = (
          <Dashboard
            onViewChange={setActiveView}
            chartData={chartData}
            stats={{
              studySeconds: stats.studySeconds,
              quizzesTaken: stats.quizzesTaken,
              avgScore: stats.avgScore,
            }}
            viewUsage={viewUsage}
            onReset={handleResetDashboard}
          />
        );
        break;
      case 'explainer':
        content = <Explainer onInteraction={() => { }} />;
        break;
      case 'summarizer':
        content = <Summarizer onSummaryGenerated={handleCreateFromSummary} />;
        break;
      case 'flashcards':
        content = <FlashcardsView
          onSessionComplete={() => { }}
          initialContent={sharedContent.content}
          initialTopic={sharedContent.topic}
        />;
        break;
      case 'quiz':
        content = <QuizView
          onQuizComplete={updateQuizMetrics}
          initialContent={sharedContent.content}
          initialTopic={sharedContent.topic}
        />;
        break;
      default:
        content = (
          <Dashboard
            onViewChange={setActiveView}
            chartData={chartData}
            stats={stats}
            viewUsage={viewUsage}
            onReset={handleResetDashboard}
          />
        );
    }

    return (
      <Suspense fallback={<ViewLoading />}>
        {content}
      </Suspense>
    );
  };

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        studySeconds={stats.studySeconds}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col min-h-screen lg:ml-64 transition-all">
        <MobileHeader
          activeView={activeView}
          onViewChange={setActiveView}
          studySeconds={stats.studySeconds}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">{renderView()}</div>

        <Footer />
      </main>
    </div>
  );
};

export default App;
