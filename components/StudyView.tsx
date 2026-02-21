
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Trophy, 
  Map, 
  ChevronRight, 
  BookOpen, 
  CheckCircle2, 
  ArrowLeft, 
  GraduationCap,
  Sparkles,
  Calendar as CalendarIcon,
  LayoutGrid,
  ChevronLeft,
  X,
  History,
  Clock,
  Star,
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  Backpack, 
  Plus,
  Image as ImageIcon,
  Trash2,
  BrainCircuit,
  PenTool,
  ChevronDown,
  Activity,
  AlertCircle,
  RefreshCw,
  Brain,
  Timer
} from 'lucide-react';
import { StudyState, StudyTopic, Message, Role, ApiKeys, UserProfile, Language, StudyActivity, SchoolNote, Course, TopicReviewData } from '../types';
import { 
  DEFAULT_MATH_SYLLABUS, 
  STUDY_BADGES, 
  TRANSLATIONS, 
  STUDY_TUTOR_INSTRUCTION, 
  COURSE_GENERATION_INSTRUCTION,
  DEFAULT_MODEL, 
  ALLOWED_MIME_TYPES, 
  MAX_FILE_SIZE 
} from '../constants';
import { streamChatResponse } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import PlanWidget from './PlanWidget';
import Confetti from 'react-canvas-confetti';

interface StudyViewProps {
  language: Language;
  apiKeys: ApiKeys;
  userProfile: UserProfile;
}

// Helper to parse XML tags from the model response
const parseMessageWithPlan = (rawText: string) => {
  const thoughtRegex = /<thought>([\s\S]*?)<\/thought>/;
  const planRegex = /<plan>([\s\S]*?)<\/plan>/;
  
  const thoughtMatch = rawText.match(thoughtRegex);
  const planMatch = rawText.match(planRegex);

  let cleanText = rawText;
  let planContent = null;
  let thoughtContent = null;

  if (thoughtMatch) {
    thoughtContent = thoughtMatch[1].trim();
    cleanText = cleanText.replace(thoughtMatch[0], '');
  }

  if (planMatch) {
    planContent = planMatch[1].trim();
    cleanText = cleanText.replace(planMatch[0], '');
  }
  
  // Cleanup any partial tags if streaming
  cleanText = cleanText.replace(/<thought>[\s\S]*/, '').replace(/<plan>[\s\S]*/, '');
  
  return { plan: planContent, thought: thoughtContent, text: cleanText.trim() };
};

const StudyView: React.FC<StudyViewProps> = ({ language, apiKeys, userProfile }) => {
  const t = TRANSLATIONS[language];
  
  // --- State ---
  const [viewMode, setViewMode] = useState<'map' | 'session' | 'calendar' | 'homework'>('map');
  const [studyState, setStudyState] = useState<StudyState>({
    xp: 0,
    level: 1,
    badges: STUDY_BADGES,
    activityLog: [],
    schoolNotes: [],
    // Initialize with default course immediately to prevent "undefined" error on first render
    courses: [{
        id: 'default_math',
        name: language === 'zh' ? '数学 (默认)' : 'Math (Default)',
        subject: 'math',
        grade: 'All',
        stages: DEFAULT_MATH_SYLLABUS,
        createdAt: Date.now()
    }],
    activeCourseId: 'default_math',
    reviewData: {} // Initialize spaced repetition data
  });

  const [activeTopic, setActiveTopic] = useState<StudyTopic | null>(null);
  
  // Course Management State
  const [isCourseMenuOpen, setIsCourseMenuOpen] = useState(false);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [newCourseSubject, setNewCourseSubject] = useState('');
  const [newCourseGrade, setNewCourseGrade] = useState('');
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);

  // Session State
  const [currentContent, setCurrentContent] = useState<string>('');
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerationError, setHasGenerationError] = useState(false);
  const [contentType, setContentType] = useState<'concept' | 'quiz' | 'visual'>('concept');
  
  // Chat State (For Concept Interaction)
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [sessionInput, setSessionInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Quiz State
  const [quizData, setQuizData] = useState<any>(null); // Parsed JSON for quiz
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizStatus, setQuizStatus] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  
  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Detail Modal State
  const [selectedActivity, setSelectedActivity] = useState<StudyActivity | null>(null);
  const [selectedSchoolNote, setSelectedSchoolNote] = useState<SchoolNote | null>(null);

  // School Note Creation State
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newNoteSubject, setNewNoteSubject] = useState<'math' | 'chinese' | 'english' | 'science' | 'other'>('math');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteImages, setNewNoteImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Generation State for School Notes
  const [isAnalyzingNote, setIsAnalyzingNote] = useState(false);
  const [schoolNoteAiStream, setSchoolNoteAiStream] = useState('');

  const canvasRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load state and handle migration/defaults
  useEffect(() => {
    const saved = localStorage.getItem('sidonie_study_state_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Migration: Ensure courses exist
        if (!parsed.courses || parsed.courses.length === 0) {
           parsed.courses = [{
             id: 'default_math',
             name: language === 'zh' ? '数学 (默认)' : 'Math (Default)',
             subject: 'math',
             grade: 'All',
             stages: DEFAULT_MATH_SYLLABUS,
             createdAt: Date.now()
           }];
           parsed.activeCourseId = 'default_math';
        }
        
        if (!parsed.schoolNotes) parsed.schoolNotes = [];
        if (!parsed.reviewData) parsed.reviewData = {}; 

        // Migration: Ensure Badges are up-to-date with new bilingual structure
        // We preserve the 'unlocked' status from saved state, but use the definition from constants
        if (parsed.badges) {
           const updatedBadges = STUDY_BADGES.map(defaultBadge => {
              const savedBadge = parsed.badges.find((b: any) => b.id === defaultBadge.id);
              return savedBadge ? { ...defaultBadge, unlocked: savedBadge.unlocked } : defaultBadge;
           });
           parsed.badges = updatedBadges;
        } else {
           parsed.badges = STUDY_BADGES;
        }
        
        setStudyState(parsed);
      } catch (e) { 
        console.error("Failed to load study state, resetting to default.");
        // Error handling preserves default state set in useState
      }
    }
  }, []);

  // Save state
  useEffect(() => {
    localStorage.setItem('sidonie_study_state_v2', JSON.stringify(studyState));
  }, [studyState]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionMessages, isChatting]);

  // Get Current Active Course with robust fallback
  const activeCourse = useMemo(() => {
      const found = studyState.courses.find(c => c.id === studyState.activeCourseId);
      if (found) return found;
      
      // Fallback 1: First available course
      if (studyState.courses.length > 0) return studyState.courses[0];
      
      // Fallback 2: Reconstruct default if array is empty (failsafe)
      return {
        id: 'default_math',
        name: language === 'zh' ? '数学 (默认)' : 'Math (Default)',
        subject: 'math',
        grade: 'All',
        stages: DEFAULT_MATH_SYLLABUS,
        createdAt: Date.now()
      };
  }, [studyState.courses, studyState.activeCourseId, language]);

  // --- Actions ---

  const handleFireConfetti = () => {
     if (canvasRef.current) {
        canvasRef.current({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
        });
     }
  };

  const handleCreateCourse = async () => {
      if (!newCourseSubject || !newCourseGrade) return;
      setIsGeneratingCourse(true);

      const prompt = `Subject: ${newCourseSubject}\nGrade Level: ${newCourseGrade}\nLanguage: ${language === 'zh' ? 'Chinese' : 'English'}`;
      
      try {
          const history: Message[] = [
              { id: 'sys', role: Role.USER, text: COURSE_GENERATION_INSTRUCTION + "\n\n" + prompt, timestamp: Date.now() }
          ];

          let jsonString = "";
          await streamChatResponse(
              history,
              (chunk) => { jsonString = chunk; }, 
              () => {},
              DEFAULT_MODEL,
              false,
              apiKeys,
              userProfile
          );

          // Robust JSON Extraction
          let cleanJson = jsonString;
          const markdownMatch = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
          if (markdownMatch) {
              cleanJson = markdownMatch[1];
          } else {
              const start = jsonString.indexOf('[');
              const end = jsonString.lastIndexOf(']');
              if (start !== -1 && end !== -1 && end > start) {
                  cleanJson = jsonString.substring(start, end + 1);
              }
          }

          let stages = [];
          try {
             stages = JSON.parse(cleanJson);
          } catch (e) {
             console.error("JSON Parse Error:", e, cleanJson);
             throw new Error("Invalid JSON format received from model.");
          }

          if (!Array.isArray(stages)) throw new Error("Result is not an array");

          const newCourse: Course = {
              id: Date.now().toString(),
              name: `${newCourseGrade} ${newCourseSubject}`,
              subject: newCourseSubject,
              grade: newCourseGrade,
              stages: stages,
              createdAt: Date.now()
          };

          setStudyState(prev => ({
              ...prev,
              courses: [...prev.courses, newCourse],
              activeCourseId: newCourse.id
          }));

          setIsCreatingCourse(false);
          setNewCourseSubject('');
          setNewCourseGrade('');

      } catch (e) {
          console.error("Course Generation Failed", e);
          alert("Failed to generate course. Please try again or simplify your request.");
      } finally {
          setIsGeneratingCourse(false);
      }
  };

  const startTopic = (topic: StudyTopic) => {
    setActiveTopic(topic);
    setViewMode('session');
    generateContent(topic, 'concept'); // Start with a concept
  };

  const saveActivityLog = (topic: StudyTopic, type: 'quiz' | 'concept' | 'visual', content: string, quizDataRaw?: any) => {
      const activity: StudyActivity = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        topicId: topic.id,
        topicTitle: topic.title[language === 'zh' ? 'zh' : 'en'],
        type: type,
        content: content,
        quizData: quizDataRaw
      };
      
      setStudyState(prev => ({
        ...prev,
        activityLog: [...prev.activityLog, activity]
      }));
  };

  const saveSchoolNote = () => {
    if (!newNoteContent.trim() && newNoteImages.length === 0) return;
    
    const note: SchoolNote = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      subject: newNoteSubject,
      content: newNoteContent,
      images: newNoteImages
    };

    setStudyState(prev => ({
      ...prev,
      schoolNotes: [note, ...prev.schoolNotes]
    }));

    // Reset Form
    setNewNoteContent('');
    setNewNoteImages([]);
    setIsCreatingNote(false);
  };

  const deleteSchoolNote = (id: string) => {
    if (window.confirm(t.deleteNoteConfirm)) {
      setStudyState(prev => ({
        ...prev,
        schoolNotes: prev.schoolNotes.filter(n => n.id !== id)
      }));
      if (selectedSchoolNote?.id === id) setSelectedSchoolNote(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.size > MAX_FILE_SIZE) { alert(`File ${file.name} exceeds 10MB.`); continue; }
        if (!file.type.startsWith('image/')) continue;

        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          newImages.push(base64);
        } catch (err) { console.error(err); }
      }
      setNewNoteImages(prev => [...prev, ...newImages]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateNoteAssistance = async (type: 'analysis' | 'practice') => {
    if (!selectedSchoolNote) return;
    
    setIsAnalyzingNote(true);
    setSchoolNoteAiStream('');
    
    const taskPrompt = type === 'analysis' 
      ? `Task: Interpret the teacher's note for a parent. Explain the key learning objectives and what the child needs to focus on today. Be concise and supportive.`
      : `Task: Based on the teacher's note, generate 3 practice questions suitable for the student to reinforce the concepts. Include answers at the end.`;

    const promptText = `
      Context: This is a note from a school teacher about today's homework/learning.
      Subject: ${selectedSchoolNote.subject}
      Content: "${selectedSchoolNote.content}"
      ${selectedSchoolNote.images.length > 0 ? "[Images attached]" : ""}
      
      ${taskPrompt}
      Language: ${language === 'zh' ? 'Chinese (Simplified)' : 'English'}
    `;

    try {
      // Build attachments for API
      const attachments = selectedSchoolNote.images.map(b64 => ({
        name: 'note_image.png',
        mimeType: 'image/png',
        data: b64
      }));

      const history: Message[] = [
        { id: 'sys', role: Role.USER, text: promptText, attachments: attachments, timestamp: Date.now() }
      ];

      let fullResponse = "";
      
      await streamChatResponse(
        history,
        (chunk) => {
          fullResponse = chunk;
          setSchoolNoteAiStream(chunk);
        },
        () => {}, 
        DEFAULT_MODEL,
        false, 
        apiKeys,
        userProfile
      );

      // Save to note
      setStudyState(prev => ({
        ...prev,
        schoolNotes: prev.schoolNotes.map(n => 
          n.id === selectedSchoolNote.id 
          ? { ...n, [type === 'analysis' ? 'aiAnalysis' : 'aiPractice']: fullResponse } 
          : n
        )
      }));

      // Update local selection to show result immediately
      setSelectedSchoolNote(prev => prev ? { ...prev, [type === 'analysis' ? 'aiAnalysis' : 'aiPractice']: fullResponse } : null);

    } catch (e) {
      console.error(e);
      setSchoolNoteAiStream("Error generating response. Please try again.");
    } finally {
      setIsAnalyzingNote(false);
      setSchoolNoteAiStream('');
    }
  };

  const generateContent = async (topic: StudyTopic, type: 'concept' | 'quiz' | 'visual') => {
    setIsGenerating(true);
    setHasGenerationError(false);
    setCurrentContent('');
    setCurrentPlan(null);
    setSessionMessages([]); // Reset chat for new card
    setSessionInput('');
    setContentType(type);
    setQuizData(null);
    setQuizSelectedOption(null);
    setQuizStatus('unanswered');

    // Context for AI Spaced Repetition
    const reviewStatus = studyState.reviewData?.[topic.id];
    let reviewContext = "";
    if (reviewStatus) {
       const daysOverdue = (Date.now() - reviewStatus.nextReview) / (1000 * 60 * 60 * 24);
       if (daysOverdue > 0) {
          reviewContext = `Note: This is a Spaced Repetition REVIEW session. The student previously learned this but needs reinforcement.`;
          if (reviewStatus.streak === 0) {
             reviewContext += ` They struggled last time. Focus on clearing up common misconceptions and simpler examples first.`;
          } else {
             reviewContext += ` They were doing well. Challenge them slightly to deepen memory trace.`;
          }
       }
    }

    const promptText = `
      Topic: "${topic.title[language === 'zh' ? 'zh' : 'en']}" (${topic.description[language === 'zh' ? 'zh' : 'en']}).
      Context: ${topic.promptKey}.
      ${reviewContext}
      Task: Generate a ${type === 'concept' ? 'CONCEPT CARD' : type === 'quiz' ? 'QUIZ CARD' : 'INTERACTIVE VISUAL HTML'}.
      Language: ${language === 'zh' ? 'Chinese (Simplified)' : 'English'}.
      
      If you need to plan the content (especially for Visuals or complex Concepts), use <plan> tags.
      If you need to think, use <thought> tags.
    `;

    try {
      const history: Message[] = [
        { id: 'sys', role: Role.USER, text: STUDY_TUTOR_INSTRUCTION + "\n\n" + promptText, timestamp: Date.now() }
      ];

      let fullResponse = "";
      
      await streamChatResponse(
        history,
        (chunk) => {
          fullResponse = chunk;
          // Live parsing for immediate feedback
          const { text, plan } = parseMessageWithPlan(chunk);
          
          if (plan) setCurrentPlan(plan);
          if (type !== 'quiz') {
            setCurrentContent(text);
          }
        },
        () => {}, 
        DEFAULT_MODEL,
        false, 
        apiKeys,
        userProfile
      );

      // Final parse
      const { text: finalText, plan: finalPlan } = parseMessageWithPlan(fullResponse);
      setCurrentPlan(finalPlan);
      
      let finalQuizData = null;

      // Post-processing
      if (type === 'quiz') {
        const jsonMatch = fullResponse.match(/```json([\s\S]*?)```/);
        if (jsonMatch) {
           try {
             finalQuizData = JSON.parse(jsonMatch[1]);
             setQuizData(finalQuizData);
             setCurrentContent(finalText); 
           } catch (e) {
             console.error("Quiz JSON parse error", e);
             setCurrentContent(finalText); 
           }
        } else {
           setCurrentContent(finalText);
        }
      } else {
         setCurrentContent(finalText);
      }

      // Save to log
      saveActivityLog(topic, type, finalText, finalQuizData);

    } catch (e) {
      console.error(e);
      setHasGenerationError(true);
      setCurrentContent("Error generating content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionInput.trim() || !activeTopic) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: sessionInput,
      timestamp: Date.now()
    };

    setSessionMessages(prev => [...prev, userMsg]);
    setSessionInput('');
    setIsChatting(true);

    try {
      // Reconstruct context: System -> Concept Card (as Model) -> Chat History -> New User Msg
      const contextHistory: Message[] = [
        { 
          id: 'sys', 
          role: Role.USER, 
          text: STUDY_TUTOR_INSTRUCTION + `\n\nCurrent Context Topic: ${activeTopic.title[language === 'zh' ? 'zh' : 'en']}`, 
          timestamp: 0 
        },
        {
          id: 'concept-card',
          role: Role.MODEL,
          text: currentContent, // The generated concept acts as the context anchor
          timestamp: 1
        },
        ...sessionMessages,
        userMsg
      ];

      const aiMsgId = (Date.now() + 1).toString();
      setSessionMessages(prev => [...prev, { id: aiMsgId, role: Role.MODEL, text: '', timestamp: Date.now(), isStreaming: true }]);

      await streamChatResponse(
        contextHistory,
        (chunk) => {
           // We don't usually expect plans in chat replies, but good to be safe
           const { text } = parseMessageWithPlan(chunk);
           setSessionMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: text } : m));
        },
        () => {},
        DEFAULT_MODEL,
        false,
        apiKeys,
        userProfile
      );

      setSessionMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m));

    } catch (e) {
      console.error(e);
    } finally {
      setIsChatting(false);
    }
  };

  const calculateSpacedRepetition = (topicId: string, isCorrect: boolean): TopicReviewData => {
     const currentData = studyState.reviewData?.[topicId] || {
        topicId,
        lastReviewed: 0,
        nextReview: 0,
        interval: 0,
        easeFactor: 2.5,
        streak: 0
     };

     let { interval, easeFactor, streak } = currentData;

     if (isCorrect) {
        // Simplified SM-2 Algorithm
        if (streak === 0) {
           interval = 1; // 1 day
        } else if (streak === 1) {
           interval = 3; // 3 days
        } else {
           interval = Math.round(interval * easeFactor);
        }
        streak += 1;
        // Ease factor adjustment (boost slightly for success)
        easeFactor = Math.min(easeFactor + 0.1, 5.0); 
     } else {
        // Reset on failure
        streak = 0;
        interval = 0; // Review immediately/tomorrow
        // Penalty for failure
        easeFactor = Math.max(easeFactor - 0.2, 1.3);
     }

     const nextReview = Date.now() + (interval * 24 * 60 * 60 * 1000);

     return {
        topicId,
        lastReviewed: Date.now(),
        nextReview,
        interval,
        easeFactor,
        streak
     };
  };

  const handleQuizAnswer = (index: number) => {
    if (quizStatus !== 'unanswered') return;
    
    setQuizSelectedOption(index);
    const isCorrect = index === quizData.correctIndex;
    
    if (isCorrect) {
      setQuizStatus('correct');
      handleFireConfetti();
      addXp(20);
    } else {
      setQuizStatus('incorrect');
    }

    // AI Spaced Repetition Logic
    const reviewData = activeTopic ? calculateSpacedRepetition(activeTopic.id, isCorrect) : null;

    // Update the last activity log with the user's answer & review data
    setStudyState(prev => {
        const newLog = [...prev.activityLog];
        // Find the most recent quiz for this topic
        let lastIndex = -1;
        for (let i = newLog.length - 1; i >= 0; i--) {
            if (newLog[i].topicId === activeTopic?.id && newLog[i].type === 'quiz') {
                lastIndex = i;
                break;
            }
        }
        
        if (lastIndex !== -1) {
            newLog[lastIndex] = {
                ...newLog[lastIndex],
                userAnswerIndex: index,
                score: isCorrect ? 100 : 0
            };
        }

        const updatedReviewData = { ...prev.reviewData };
        if (reviewData) {
           updatedReviewData[reviewData.topicId] = reviewData;
        }

        return { 
           ...prev, 
           activityLog: newLog,
           reviewData: updatedReviewData
        };
    });
  };

  const addXp = (amount: number) => {
    setStudyState(prev => ({
       ...prev,
       xp: prev.xp + amount,
       level: Math.floor((prev.xp + amount) / 100) + 1
    }));
  };

  // --- Calendar Helpers ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDay, year, month };
  };

  // --- Renderers ---

  const getTopicStatus = (topicId: string): { status: 'locked' | 'start' | 'in-progress' | 'mastered', isReviewDue: boolean } => {
    // Check if review is due
    const reviewData = studyState.reviewData?.[topicId];
    const isReviewDue = reviewData ? Date.now() >= reviewData.nextReview : false;

    // Check activity log for this topic
    const topicActivities = studyState.activityLog.filter(a => a.topicId === topicId);
    if (topicActivities.length === 0) return { status: 'start', isReviewDue: false };
    
    // Check if there is a quiz with 100% score
    const hasMastered = topicActivities.some(a => a.type === 'quiz' && a.score === 100);
    
    if (hasMastered) return { status: 'mastered', isReviewDue };
    return { status: 'in-progress', isReviewDue };
  };

  const renderSession = () => {
    if (!activeTopic) return <div className="p-8 text-center flex flex-col items-center justify-center h-full text-gray-500">
        <p className="mb-4">No active topic selected.</p>
        <button onClick={() => setViewMode('map')} className="text-blue-600 font-bold hover:underline">Return to Map</button>
    </div>;

    return (
      <div className="flex flex-col h-full bg-slate-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setViewMode('map')} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
               <ArrowLeft size={20} />
            </button>
            <div>
               <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                 {activeTopic.title[language === 'zh' ? 'zh' : 'en']}
                 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border 
                    ${contentType === 'concept' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      contentType === 'quiz' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                      'bg-orange-50 text-orange-600 border-orange-100'}`}>
                   {contentType === 'concept' ? t.concept : contentType === 'quiz' ? t.quiz : t.visual}
                 </span>
               </h2>
            </div>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => generateContent(activeTopic, 'concept')}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${contentType === 'concept' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
             >
               <BookOpen size={14} /> {t.concept}
             </button>
             <button 
               onClick={() => generateContent(activeTopic, 'quiz')}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${contentType === 'quiz' ? 'bg-purple-100 text-purple-700' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
             >
               <Trophy size={14} /> {t.quiz}
             </button>
             <button 
               onClick={() => generateContent(activeTopic, 'visual')}
               className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${contentType === 'visual' ? 'bg-orange-100 text-orange-700' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}
             >
               <Sparkles size={14} /> {t.visual}
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
           <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Plan Widget */}
              {currentPlan && (
                 <PlanWidget planContent={currentPlan} currentContent={currentContent} isStreaming={isGenerating} />
              )}
              
              {/* Main Content Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px] animate-fade-in relative flex flex-col">
                 {isGenerating && !currentContent && !currentPlan ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                       <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
                       <p className="text-gray-500 font-medium animate-pulse">{t.typing}</p>
                    </div>
                 ) : hasGenerationError ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
                        <div className="text-red-500 mb-4 bg-red-50 p-4 rounded-full">
                            <AlertCircle size={32} />
                        </div>
                        <h3 className="text-gray-900 font-bold text-lg mb-2">Generation Failed</h3>
                        <p className="text-gray-500 text-sm mb-6 max-w-md">
                            We couldn't generate the learning content. This might be due to a connection issue or high traffic.
                        </p>
                        <button 
                            onClick={() => generateContent(activeTopic, contentType)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-medium shadow-lg shadow-gray-200"
                        >
                            <RefreshCw size={18} /> Retry Generation
                        </button>
                    </div>
                 ) : (
                    <div className="p-8 flex-1">
                       {contentType === 'quiz' && quizData ? (
                          <div className="space-y-8 max-w-2xl mx-auto py-8">
                             <div className="flex items-start gap-4">
                                <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                                   <Trophy size={32} />
                                </div>
                                <div>
                                   <h3 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{quizData.question}</h3>
                                   <p className="text-gray-500 text-sm">Select the best answer.</p>
                                </div>
                             </div>
                             
                             <div className="space-y-3">
                                {quizData.options.map((option: string, index: number) => {
                                   let btnClass = "w-full text-left p-5 rounded-2xl border-2 transition-all flex justify-between items-center text-lg ";
                                   if (quizStatus === 'unanswered') {
                                      btnClass += "border-gray-100 hover:border-purple-200 hover:bg-purple-50 text-gray-700";
                                   } else if (quizStatus === 'correct' && index === quizData.correctIndex) {
                                      btnClass += "border-green-500 bg-green-50 text-green-700 font-bold shadow-md transform scale-[1.02]";
                                   } else if (quizStatus === 'incorrect' && index === quizSelectedOption) {
                                      btnClass += "border-red-200 bg-red-50 text-red-700 opacity-75";
                                   } else if (index === quizData.correctIndex) {
                                      btnClass += "border-green-200 bg-green-50 text-green-700 opacity-75";
                                   } else {
                                      btnClass += "border-gray-100 text-gray-400 opacity-50";
                                   }

                                   return (
                                     <button 
                                       key={index}
                                       onClick={() => handleQuizAnswer(index)}
                                       disabled={quizStatus !== 'unanswered'}
                                       className={btnClass}
                                     >
                                        <span>{option}</span>
                                        {quizStatus === 'correct' && index === quizData.correctIndex && <CheckCircle2 size={24} />}
                                        {quizStatus === 'incorrect' && index === quizSelectedOption && <X size={24} />}
                                     </button>
                                   );
                                })}
                             </div>

                             {quizStatus !== 'unanswered' && (
                                <div className={`p-6 rounded-2xl text-base leading-relaxed animate-fade-in ${quizStatus === 'correct' ? 'bg-green-50 text-green-900 border border-green-100' : 'bg-red-50 text-red-900 border border-red-100'}`}>
                                   <strong className="block mb-1 opacity-70 uppercase tracking-wider text-xs">Explanation</strong>
                                   {quizData.explanation}
                                </div>
                             )}
                             
                             {quizStatus !== 'unanswered' && (
                                <div className="flex justify-end pt-4">
                                   <button 
                                     onClick={() => generateContent(activeTopic, 'quiz')} // Generate another quiz
                                     className="px-8 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-bold shadow-lg"
                                   >
                                     {t.next}
                                   </button>
                                </div>
                             )}
                          </div>
                       ) : (
                          <MarkdownRenderer 
                             content={currentContent} 
                             language={language}
                             isStreaming={isGenerating}
                             codeBlockDefaultMode={contentType === 'visual' ? 'preview' : 'code'}
                          />
                       )}
                    </div>
                 )}
              </div>

              {/* Chat Interaction for Concept */}
              {contentType === 'concept' && !isGenerating && !hasGenerationError && (
                 <div className="mt-8 pb-20">
                    <div className="flex items-center gap-2 mb-6">
                       <MessageSquare size={16} className="text-gray-400" />
                       <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.discussion}</h3>
                    </div>
                    
                    <div className="space-y-6 mb-6">
                       {sessionMessages.map(msg => (
                          <div key={msg.id} className={`flex gap-4 ${msg.role === Role.USER ? 'flex-row-reverse' : ''}`}>
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === Role.USER ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                {msg.role === Role.USER ? <User size={18} /> : <Bot size={18} />}
                             </div>
                             <div className={`px-5 py-3.5 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm
                                ${msg.role === Role.USER ? 'bg-black text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}
                             `}>
                                <MarkdownRenderer content={msg.text} language={language} isStreaming={msg.isStreaming} />
                             </div>
                          </div>
                       ))}
                       <div ref={chatBottomRef} />
                    </div>

                    <div className="relative bg-white rounded-2xl border border-gray-200 shadow-lg shadow-gray-100/50 p-2 flex items-end gap-2">
                       <textarea
                         value={sessionInput}
                         onChange={(e) => setSessionInput(e.target.value)}
                         onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                               e.preventDefault();
                               handleSendMessage();
                            }
                         }}
                         placeholder={t.followUpPlaceholder}
                         className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 text-base resize-none max-h-[120px]"
                         rows={1}
                         disabled={isChatting}
                         style={{ minHeight: '48px' }}
                       />
                       <button 
                         onClick={handleSendMessage}
                         disabled={!sessionInput.trim() || isChatting}
                         className="p-3 bg-black hover:bg-gray-800 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-0.5"
                       >
                         {isChatting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                       </button>
                    </div>
                 </div>
              )}
           </div>
        </div>
      </div>
    );
  };

  const renderActivityDetailModal = () => {
    if (!selectedActivity) return null;

    const isQuiz = selectedActivity.type === 'quiz' && selectedActivity.quizData;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white w-full max-w-3xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${selectedActivity.type === 'quiz' ? 'bg-purple-50 text-purple-600' : selectedActivity.type === 'visual' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                 {selectedActivity.type === 'quiz' ? <Trophy size={18} /> : selectedActivity.type === 'visual' ? <Sparkles size={18} /> : <BookOpen size={18} />}
              </div>
              <div>
                 <h3 className="font-bold text-gray-900">{selectedActivity.topicTitle}</h3>
                 <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Clock size={12} /> {new Date(selectedActivity.timestamp).toLocaleString()}
                 </div>
              </div>
            </div>
            <button onClick={() => setSelectedActivity(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
               <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
             {isQuiz ? (
                <div className="space-y-4">
                   <h4 className="font-bold text-lg text-gray-900">{selectedActivity.quizData.question}</h4>
                   <div className="space-y-2">
                      {selectedActivity.quizData.options.map((opt: string, idx: number) => {
                         const isCorrect = idx === selectedActivity.quizData.correctIndex;
                         const isUserSelection = idx === selectedActivity.userAnswerIndex;
                         
                         let itemClass = "p-3 rounded-lg border flex justify-between items-center transition-all ";
                         
                         if (isUserSelection && isCorrect) itemClass += "bg-green-50 border-green-200 text-green-800";
                         else if (isUserSelection && !isCorrect) itemClass += "bg-red-50 border-red-200 text-red-800";
                         else if (isCorrect && selectedActivity.userAnswerIndex !== undefined) itemClass += "bg-green-50/50 border-green-100 text-green-700 opacity-70";
                         else itemClass += "bg-white border-gray-200 text-gray-600";

                         return (
                           <div key={idx} className={itemClass}>
                             <span>{opt}</span>
                             {isCorrect && <CheckCircle2 size={16} />}
                             {isUserSelection && !isCorrect && <X size={16} />}
                           </div>
                         );
                      })}
                   </div>
                   <div className="p-4 bg-gray-100 rounded-xl mt-4 text-sm text-gray-700">
                      <strong>Explanation:</strong> {selectedActivity.quizData.explanation}
                   </div>
                   {selectedActivity.score === 100 && (
                      <div className="mt-4 flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg inline-block">
                         <Star size={16} fill="currentColor" /> Mastery Achieved
                      </div>
                   )}
                </div>
             ) : (
                <MarkdownRenderer 
                  content={selectedActivity.content || ''} 
                  language={language} 
                  codeBlockDefaultMode={selectedActivity.type === 'visual' ? 'preview' : 'code'}
                />
             )}
          </div>
        </div>
      </div>
    );
  };

  const renderSchoolNoteDetailModal = () => {
    if (!selectedSchoolNote) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3">
               <div className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                 ${selectedSchoolNote.subject === 'math' ? 'bg-blue-100 text-blue-700' : 
                   selectedSchoolNote.subject === 'chinese' ? 'bg-red-100 text-red-700' :
                   selectedSchoolNote.subject === 'english' ? 'bg-purple-100 text-purple-700' :
                   'bg-gray-100 text-gray-700'}
               `}>
                 {t[selectedSchoolNote.subject] || selectedSchoolNote.subject}
               </div>
               <span className="text-gray-400 text-sm flex items-center gap-1">
                 <Clock size={12} /> {new Date(selectedSchoolNote.timestamp).toLocaleString()}
               </span>
            </div>
            <div className="flex items-center gap-2">
               <button 
                  onClick={() => deleteSchoolNote(selectedSchoolNote.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
               >
                  <Trash2 size={18} />
               </button>
               <button onClick={() => setSelectedSchoolNote(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                  <X size={20} />
               </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row bg-slate-50/30">
             {/* Left Column: Original Content */}
             <div className="w-full md:w-1/2 p-6 md:border-r border-gray-200/50 space-y-6 overflow-y-auto">
                <div>
                   <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{t.content}</h3>
                   <div className="p-4 bg-white rounded-xl border border-gray-200 text-gray-800 leading-relaxed whitespace-pre-wrap shadow-sm">
                      {selectedSchoolNote.content}
                   </div>
                </div>
                
                {selectedSchoolNote.images.length > 0 && (
                   <div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Attached Images</h3>
                      <div className="grid grid-cols-2 gap-2">
                         {selectedSchoolNote.images.map((b64, idx) => (
                           <img 
                             key={idx} 
                             src={`data:image/png;base64,${b64}`} 
                             className="w-full h-auto rounded-lg border border-gray-200 shadow-sm hover:scale-[1.02] transition-transform cursor-zoom-in"
                             onClick={() => {/* Implement light box if needed */}}
                           />
                         ))}
                      </div>
                   </div>
                )}
             </div>

             {/* Right Column: AI Assistance */}
             <div className="w-full md:w-1/2 p-6 bg-white space-y-6 overflow-y-auto">
                <div className="flex gap-2">
                   <button 
                     onClick={() => generateNoteAssistance('analysis')}
                     disabled={isAnalyzingNote}
                     className="flex-1 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                   >
                     {isAnalyzingNote ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                     {t.analyze}
                   </button>
                   <button 
                     onClick={() => generateNoteAssistance('practice')}
                     disabled={isAnalyzingNote}
                     className="flex-1 py-2 bg-green-50 text-green-700 border border-green-100 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                   >
                     {isAnalyzingNote ? <Loader2 size={16} className="animate-spin" /> : <PenTool size={16} />}
                     {t.generatePractice}
                   </button>
                </div>

                {(selectedSchoolNote.aiAnalysis || (isAnalyzingNote && schoolNoteAiStream)) && (
                   <div className="animate-fade-in">
                      <div className="flex items-center gap-2 mb-2 text-blue-700 font-bold text-sm">
                         <Sparkles size={14} /> {t.aiAnalysis}
                      </div>
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-gray-800 text-sm">
                         <MarkdownRenderer content={isAnalyzingNote ? schoolNoteAiStream : selectedSchoolNote.aiAnalysis || ''} language={language} isStreaming={isAnalyzingNote} />
                      </div>
                   </div>
                )}

                {(selectedSchoolNote.aiPractice) && (
                   <div className="animate-fade-in pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-2 mb-2 text-green-700 font-bold text-sm">
                         <CheckCircle2 size={14} /> {t.aiPractice}
                      </div>
                      <div className="p-4 bg-green-50/50 rounded-xl border border-green-100 text-gray-800 text-sm">
                         <MarkdownRenderer content={selectedSchoolNote.aiPractice} language={language} />
                      </div>
                   </div>
                )}

                {!selectedSchoolNote.aiAnalysis && !selectedSchoolNote.aiPractice && !isAnalyzingNote && (
                   <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-sm text-center">
                      <Bot size={32} className="mb-2 opacity-20" />
                      <p>Click a button above to get AI assistance for this homework.</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHomeworkView = () => (
    <div className="space-y-8 animate-fade-in">
       <div className="flex items-center justify-between">
          <div>
             <h2 className="text-xl font-bold text-gray-900">{t.schoolSync}</h2>
             <p className="text-gray-500 text-sm mt-1">{t.schoolSyncSubtitle}</p>
          </div>
          <button 
             onClick={() => setIsCreatingNote(true)}
             className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm font-medium text-sm"
          >
             <Plus size={16} /> {t.addNote}
          </button>
       </div>

       {/* Creation Form */}
       {isCreatingNote && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg animate-fade-in-down">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-gray-900">{t.addNote}</h3>
                <button onClick={() => setIsCreatingNote(false)} className="text-gray-400 hover:text-gray-600">
                   <X size={20} />
                </button>
             </div>
             
             <div className="space-y-6">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">{t.subject}</label>
                   <div className="flex gap-2 flex-wrap">
                      {['math', 'chinese', 'english', 'science', 'other'].map((subj) => (
                         <button
                            key={subj}
                            onClick={() => setNewNoteSubject(subj as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${newNoteSubject === subj ? 'bg-black text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                         >
                            {t[subj as keyof typeof t] || subj}
                         </button>
                      ))}
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">{t.content}</label>
                   <textarea 
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:outline-none min-h-[120px] resize-none"
                      placeholder="Paste teacher's message or type homework details..."
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">{t.uploadImages}</label>
                   <div className="flex items-center gap-4">
                      <button 
                         onClick={() => fileInputRef.current?.click()}
                         className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black transition-colors"
                      >
                         <ImageIcon size={24} className="mb-1" />
                         <span className="text-xs font-bold uppercase">Upload</span>
                      </button>
                      <input 
                         type="file" 
                         ref={fileInputRef} 
                         className="hidden" 
                         accept="image/*" 
                         multiple 
                         onChange={handleImageUpload} 
                      />
                      
                      {newNoteImages.map((img, idx) => (
                         <div key={idx} className="relative w-24 h-24 group">
                            <img src={`data:image/png;base64,${img}`} className="w-full h-full object-cover rounded-xl border border-gray-200" />
                            <button 
                               onClick={() => setNewNoteImages(prev => prev.filter((_, i) => i !== idx))}
                               className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                            >
                               <X size={14} />
                            </button>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                   <button 
                      onClick={saveSchoolNote}
                      disabled={!newNoteContent && newNoteImages.length === 0}
                      className="px-6 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      {t.save}
                   </button>
                </div>
             </div>
          </div>
       )}

       {/* Notes Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studyState.schoolNotes.length === 0 && !isCreatingNote ? (
             <div className="col-span-full py-16 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <Backpack size={48} className="mx-auto mb-4 opacity-20" />
                <p>{t.noNotesLogged}</p>
             </div>
          ) : (
             studyState.schoolNotes.map(note => (
                <div 
                   key={note.id}
                   onClick={() => setSelectedSchoolNote(note)}
                   className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer flex flex-col h-[280px]"
                >
                   <div className="flex justify-between items-start mb-4">
                      <div className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                         ${note.subject === 'math' ? 'bg-blue-100 text-blue-700' : 
                           note.subject === 'chinese' ? 'bg-red-100 text-red-700' :
                           note.subject === 'english' ? 'bg-purple-100 text-purple-700' :
                           'bg-gray-100 text-gray-700'}
                      `}>
                         {t[note.subject] || note.subject}
                      </div>
                      <span className="text-gray-400 text-xs font-medium">{new Date(note.timestamp).toLocaleDateString()}</span>
                   </div>
                   
                   <p className="text-gray-800 text-sm leading-relaxed line-clamp-4 mb-4 flex-1">
                      {note.content}
                   </p>
                   
                   {note.images.length > 0 && (
                      <div className="flex gap-2 overflow-hidden mb-4 h-16">
                         {note.images.slice(0, 3).map((img, idx) => (
                            <img key={idx} src={`data:image/png;base64,${img}`} className="h-full w-auto rounded-lg border border-gray-100" />
                         ))}
                         {note.images.length > 3 && (
                            <div className="h-full w-16 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 text-xs font-bold">
                               +{note.images.length - 3}
                            </div>
                         )}
                      </div>
                   )}
                   
                   <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                      <div className="flex gap-2">
                         {note.aiAnalysis && <div className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold border border-blue-100 flex items-center gap-1"><Sparkles size={10} /> Analysis</div>}
                         {note.aiPractice && <div className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded font-bold border border-green-100 flex items-center gap-1"><CheckCircle2 size={10} /> Practice</div>}
                      </div>
                      <button 
                         onClick={(e) => { e.stopPropagation(); deleteSchoolNote(note.id); }}
                         className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                         <Trash2 size={16} />
                      </button>
                   </div>
                </div>
             ))
          )}
       </div>
    </div>
  );

  const renderCalendarGrid = () => {
    const { daysInMonth, firstDay, year, month } = getDaysInMonth(calendarDate);
    const monthName = calendarDate.toLocaleString(language === 'zh' ? 'zh-CN' : 'default', { month: 'long' });
    const days = [];

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-slate-50/50 border-b border-r border-slate-100" />);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const currentDayStart = new Date(year, month, d).setHours(0,0,0,0);
      const currentDayEnd = new Date(year, month, d).setHours(23,59,59,999);
      
      const dayActivities = studyState.activityLog.filter(a => a.timestamp >= currentDayStart && a.timestamp <= currentDayEnd);
      const dayNotes = studyState.schoolNotes.filter(n => n.timestamp >= currentDayStart && n.timestamp <= currentDayEnd);
      
      days.push(
        <div key={d} className="h-32 border-b border-r border-slate-100 p-2 relative group hover:bg-slate-50 transition-colors bg-white">
          <span className={`text-sm font-medium ${
            new Date().toDateString() === new Date(year, month, d).toDateString() 
              ? 'bg-black text-white w-6 h-6 rounded-full flex items-center justify-center' 
              : 'text-slate-500'
          }`}>{d}</span>
          
          <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
            {/* Render Notes first */}
            {dayNotes.map(note => (
               <button
                 key={note.id}
                 onClick={() => setSelectedSchoolNote(note)}
                 className="w-full text-left text-[10px] truncate px-1.5 py-1 rounded border transition-all hover:opacity-80 flex items-center gap-1 bg-green-50 border-green-100 text-green-700"
               >
                 <Backpack size={8} /> {t[note.subject] || note.subject} Note
               </button>
            ))}

            {/* Render Activities */}
            {dayActivities.map(activity => (
              <button 
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className={`w-full text-left text-[10px] truncate px-1.5 py-1 rounded border transition-all hover:opacity-80 flex items-center gap-1 ${
                  activity.type === 'quiz' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                  activity.type === 'visual' ? 'bg-orange-50 border-orange-100 text-orange-700' :
                  'bg-blue-50 border-blue-100 text-blue-700'
                }`}
              >
                {activity.type === 'quiz' && activity.score === 100 && <Star size={8} fill="currentColor" />}
                <span className="truncate">{activity.topicTitle}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Achievements Section */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="text-yellow-500" size={20} /> Achievements
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {studyState.badges.map(badge => (
                    <div key={badge.id} className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${badge.unlocked ? 'bg-yellow-50/50 border-yellow-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60 grayscale'}`}>
                        <div className="text-3xl mb-2">{badge.icon}</div>
                        <div className="font-bold text-sm text-gray-800">{badge.name[language === 'zh' ? 'zh' : 'en']}</div>
                        <div className="text-[10px] text-gray-500 mt-1">{badge.description[language === 'zh' ? 'zh' : 'en']}</div>
                        {!badge.unlocked && <div className="mt-2 text-[10px] bg-gray-200 px-2 py-0.5 rounded text-gray-600 font-medium">Locked</div>}
                    </div>
                ))}
            </div>
        </div>

        {/* Calendar Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
             <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
               <CalendarIcon size={18} /> {monthName} {year}
             </h2>
             <div className="flex gap-2">
               <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                 <ChevronLeft size={20} />
               </button>
               <button onClick={() => setCalendarDate(new Date())} className="text-sm px-3 py-1 bg-slate-100 rounded-md font-medium text-slate-600 hover:bg-slate-200">{t.today}</button>
               <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                 <ChevronRight size={20} />
               </button>
             </div>
          </div>
          <div className="grid grid-cols-7 text-center border-b border-slate-200 bg-slate-50">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 text-xs font-semibold text-slate-400 uppercase">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-white">
            {days}
          </div>
        </div>
      </div>
    );
  };

  const renderMapGrid = () => (
    <div className="space-y-8 animate-fade-in">
       {/* Course Selector / Header */}
       <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10 py-2">
          <div className="relative">
             <button 
                onClick={() => setIsCourseMenuOpen(!isCourseMenuOpen)}
                className="flex items-center gap-2 text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
             >
                {activeCourse.name} 
                <ChevronDown size={24} className={`transition-transform ${isCourseMenuOpen ? 'rotate-180' : ''}`} />
             </button>
             
             {isCourseMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsCourseMenuOpen(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 animate-fade-in">
                     <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">{t.switchCourse}</div>
                     {studyState.courses.map(course => (
                        <button
                           key={course.id}
                           onClick={() => {
                              setStudyState(prev => ({ ...prev, activeCourseId: course.id }));
                              setIsCourseMenuOpen(false);
                           }}
                           className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between text-sm ${course.id === activeCourse.id ? 'font-bold text-black bg-gray-50' : 'text-gray-600'}`}
                        >
                           {course.name}
                           {course.id === activeCourse.id && <CheckCircle2 size={16} className="text-black" />}
                        </button>
                     ))}
                     <div className="border-t border-gray-100 mt-2 pt-2">
                        <button
                           onClick={() => { setIsCreatingCourse(true); setIsCourseMenuOpen(false); }}
                           className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-sm text-blue-600 font-medium"
                        >
                           <Plus size={16} /> {t.createCourse}
                        </button>
                     </div>
                  </div>
                </>
             )}
          </div>
          
          <div className="flex gap-4">
             {/* Creating Course Modal/Overlay */}
             {isCreatingCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                   <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in-down">
                      <h3 className="text-xl font-bold mb-1">{t.createCourse}</h3>
                      <p className="text-gray-500 text-sm mb-6">{t.createCourseDesc}</p>
                      
                      <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">{t.subject}</label>
                            <input 
                               type="text" 
                               value={newCourseSubject}
                               onChange={e => setNewCourseSubject(e.target.value)}
                               className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                               placeholder={t.enterSubject}
                            />
                         </div>
                         <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">{t.gradeLevel}</label>
                            <input 
                               type="text" 
                               value={newCourseGrade}
                               onChange={e => setNewCourseGrade(e.target.value)}
                               className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
                               placeholder={t.enterGrade}
                            />
                         </div>
                         
                         <div className="flex justify-end gap-2 pt-4">
                            <button 
                               onClick={() => setIsCreatingCourse(false)}
                               className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                               {t.cancel}
                            </button>
                            <button 
                               onClick={handleCreateCourse}
                               disabled={!newCourseSubject || !newCourseGrade || isGeneratingCourse}
                               className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                            >
                               {isGeneratingCourse && <Loader2 size={16} className="animate-spin" />}
                               {isGeneratingCourse ? t.generatingMap : t.generateMap}
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
             )}
          </div>
       </div>

       {/* Map Render */}
       {activeCourse.stages.map((stage) => {
          const topicStatuses = stage.topics.map(t => getTopicStatus(t.id));
          const completedCount = topicStatuses.filter(s => s.status === 'mastered').length;
          const progress = Math.round((completedCount / stage.topics.length) * 100);

          return (
            <div key={stage.id} className="space-y-6">
               <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800">{stage.title[language === 'zh' ? 'zh' : 'en'] || stage.title['en']}</h2>
                  </div>
                  <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-gray-500">{completedCount}/{stage.topics.length}</span>
                  </div>
               </div>
               <p className="text-gray-500 text-sm">{stage.description[language === 'zh' ? 'zh' : 'en'] || stage.description['en']}</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {stage.topics.map((topic) => {
                     const { status, isReviewDue } = getTopicStatus(topic.id);
                     const isMastered = status === 'mastered';
                     const isInProgress = status === 'in-progress';
                     
                     return (
                       <button
                          key={topic.id}
                          onClick={() => startTopic(topic)}
                          className={`group relative p-6 bg-white rounded-2xl border transition-all text-left flex flex-col h-full
                            ${isReviewDue ? 'border-amber-200 ring-2 ring-amber-100' : isMastered ? 'border-green-200 bg-green-50/10' : isInProgress ? 'border-blue-200 bg-blue-50/10' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100'}
                          `}
                       >
                          <div className="mb-4 flex justify-between items-start">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                                ${isReviewDue ? 'bg-amber-100 text-amber-600' : isMastered ? 'bg-green-100 text-green-600' : isInProgress ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600'}
                             `}>
                                {isReviewDue ? <Timer size={20} className="animate-pulse" /> : isMastered ? <Star size={20} fill="currentColor" /> : <BookOpen size={20} />}
                             </div>
                             {isReviewDue && <div className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md animate-pulse">Review Due</div>}
                             {!isReviewDue && isMastered && <div className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-md">{t.mastered}</div>}
                             {!isReviewDue && isInProgress && <div className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-md">{t.continueLearning}</div>}
                          </div>
                          <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                             {topic.title[language === 'zh' ? 'zh' : 'en'] || topic.title['en']}
                          </h3>
                          <p className="text-sm text-gray-500 leading-relaxed flex-1">
                             {topic.description[language === 'zh' ? 'zh' : 'en'] || topic.description['en']}
                          </p>
                          
                          <div className={`mt-4 flex items-center text-xs font-bold uppercase tracking-wider transition-colors
                             ${isReviewDue ? 'text-amber-600' : isMastered ? 'text-green-600' : isInProgress ? 'text-blue-600' : 'text-gray-300 group-hover:text-blue-500'}
                          `}>
                             {isReviewDue ? 'Review Now' : isMastered ? 'Review' : isInProgress ? 'Continue' : 'Start'} <ChevronRight size={12} className="ml-1" />
                          </div>
                       </button>
                     );
                  })}
               </div>
            </div>
          );
       })}
    </div>
  );

  return (
    <div className="flex h-full w-full bg-white relative">
       <Confetti refConfetti={(instance: any) => (canvasRef.current = instance)} className="absolute top-0 left-0 w-full h-full pointer-events-none z-50" />
       
       <div className="flex-1 overflow-y-auto custom-scrollbar">
          {viewMode === 'session' ? (
             renderSession()
          ) : (
             <div className="max-w-6xl mx-auto py-8 px-6 space-y-8 animate-fade-in">
                {/* Header & Stats */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                   <div className="space-y-2 text-center md:text-left">
                      <div className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                         <GraduationCap size={16} className="text-blue-600"/>
                         <span className="text-gray-700">{t.studyTitle}</span>
                      </div>
                      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t.studySubtitle}</h1>
                   </div>
                   <div className="flex gap-4">
                       {/* Spaced Repetition Stats */}
                       <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-center min-w-[100px] flex flex-col justify-center">
                          <div className="text-2xl font-bold text-gray-900 mb-1 flex justify-center items-center gap-1">
                             {Object.values(studyState.reviewData || {}).filter((d: TopicReviewData) => Date.now() >= d.nextReview).length}
                          </div>
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1">
                             <Brain size={12} /> Reviews Due
                          </div>
                       </div>

                       <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-center min-w-[100px]">
                          <div className="text-2xl font-bold text-gray-900 mb-1">{studyState.xp}</div>
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.xp}</div>
                       </div>
                       <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-center min-w-[100px]">
                          <div className="text-2xl font-bold text-gray-900 mb-1">{studyState.level}</div>
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.level}</div>
                       </div>
                   </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 overflow-x-auto">
                   <button 
                      onClick={() => setViewMode('map')} 
                      className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${viewMode === 'map' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                   >
                      <LayoutGrid size={16} /> {t.map}
                   </button>
                   <button 
                      onClick={() => setViewMode('homework')} 
                      className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${viewMode === 'homework' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                   >
                      <Backpack size={16} /> {t.schoolSync}
                   </button>
                   <button 
                      onClick={() => setViewMode('calendar')} 
                      className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${viewMode === 'calendar' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                   >
                      <History size={16} /> {t.activityLog}
                   </button>
                </div>

                {/* Content */}
                {viewMode === 'map' ? renderMapGrid() 
                 : viewMode === 'homework' ? renderHomeworkView() 
                 : renderCalendarGrid()
                }
             </div>
          )}
       </div>

       {/* Detail Modals */}
       {selectedActivity && renderActivityDetailModal()}
       {selectedSchoolNote && renderSchoolNoteDetailModal()}
    </div>
  );
};

export default StudyView;
