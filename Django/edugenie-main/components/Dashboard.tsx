import React, { useState, useRef, ChangeEvent } from 'react';
import { View } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { createDocumentEmbedding } from '../services/django';

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

  // State and refs for RAG document upload
  const ragFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedRAGFile, setSelectedRAGFile] = useState<File | null>(null);
  const [isLoadingRAGUpload, setIsLoadingRAGUpload] = useState<boolean>(false);

  const handleRAGFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedRAGFile(event.target.files[0]);
    }
  };

  const handleRAGUpload = async () => {
    if (!selectedRAGFile) return;

    setIsLoadingRAGUpload(true);
    try {
      // Placeholder for actual API call
      // In a real scenario, you would send selectedRAGFile to your backend
      console.log("Uploading file for RAG:", selectedRAGFile.name);
      await createDocumentEmbedding(selectedRAGFile);
      alert("Document uploaded and indexed successfully!");
      setSelectedRAGFile(null); // Clear selected file after upload
    } catch (error) {
      console.error("Error uploading document for RAG:", error);
      alert("Failed to upload document.");
    } finally {
      setIsLoadingRAGUpload(false);
    }
  };

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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Quizzes Taken</p>
            <p className="text-2xl font-bold text-slate-800">{stats.quizzesTaken}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Avg. Score</p>
            <p className="text-2xl font-bold text-slate-800">{stats.avgScore}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button
          onClick={() => onViewChange('explainer')}
          className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.364-6.364l-.707-.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div>
              <p className="font-bold text-slate-700">Explain a Concept</p>
              <p className="text-xs text-slate-400">Stuck on a topic? Get a simple explanation.</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          onClick={() => onViewChange('summarizer')}
          className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <p className="font-bold text-slate-700">Summarize My Notes</p>
              <p className="text-xs text-slate-400">Paste your long notes for key takeaways.</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          onClick={() => onViewChange('quiz')}
          className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <div>
              <p className="font-bold text-slate-700">Take a Quick Quiz</p>
              <p className="text-xs text-slate-400">Test your knowledge on any subject.</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-300 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button
          onClick={() => onViewChange('quizGenerator')} // New action
          className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-fuchsia-200 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-fuchsia-50 rounded-xl flex items-center justify-center text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <div>
              <p className="font-bold text-slate-700">Generate Quiz</p>
              <p className="text-xs text-slate-400">Create quizzes from your notes.</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-300 group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
        <button
          onClick={() => onViewChange('hybridRAGChat')} // New action
          className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.012 0 01-4.255-.949L3 20l1.395-3.105A9.776 9.012 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </div>
            <div>
              <p className="font-bold text-slate-700">Chat with my Notes (RAG)</p>
              <p className="text-xs text-slate-400">Ask questions and get answers from your uploaded documents.</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-300 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Document Upload for RAG */}
      <div className="mt-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Upload Document for RAG</h3>
        <div className="space-y-4">
          <input
            type="file"
            ref={ragFileInputRef}
            onChange={handleRAGFileChange}
            className="hidden"
            accept=".txt,.pdf" // Accepting text and PDF for now
          />
          <button
            onClick={() => ragFileInputRef.current?.click()}
            className="w-full py-3 px-4 bg-gray-100 text-gray-800 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span>Select Document (Text or PDF)</span>
          </button>
          {selectedRAGFile && (
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
              <span className="text-sm text-gray-700">{selectedRAGFile.name}</span>
              <button onClick={() => setSelectedRAGFile(null)} className="text-red-500 hover:text-red-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          <button
            onClick={handleRAGUpload}
            disabled={isLoadingRAGUpload || !selectedRAGFile}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-200 transition-all"
          >
            {isLoadingRAGUpload ? "Uploading and Indexing..." : "Upload and Index Document"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;