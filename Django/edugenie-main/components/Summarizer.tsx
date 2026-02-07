
import React, { useState, useRef } from 'react';
import { summarizePdf, summarizeAudio, summarizeVideo, summarizeText } from '../services/django'; // Import new specific functions

interface SummarizerProps {
  onSummaryGenerated?: () => void;
}

const Summarizer: React.FC<SummarizerProps> = ({ onSummaryGenerated }) => {
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Changed from filePreview
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSummarize = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      let result = '';
      if (selectedFile) {
        if (selectedFile.type === 'application/pdf') {
          result = await summarizePdf(selectedFile);
        } else if (selectedFile.type.startsWith('audio/')) {
          result = await summarizeAudio(selectedFile);
        } else if (selectedFile.type.startsWith('video/')) {
          result = await summarizeVideo(selectedFile);
        } else {
          // Fallback for image/text files, if still supported via Django
          // For now, assuming these are also handled by a generic text summarization
          // or a separate image summarization service in Django if needed.
          // For this request, we'll treat them as plain text for now or extend
          // createNote to handle general summarization.
          const reader = new FileReader();
          reader.onload = async () => {
            const fileContent = reader.result as string;
            // Now use the new summarizeText function for plain text files
            result = await summarizeText(fileContent); 
            setSummary(result);
            if (onSummaryGenerated) onSummaryGenerated();
          };
          reader.readAsText(selectedFile);
          // Need to handle async nature of FileReader, so return here and update summary inside onload
          return;
        }
      } else if (notes.trim()) {
        // Summarize direct text input using the new summarizeText function
        result = await summarizeText(notes); 
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

    setSelectedFile(file); // Store the File object
    setNotes(''); // Clear notes when a file is selected
  };

  const handleClear = () => {
    setNotes('');
    setSummary('');
    setSelectedFile(null); // Clear selected file
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12">
      <header>
        <h2 className="text-2xl font-display font-bold text-slate-800">Note Summarizer</h2>
        <p className="text-slate-500">Transform dense study materials into easy-to-digest bullet points from various sources (text, PDF, audio, video).</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-slate-700">Paste Your Notes or Upload</label>
              <button onClick={handleClear} className="text-xs text-slate-400 hover:text-rose-500 transition-colors">Clear All</button>
            </div>

            {selectedFile ? ( // Use selectedFile for preview logic
              <div className="relative w-full h-96 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 p-4">
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                <div className="text-indigo-600 mb-4">
                  {/* Icon based on file type */}
                  {selectedFile.type === 'application/pdf' && (
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  )}
                  {selectedFile.type.startsWith('audio/') && (
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13m-6 2H9a2 2 0 00-2 2v2H5a2 2 0 01-2-2V7l3-3 3 3V19zm9 0V6l-3 3M19 19V6l-2 2"/></svg>
                  )}
                  {selectedFile.type.startsWith('video/') && (
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4-4-4-4m-6 4L5 6l4-4m7 13h-3a2 2 0 01-2-2V9a2 2 0 012-2h3m0 6a2 2 0 01-2 2H9a2 2 0 01-2-2v-2a2 2 0 012-2h5a2 2 0 012 2v2zm-4 4h.01M12 11h.01M12 13h.01M12 15h.01M12 17h.01"/></svg>
                  )}
                  {/* Default icon for other file types, including text/plain and images, if we decide not to preview images directly */}
                  {!['application/pdf', 'audio/', 'video/'].some(prefix => selectedFile.type.startsWith(prefix)) && (
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-600 truncate max-w-full px-4">{selectedFile.name}</p>
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
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,text/plain,application/pdf,audio/*,video/*" // Updated accept attribute
              />
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <span>Upload</span>
              </button>
              <button onClick={handleSummarize} disabled={isLoading || (!notes.trim() && !selectedFile)} className="flex-[2] py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-200 transition-all">
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
