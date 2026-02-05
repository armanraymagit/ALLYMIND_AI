
import React, { useState } from 'react';
import { generateFlashcards } from '../services/gemini';
import { Flashcard } from '../types';

interface FlashcardsViewProps {
  onSessionComplete?: () => void;
}

const FlashcardsView: React.FC<FlashcardsViewProps> = ({ onSessionComplete }) => {
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const generated = await generateFlashcards(topic, content);
      setCards(generated);
      setCurrentIndex(0);
      setIsFlipped(false);
      if (onSessionComplete) onSessionComplete();
    } catch (error) {
      alert("Failed to generate flashcards.");
    } finally {
      setIsLoading(false);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <header>
        <h2 className="text-2xl font-display font-bold text-slate-800">Flashcard Master</h2>
        <p className="text-slate-500">Memorize smarter with AI-generated flashcards.</p>
      </header>

      {cards.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <div className="max-w-xl mx-auto space-y-6 text-center">
            <h3 className="text-xl font-bold text-slate-800">Start Your Session</h3>
            <div className="text-left space-y-4">
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic..." className="w-full px-4 py-3 rounded-xl border outline-none" />
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Notes..." className="w-full h-32 px-4 py-3 rounded-xl border outline-none resize-none" />
            </div>
            <button onClick={handleGenerate} disabled={isLoading || !topic.trim()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg">
              {isLoading ? 'Generating...' : 'Generate Flashcards'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-8">
          <div className="flex items-center space-x-4">
             <button onClick={() => setCards([])} className="text-slate-400 hover:text-slate-600 flex items-center space-x-1">
                <span>Back</span>
             </button>
             <span className="font-bold text-slate-800">{topic}</span>
          </div>
          <div className="w-full max-w-lg aspect-[3/2] relative perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
              <div className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl border border-slate-100 p-8 flex items-center justify-center text-center">
                <p className="text-2xl font-bold text-slate-800">{cards[currentIndex].front}</p>
              </div>
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 rounded-3xl shadow-xl p-8 flex items-center justify-center text-center text-white">
                <p className="text-xl font-medium">{cards[currentIndex].back}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-8">
            <button onClick={prevCard} className="p-4 bg-white rounded-full border shadow-sm">Prev</button>
            <div className="text-slate-500 font-medium"><span>{currentIndex + 1}</span> / {cards.length}</div>
            <button onClick={nextCard} className="p-4 bg-white rounded-full border shadow-sm">Next</button>
          </div>
        </div>
      )}
      <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }`}</style>
    </div>
  );
};

export default FlashcardsView;
