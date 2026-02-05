
import React, { useState, useRef } from 'react';
import { summarizeNotes, summarizeImage } from '../services/gemini';

interface SummarizerProps {
  onSummaryGenerated?: () => void;
}

const Summarizer: React.FC<SummarizerProps> = ({ onSummaryGenerated }) => {
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filePreview, setFilePreview] = useState<{ name: string; type: string; data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSummarize = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      let result = '';
      if (filePreview && filePreview.type.startsWith('image/')) {
        result = await summarizeImage(filePreview.data, filePreview.type);
      } else if (filePreview && filePreview.type === 'text/plain') {
        result = await summarizeNotes(filePreview.data);
      } else if (notes.trim()) {
        result = await summarizeNotes(notes);
      } else {
        alert("Please provide some notes or upload a file first.");
        setIsLoading(false);
        return;
      }
      setSummary(result);
      if (onSummaryGenerated) onSummaryGenerated();
    } catch (error) {
      console.error(error);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      setFilePreview({
        name: file.name,
        type: file.type,
        data: file.type.startsWith('image/') ? base64Data : (reader.result as string)
      });
      setNotes('');
    };

    if (file.type.startsWith('image/')) {
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain') {
      reader.readAsText(file);
    } else {
      alert("Please upload an image (PNG/JPG) or a plain text file (.txt).");
    }
  };

  const handleClear = () => {
    setNotes('');
    setSummary('');
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12">
      <header>
        <h2 className="text-2xl font-display font-bold text-slate-800">Note Summarizer</h2>
        <p className="text-slate-500">Transform dense study notes or photos of your handwritten notes into easy-to-digest bullet points.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-slate-700">Paste Your Notes or Upload</label>
              <button onClick={handleClear} className="text-xs text-slate-400 hover:text-rose-500 transition-colors">Clear All</button>
            </div>

            {filePreview ? (
              <div className="relative w-full h-96 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 p-4">
                <button 
                  onClick={() => setFilePreview(null)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                {filePreview.type.startsWith('image/') ? (
                  <img src={`data:${filePreview.type};base64,${filePreview.data}`} alt="Preview" className="max-h-[80%] rounded-lg shadow-sm mb-4 object-contain" />
                ) : (
                  <div className="text-indigo-600 mb-4">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  </div>
                )}
                <p className="text-sm font-medium text-slate-600 truncate max-w-full px-4">{filePreview.name}</p>
              </div>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type or paste your study materials here..."
                className="w-full h-96 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-100 outline-none transition-all resize-none text-slate-700"
              />
            )}

            <div className="mt-4 flex space-x-3">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,text/plain" />
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <span>Upload</span>
              </button>
              <button onClick={handleSummarize} disabled={isLoading || (!notes.trim() && !filePreview)} className="flex-[2] py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-200 transition-all">
                {isLoading ? "Summarizing..." : "Generate Summary"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 p-6 h-full min-h-[500px] flex flex-col ${!summary ? 'justify-center items-center' : ''}`}>
            {summary ? (
              <div className="prose prose-indigo prose-sm max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
                {summary}
              </div>
            ) : (
              <div className="text-center p-8 text-slate-400">
                <p className="font-medium">Summary will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summarizer;
