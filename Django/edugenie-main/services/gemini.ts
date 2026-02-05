
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Flashcard, QuizQuestion } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const explainConcept = async (topic: string, context: string = ''): Promise<string> => {
  const ai = getAI();
  const prompt = `Explain the following concept to a student: "${topic}". 
  ${context ? `Use this context: ${context}.` : ''} 
  Provide a simple, clear explanation with examples. Use Markdown formatting for headings and lists.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      temperature: 0.7,
      systemInstruction: "You are a world-class tutor who excels at simplifying complex topics using analogies and clear language."
    }
  });
  
  return response.text || "Sorry, I couldn't generate an explanation.";
};

export const summarizeNotes = async (notes: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Summarize these study notes into clear bullet points and highlight the most important concepts:\n\n${notes}`,
    config: {
      temperature: 0.3,
      systemInstruction: "You are a professional note-taker. Extract the core essence of the provided text while maintaining factual accuracy."
    }
  });
  return response.text || "Summary generation failed.";
};

export const summarizeImage = async (base64Data: string, mimeType: string): Promise<string> => {
  const ai = getAI();
  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };
  const textPart = {
    text: "Extract the text from this image of notes and summarize it into clear bullet points. Highlight key terms and main takeaways."
  };
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [imagePart, textPart] },
    config: {
      temperature: 0.3,
      systemInstruction: "You are an expert at transcribing and summarizing handwritten or printed notes from images."
    }
  });
  
  return response.text || "Failed to process the image.";
};

export const generateFlashcards = async (topic: string, content: string): Promise<Flashcard[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate 5-8 flashcards based on the following: Topic: ${topic}. Content: ${content}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING, description: "A question or term for the front of the card." },
            back: { type: Type.STRING, description: "The answer or definition for the back of the card." }
          },
          required: ["front", "back"]
        }
      }
    }
  });

  const rawJson = JSON.parse(response.text || "[]");
  return rawJson.map((item: any, index: number) => ({
    ...item,
    id: `card-${Date.now()}-${index}`
  }));
};

export const generateQuiz = async (topic: string, content: string): Promise<QuizQuestion[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a 5-question multiple choice quiz about: Topic: ${topic}. Content: ${content}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING, description: "Must match exactly one of the options." },
            explanation: { type: Type.STRING, description: "Why this answer is correct." }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    }
  });

  const rawJson = JSON.parse(response.text || "[]");
  return rawJson.map((item: any, index: number) => ({
    ...item,
    id: `quiz-${Date.now()}-${index}`
  }));
};
