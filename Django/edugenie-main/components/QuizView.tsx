
import React, { useState } from 'react';
import { generateQuiz } from '../services/gemini';
import { QuizQuestion } from '../types';

interface QuizViewProps {
  onQuizComplete?: (score: number, total: number) => void;
}

const QuizView: React.FC<QuizViewProps> = ({ onQuizComplete }) => {
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const handleStart = async () => {
    if (!topic.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const quiz = await generateQuiz(topic, content);
      setQuestions(quiz);
      setCurrentIdx(0);
      setScore(0);
      setQuizFinished(false);
      setShowResult(false);
    } catch (error) {
      alert("Error generating quiz.");
    } finally {
      setIsLoading(false);
    }
  };

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
      setQuizFinished(true);
      if (onQuizComplete) onQuizComplete(score, questions.length);
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
          <button onClick={() => setQuestions([])} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all">
            Back to Quiz Menu
          </button>
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
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Generate a New Quiz</h3>
            <div className="text-left space-y-4">
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic..." className="w-full px-4 py-3 rounded-xl border outline-none" />
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Notes (optional)..." className="w-full h-32 px-4 py-3 rounded-xl border resize-none" />
            </div>
            <button onClick={handleStart} disabled={isLoading || !topic.trim()} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold">
              {isLoading ? 'Generating...' : 'Start Quiz'}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-400">Question {currentIdx + 1} of {questions.length}</span>
            <div className="text-sm font-bold text-slate-700">Score: {score}</div>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-8">
            <h3 className="text-xl font-bold text-slate-800 leading-relaxed">{questions[currentIdx].question}</h3>
            <div className="space-y-3">
              {questions[currentIdx].options.map((opt, i) => (
                <button key={i} onClick={() => handleSelect(opt)} disabled={showResult} className={`w-full p-4 rounded-2xl border text-left font-medium transition-all ${showResult ? (opt === questions[currentIdx].correctAnswer ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : (selectedAnswer === opt ? 'bg-rose-50 border-rose-500 text-rose-700' : 'opacity-50')) : 'hover:bg-amber-50 border-slate-100'}`}>
                  {opt}
                </button>
              ))}
            </div>
            {showResult && (
              <div className="mt-6 p-4 bg-slate-50 rounded-2xl animate-fadeIn">
                <p className="text-sm text-slate-600">{questions[currentIdx].explanation}</p>
                <button onClick={nextQuestion} className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold">
                  {currentIdx + 1 === questions.length ? 'Finish Quiz' : 'Next Question'}
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
