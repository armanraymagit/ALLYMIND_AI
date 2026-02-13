export interface Flashcard {
  id: string;
  front: string;
  back: string;
  imageUrl?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  imageUrl?: string;
}

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  summary: string;
  timestamp: number;
}

export type View =
  | 'dashboard'
  | 'explainer'
  | 'summarizer'
  | 'flashcards'
  | 'quiz'
  // | 'lectureBuddy';

export interface ViewUsage {
  dashboard: number; // in seconds
  explainer: number; // in seconds
  summarizer: number; // in seconds
  flashcards: number; // in seconds
  quiz: number; // in seconds
  // lectureBuddy: number; // in seconds
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
