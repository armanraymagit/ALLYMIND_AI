
export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  summary: string;
  timestamp: number;
}

export type View = 'dashboard' | 'explainer' | 'summarizer' | 'flashcards' | 'quiz';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
