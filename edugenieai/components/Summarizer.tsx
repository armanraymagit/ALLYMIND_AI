import React, { useState, useRef, useEffect } from 'react';
import { summarizeNotes, extractTextFromImage, classifyImage, trimRepetitionLoop } from '../services/ai';
import ReactMarkdown from 'react-markdown';
import { SimpleFileProcessor, ProcessedFile } from '../services/simpleFileProcessor';
import { api } from '../services/api';

interface SummarizerProps {
  onSummaryGenerated?: (type: 'quiz' | 'flashcards', content: string) => void;
}

const Summarizer: React.FC<SummarizerProps> = ({ onSummaryGenerated }) => {
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [filePreview, setFilePreview] = useState<ProcessedFile | null>(null);
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preloading disabled as per user request
  /*
  useEffect(() => {
    preloadVisionModel();
  }, []);
  */

  const handleSummarize = async () => {
    if (isLoading || !notes.trim()) return;

    setIsLoading(true);
    setIsModelLoading(true);
    setSummary('');
    try {
      let result = '';
      const onToken = (token: string) => {
        if (isModelLoading) setIsModelLoading(false);
        setSummary(prev => trimRepetitionLoop(prev + token, 25));
      };

      try {
        result = await api.getSummaryFromBackend(notes.trim());
      } catch (e) {
        console.warn('Backend summarization failed, falling back to Ollama proxy', e);
        result = await summarizeNotes(notes, onToken);
      }

      setSummary(result);
    } catch (error) {
      console.error(error);
      alert("Failed to generate summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setNotes('');
    setSummary('');
    setFilePreview(null);
    setClassificationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setNotes('');
    setSummary('');
    setClassificationError(null);
    try {
      const processed = await SimpleFileProcessor.processFile(file);
      setFilePreview(processed);

      if (processed.type.startsWith('image/')) {
        // Extraction happens in Ollama; generated text goes into notes
        setIsExtracting(true);
        const onToken = (token: string) => {
          if (isModelLoading) setIsModelLoading(false);
          setNotes(prev => trimRepetitionLoop(prev + token, 25));
        };
        setIsModelLoading(true);
        const extractedText = await extractTextFromImage(processed.content, onToken);
        setNotes(extractedText);
        setIsExtracting(false);
        classifyImage(processed.content).then(result => {
          if (result.label === 'Unclassified' || (result.label === 'Other' && result.confidence === 'low')) {
            setClassificationError('This image could not be confidently classified as academic content. Please check image quality.');
          }
        }).catch(err => {
          console.error('Classification check failed', err);
        });
      } else {
        // PDF or text: content is already extracted
        setNotes(processed.content);
      }
    } catch (error) {
      console.error(error);
      alert((error as Error).message);
    } finally {
      setIsLoading(false);
      setIsModelLoading(false);
      setIsExtracting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12">
      <header>
        <h2 className="text-2xl font-display font-bold text-slate-800">Note Summarizer</h2>
        <p className="text-slate-500">Transform dense study notes into easy-to-digest bullet points.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-slate-700">Paste Your Notes</label>
              <button onClick={handleClear} className="text-xs text-slate-400 hover:text-rose-500 transition-colors">Clear All</button>
            </div>

            {classificationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center">
                <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {classificationError}
              </div>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={filePreview ? (filePreview.type.startsWith('image/') ? `Extracted from ${filePreview.name} — edit if needed` : `Loaded from ${filePreview.name} — edit if needed`) : "Type or paste your study materials here..."}
              disabled={isLoading}
              className="w-full h-80 p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-100 outline-none transition-all resize-none text-slate-700"
            />

            {filePreview && (
              <div className="mt-2 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2 truncate">
                    <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm">
                      {filePreview.type.startsWith('image/') ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-indigo-900 truncate">{filePreview.name}</span>
                  </div>
                  <button onClick={() => { setFilePreview(null); setClassificationError(null); }} className="p-1 hover:text-indigo-600 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                {filePreview.type.startsWith('image/') && (
                  <div className="relative w-full aspect-video bg-white rounded-xl overflow-hidden shadow-inner border border-indigo-100">
                    <img
                      src={filePreview.content}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex space-x-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,.jpg,.jpeg,.png,.txt,.pdf"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span>Upload</span>
              </button>
              <button
                onClick={handleSummarize}
                disabled={isLoading || !notes.trim()}
                className="flex-[2] py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 transition-all shadow-md active:scale-95"
              >
                {isLoading ? (notes ? "Summarizing..." : "Extracting text...") : "Generate Summary"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 p-6 h-full min-h-[500px] flex flex-col ${!summary ? 'justify-center items-center' : ''}`}>
            {summary ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 prose prose-indigo prose-sm max-w-none text-slate-700 leading-relaxed font-medium">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>

                {/* Workflow Buttons */}
                <div className="mt-8 pt-6 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <button
                    onClick={() => onSummaryGenerated?.('quiz', summary)}
                    className="py-3 px-4 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    <span>Quiz</span>
                  </button>
                  <button
                    onClick={() => onSummaryGenerated?.('flashcards', summary)}
                    className="py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <span>Cards</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const title = summary.split('\n')[0].replace(/[#*]/g, '').trim().substring(0, 50) || 'New Summary';
                        await api.saveNote(title, summary);
                        alert('Saved to your notes!');
                      } catch (e) {
                        alert('Failed to save note');
                      }
                    }}
                    className="py-3 px-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="text-center p-8 flex flex-col items-center space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                {isModelLoading && (
                  <p className="text-indigo-600 font-semibold animate-pulse uppercase tracking-widest text-[10px]">Warming up AI...</p>
                )}
                <p className="text-slate-400 font-medium">{isExtracting ? "Extracting text from image..." : "Summarizing your notes..."}</p>
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
