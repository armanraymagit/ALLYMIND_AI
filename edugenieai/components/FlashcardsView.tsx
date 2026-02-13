
import React, { useState } from 'react';
import { generateFlashcards, enhanceFlashcardWithImage } from '../services/ai';
import { Flashcard } from '../types';

interface FlashcardsViewProps {
  onSessionComplete?: () => void;
  initialTopic?: string;
  initialContent?: string;
}

const FlashcardsView: React.FC<FlashcardsViewProps> = ({ onSessionComplete, initialTopic = '', initialContent = '' }) => {
  const [topic, setTopic] = useState(initialTopic);
  const [content, setContent] = useState(initialContent);
  const [cardCount, setCardCount] = useState(8);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [includeImages] = useState(false); // Images disabled

  const handleGenerate = async () => {
    if (!topic.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const generated = await generateFlashcards(topic, content, cardCount, includeImages);
      setCards(generated);
      setCurrentIndex(0);
      setIsFlipped(false);

      // If images weren't included in the main call, lazily load them for first 5
      if (!includeImages) {
        generated.forEach(async (card, idx) => {
          if (idx < 5) {
            const enhanced = await enhanceFlashcardWithImage(card);
            setCards(prev => prev.map(c => c.id === card.id ? enhanced : c));
          }
        });
      }

      if (onSessionComplete) onSessionComplete();
    } catch {
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
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic..." className="w-full px-4 py-3 rounded-xl border outline-none font-medium" />

              {/* Improved Number Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 block">Number of Cards: <span className="text-indigo-600 font-bold">{cardCount}</span></label>

                {/* Slider */}
                <div className="relative">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={cardCount}
                    onChange={(e) => setCardCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>5</span>
                    <span>50</span>
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[5, 10, 15, 20, 30].map((num) => (
                    <button
                      key={num}
                      onClick={() => setCardCount(num)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${cardCount === num
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Notes..." className="w-full h-32 px-4 py-3 rounded-xl border outline-none resize-none" />
            </div>
            <button onClick={handleGenerate} disabled={isLoading || !topic.trim()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50">
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

          <div className="w-full max-w-2xl aspect-[16/10] relative perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative w-full h-full duration-700 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>

              {/* Front Face: Text Only */}
              <div className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl border border-slate-100 p-12 flex flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4">Question</p>
                <p className="text-3xl font-bold text-slate-800 leading-tight">{cards[currentIndex].front}</p>
              </div>

              {/* Back Face: Just text (Definition) */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 rounded-3xl shadow-xl p-12 flex flex-col items-center justify-center text-center text-white">
                <p className="text-sm font-bold uppercase tracking-widest opacity-60 mb-2">Answer</p>
                <p className="text-2xl font-medium leading-relaxed">{cards[currentIndex].back}</p>
              </div>

            </div>
          </div>

          <div className="flex items-center space-x-8">
            <button onClick={prevCard} className="p-4 bg-white rounded-full border shadow-sm hover:bg-slate-50 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="text-slate-500 font-bold px-6 py-2 bg-white rounded-full border shadow-sm">
              <span>{currentIndex + 1}</span> / {cards.length}
            </div>
            <button onClick={nextCard} className="p-4 bg-white rounded-full border shadow-sm hover:bg-slate-50 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}
      <style>{`.perspective-1000 { perspective: 1000px; } .transform-style-3d { transform-style: preserve-3d; } .backface-hidden { backface-visibility: hidden; } .rotate-y-180 { transform: rotateY(180deg); }`}</style>
    </div>
  );
};

export default FlashcardsView;
