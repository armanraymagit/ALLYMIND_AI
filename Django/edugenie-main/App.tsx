
import React, { useState, useEffect } from 'react';
import { View } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Explainer from './components/Explainer';
import Summarizer from './components/Summarizer';
import FlashcardsView from './components/FlashcardsView';
import QuizView from './components/QuizView';

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
  studyMinutes: 0,
  quizzesTaken: 0,
  avgScore: 0
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('dashboard');
  
  // Initialize state from localStorage or defaults
  const [chartData, setChartData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).chartData : INITIAL_CHART_DATA;
  });
  
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).stats : INITIAL_STATS;
  });

  // Sync with localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ chartData, stats }));
  }, [chartData, stats]);

  const handleResetDashboard = () => {
    setChartData(INITIAL_CHART_DATA);
    setStats(INITIAL_STATS);
  };

  const updateStudyProgress = (minutesToAdd: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = days[new Date().getDay()];

    setStats(prev => ({
      ...prev,
      studyMinutes: prev.studyMinutes + minutesToAdd
    }));

    setChartData(prev => prev.map(item => {
      if (item.name === today) {
        // We store hours in the chart for better visual scale
        const currentMinutes = (item.hours || 0) * 60;
        const newHours = parseFloat(((currentMinutes + minutesToAdd) / 60).toFixed(2));
        return { ...item, hours: newHours };
      }
      return item;
    }));
  };

  const updateQuizMetrics = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    
    setStats(prev => {
      const newQuizzesTaken = prev.quizzesTaken + 1;
      const newAvgScore = Math.round(((prev.avgScore * prev.quizzesTaken) + percentage) / newQuizzesTaken);
      return {
        ...prev,
        quizzesTaken: newQuizzesTaken,
        avgScore: newAvgScore
      };
    });

    // Quizzes also count as heavy study time (30 mins)
    updateStudyProgress(30);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <Dashboard 
            onViewChange={setActiveView} 
            chartData={chartData}
            stats={{
              studyMinutes: stats.studyMinutes,
              quizzesTaken: stats.quizzesTaken,
              avgScore: stats.avgScore
            }}
            onReset={handleResetDashboard}
          />
        );
      case 'explainer':
        // Chat interaction adds 5 mins of study time
        return <Explainer onInteraction={() => updateStudyProgress(5)} />;
      case 'summarizer':
        // Summarizing adds 10 mins
        return <Summarizer onSummaryGenerated={() => updateStudyProgress(10)} />;
      case 'flashcards':
        // Flashcard session adds 15 mins
        return <FlashcardsView onSessionComplete={() => updateStudyProgress(15)} />;
      case 'quiz':
        return <QuizView onQuizComplete={updateQuizMetrics} />;
      default:
        return <Dashboard onViewChange={setActiveView} chartData={chartData} stats={stats} onReset={handleResetDashboard} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden lg:ml-64 transition-all">
        <header className="lg:hidden h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-10">
           <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">E</div>
            <span className="font-display font-bold text-lg text-indigo-900">EduGenie</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
