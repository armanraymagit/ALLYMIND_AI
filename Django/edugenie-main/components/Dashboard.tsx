
import React from 'react';
import { View } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  onViewChange: (view: View) => void;
  chartData: any[];
  stats: {
    studyMinutes: number;
    quizzesTaken: number;
    avgScore: number;
  };
  onReset: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange, chartData, stats, onReset }) => {
  const handleResetClick = () => {
    if (window.confirm("Are you sure you want to reset all dashboard progress? This will clear your session data.")) {
      onReset();
    }
  };

  const hours = Math.floor(stats.studyMinutes / 60);
  const minutes = stats.studyMinutes % 60;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-800">Welcome back, Student! 👋</h2>
          <p className="text-slate-500 mt-1">What would you like to master today?</p>
        </div>
        <button 
          onClick={handleResetClick}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Reset Data</span>
        </button>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Study Time</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-slate-800">{hours}</span>
              <span className="text-sm font-semibold text-slate-400">h</span>
              <span className="text-2xl font-bold text-slate-800 ml-1">{minutes}</span>
              <span className="text-sm font-semibold text-slate-400">m</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Quizzes Taken</p>
            <p className="text-2xl font-bold text-slate-800">{stats.quizzesTaken}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z"/></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Avg. Score</p>
            <p className="text-2xl font-bold text-slate-800">{stats.avgScore}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Progress Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
            Weekly Activity
            <span className="text-sm font-normal text-slate-400">Hours spent</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: any) => [`${value} hrs`, 'Study Time']}
                />
                <Bar dataKey="hours" radius={[6, 6, 6, 6]} barSize={32}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.hours > 2 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => onViewChange('explainer')}
              className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.364-6.364l-.707-.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-700">Explain a Concept</p>
                  <p className="text-xs text-slate-400">Stuck on a topic? Get a simple explanation.</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>

            <button 
              onClick={() => onViewChange('summarizer')}
              className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-700">Summarize My Notes</p>
                  <p className="text-xs text-slate-400">Paste your long notes for key takeaways.</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>

            <button 
              onClick={() => onViewChange('quiz')}
              className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-700">Take a Quick Quiz</p>
                  <p className="text-xs text-slate-400">Test your knowledge on any subject.</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-300 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
