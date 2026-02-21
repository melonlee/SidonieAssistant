
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 for binary, raw text for text/plain
  size?: number;
  originalFileType?: string; // e.g. 'docx', 'pdf'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
  errorMessage?: string;
  groundingMetadata?: any; // For Google Search Grounding results
  plan?: string; // Extracted plan content
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  theme?: 'blue' | 'yellow' | 'green' | 'purple' | 'default'; 
}

export interface ApiKeys {
  deepseek?: string;
  kimi?: string;
  qwen?: string;
}

export interface UserProfile {
  nickname: string;
  profession: string;
  about: string;
  customInstructions: string;
}

// --- Study Module Types ---

export interface StudyTopic {
  id: string;
  title: { zh: string; en: string }; // Bilingual titles
  description: { zh: string; en: string };
  promptKey: string; // Key to help AI understand context
}

export interface StudyStage {
  id: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  topics: StudyTopic[];
}

export interface Course {
  id: string;
  name: string; // e.g. "Grade 3 Math"
  subject: string;
  grade: string;
  stages: StudyStage[];
  createdAt: number;
}

export interface Badge {
  id: string;
  name: { zh: string; en: string };
  description: { zh: string; en: string };
  icon: string; // Emoji or icon name
  unlocked: boolean;
  condition: { zh: string; en: string };
}

export interface StudyActivity {
  id: string;
  timestamp: number;
  topicId: string;
  topicTitle: string;
  type: 'quiz' | 'concept' | 'visual';
  score?: number; // For quizzes
  content?: string; // Saved generated content
  quizData?: any; // Saved quiz JSON
  userAnswerIndex?: number; // Saved user answer
}

export interface SchoolNote {
  id: string;
  timestamp: number;
  subject: 'math' | 'chinese' | 'english' | 'science' | 'other';
  content: string;
  images: string[]; // Base64 strings
  aiAnalysis?: string; // Saved AI interpretation
  aiPractice?: string; // Saved generated questions
}

export interface TopicReviewData {
  topicId: string;
  lastReviewed: number; // timestamp
  nextReview: number; // timestamp
  interval: number; // current interval in days
  easeFactor: number; // SM-2 ease factor (default 2.5)
  streak: number; // consecutive correct answers
}

export interface StudyState {
  xp: number;
  level: number;
  badges: Badge[];
  activityLog: StudyActivity[]; // Generated learning history
  schoolNotes: SchoolNote[]; // Daily teacher notes
  courses: Course[]; // Custom generated curriculums
  activeCourseId: string; // Currently selected course
  reviewData: Record<string, TopicReviewData>; // Map of topicId to review status
}

// --- Academic Module Types ---
export interface Paper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  link: string;
  pdfLink: string;
  category: string;
}

export type AppView = 'chat' | 'notes' | 'painting' | 'study' | 'academic';
export type Language = 'en' | 'zh';
