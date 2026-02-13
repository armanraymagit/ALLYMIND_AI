import React, { useState, useEffect, useRef } from 'react';
import { generateQuiz, enhanceQuizWithImage } from '../services/ai';
import { api } from '../services/api';
import { QuizQuestion } from '../types';

interface QuizViewProps {
  onQuizComplete?: (score: number, total: number, timeSpentMinutes: number) => void;
  initialTopic?: string;
  initialContent?: string;
}

const QuizView: React.FC<QuizViewProps> = ({ onQuizComplete, initialTopic = '', initialContent = '' }) => {
  const [topic, setTopic] = useState(initialTopic);
  const [content, setContent] = useState(initialContent);
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [includeImages] = useState(false); // Images disabled
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [timeSpent, setTimeSpent] = useState(0); // in seconds
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const handleStart = async () => {
    if (!topic.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const text = [topic, content].filter(Boolean).join('\n\n');
      let quiz: QuizQuestion[];
      try {
        quiz = await api.getQuizFromBackend(text);
      } catch (e) {
        console.warn('Backend quiz failed, using Ollama proxy', e);
        quiz = await generateQuiz(topic, content, questionCount, includeImages);
      }
      if (quiz.length === 0) {
        quiz = await generateQuiz(topic, content, questionCount, includeImages);
      }
      setQuestions(quiz);
      setCurrentIdx(0);
      setScore(0);
      setQuizFinished(false);
      setShowResult(false);

      // Initialize timer: 1 minute per question
      const totalSeconds = questionCount * 60;
      setTimeRemaining(totalSeconds);
      setTimeSpent(0);
      startTimeRef.current = Date.now();

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up!
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });

        // Track time spent
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setTimeSpent(elapsed);
        }
      }, 1000);

      // Lazily load images for first 3 questions if not included
      if (!includeImages) {
        quiz.forEach(async (q, idx) => {
          if (idx < 3) {
            const enhanced = await enhanceQuizWithImage(q);
            setQuestions(prev => prev.map(item => item.id === q.id ? enhanced : item));
          }
        });
      }
    } catch (error) {
      alert("Error generating quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeUp = () => {
    // Auto-finish quiz when time runs out
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    // Calculate time spent from start time
    const finalTimeSpent = startTimeRef.current
      ? Math.ceil((Date.now() - startTimeRef.current) / 60000)
      : Math.ceil(timeSpent / 60);
    setQuizFinished(true);
    // Use setTimeout to ensure state is updated before calling callback
    setTimeout(() => {
      if (onQuizComplete) onQuizComplete(score, questions.length, finalTimeSpent);
    }, 0);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelectedAnswer(option);
    setShowResult(true);
    if (option === questions[currentIdx].correctAnswer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Quiz finished
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      setQuizFinished(true);
      const timeSpentMinutes = Math.ceil(timeSpent / 60);
      if (onQuizComplete) onQuizComplete(score, questions.length, timeSpentMinutes);
    }
  };

  if (quizFinished) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 animate-fadeIn">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-12">
          <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🏆</div>
          <h2 className="text-3xl font-display font-bold text-slate-800">Quiz Completed!</h2>
          <div className="my-8 py-6 px-8 bg-slate-50 rounded-2xl flex justify-between items-center">
            <span className="text-slate-600 font-medium">Final Score</span>
            <span className="text-3xl font-bold text-indigo-600">{score} / {questions.length}</span>
          </div>
          <div className="space-y-4">
            <div className="text-sm text-slate-500">
              Time spent: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
            </div>
            <button onClick={() => {
              if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
              }
              setQuestions([]);
              setQuizFinished(false);
            }} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all">
              Back to Quiz Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <header>
        <h2 className="text-2xl font-display font-bold text-slate-800">Quiz Master</h2>
        <p className="text-slate-500">Test your knowledge with real-time feedback.</p>
      </header>

      {questions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <div className="max-w-xl mx-auto space-y-6 text-center">
            <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto text-amber-600 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Generate a New Quiz</h3>
            <div className="text-left space-y-4">
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic..." className="w-full px-4 py-3 rounded-xl border outline-none font-medium" />

              {/* Improved Number Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">Number of Questions: <span className="text-amber-600 font-bold">{questionCount}</span></label>

                {/* Slider */}
                <div className="relative">
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>5</span>
                    <span>30</span>
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[5, 10, 15, 20, 25].map((num) => (
                    <button
                      key={num}
                      onClick={() => setQuestionCount(num)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${questionCount === num
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Notes (optional)..." className="w-full h-32 px-4 py-3 rounded-xl border resize-none" />
            </div>
            <button onClick={handleStart} disabled={isLoading || !topic.trim()} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold hover:bg-amber-600 transition-all disabled:opacity-50">
              {isLoading ? 'Generating...' : 'Start Quiz'}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">Question {currentIdx + 1} of {questions.length}</span>
            <div className="flex items-center gap-4">
              {/* Timer Display */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${timeRemaining <= 60
                ? 'bg-rose-100 text-rose-700'
                : timeRemaining <= 180
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-700'
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-700">Score: {score}</div>
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 flex flex-col items-stretch">

            <div className={`flex flex-col md:flex-row gap-8 ${questions[currentIdx].imageUrl ? 'items-start' : 'items-center'}`}>

              {/* Question Content */}
              <div className="flex-1 space-y-6">
                <div className="space-y-4">
                  <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-bold uppercase tracking-widest">Question</span>
                  <h3 className="text-2xl font-bold text-slate-800 leading-tight">{questions[currentIdx].question}</h3>
                </div>

                <div className="space-y-3">
                  {questions[currentIdx].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelect(opt)}
                      disabled={showResult}
                      className={`w-full p-5 rounded-2xl border-2 text-left font-semibold transition-all shadow-sm ${showResult
                        ? (opt === questions[currentIdx].correctAnswer
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-emerald-50'
                          : (selectedAnswer === opt ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-rose-50' : 'opacity-40 border-slate-50 font-normal'))
                        : 'hover:bg-amber-50 hover:border-amber-200 border-slate-100 text-slate-700 active:scale-[0.98]'
                        }`}
                    >
                      <div className="flex items-center space-x-4">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center border font-bold text-sm ${showResult && opt === questions[currentIdx].correctAnswer ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Side Image (If available) */}
              {questions[currentIdx].imageUrl && (
                <div className="w-full md:w-80 h-80 bg-slate-50 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center animate-fadeIn border border-slate-50">
                  <img src={questions[currentIdx].imageUrl} alt="Visual Hint" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {showResult && (
              <div className="mt-8 p-6 bg-slate-50 rounded-3xl animate-slideUp border border-slate-100">
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-full ${selectedAnswer === questions[currentIdx].correctAnswer ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {selectedAnswer === questions[currentIdx].correctAnswer ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{selectedAnswer === questions[currentIdx].correctAnswer ? 'Splendid!' : 'Not quite right'}</p>
                    <p className="text-slate-600 leading-relaxed">{questions[currentIdx].explanation}</p>
                  </div>
                </div>
                <button onClick={nextQuestion} className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                  {currentIdx + 1 === questions.length ? 'Finish & See Summary' : 'Move to Next Question'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizView;
