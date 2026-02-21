
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Paperclip, 
  Bot, 
  User as UserIcon, 
  Plus, 
  Download,
  FileText,
  FileCode,
  MessageSquare,
  Sparkles,
  Trash2,
  ChevronDown,
  Zap,
  Globe,
  Menu,
  PanelLeftClose,
  Layout,
  Bookmark,
  AtSign,
  Search,
  Grid,
  Library,
  MoreHorizontal,
  Settings,
  X,
  Sun,
  Key,
  UserCircle,
  Brain,
  BookOpen,
  Palette,
  Book,
  FlaskConical,
  Box,
  GraduationCap,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Radar
} from 'lucide-react';
import { Message, Role, Attachment, ChatSession, Note, AppView, Language, ApiKeys, UserProfile } from './types';
import { streamChatResponse, generateImage } from './services/geminiService';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, AVAILABLE_MODELS, THIRD_PARTY_MODELS, DEFAULT_MODEL, TRANSLATIONS, RANDOM_NAMES } from './constants';
import MarkdownRenderer from './components/MarkdownRenderer';
import FilePreview from './components/FilePreview';
import LoadingBubble from './components/LoadingBubble';
import ImageModal from './components/ImageModal';
import SearchSources from './components/SearchSources';
import NotesView from './components/NotesView';
import StudyView from './components/StudyView';
import AcademicView from './components/AcademicView';
import PlanWidget from './components/PlanWidget';
import Toast from './components/Toast';
import LandingPage from './components/LandingPage';

// Helper for ID generation
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// Parsing helper to separate <plan> from content
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
  
  cleanText = cleanText.trim();

  // Handle streaming partial tags
  if (rawText.trim().startsWith('<thought>') && !thoughtMatch) {
     thoughtContent = rawText.replace('<thought>', '').trim();
     return { plan: null, thought: thoughtContent, text: '', isThinking: true };
  }
  
  if (rawText.trim().startsWith('<plan>') && !planMatch) {
     planContent = rawText.replace('<plan>', '').trim();
     return { plan: planContent, thought: thoughtContent, text: '', isPlanning: true };
  }

  return { plan: planContent, thought: thoughtContent, text: cleanText, isPlanning: false, isThinking: false };
};

const App: React.FC = () => {
  // Session Management
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({});
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Model & Search Selection
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [useSearch, setUseSearch] = useState(false);

  // User & Settings
  const [userName, setUserName] = useState<string>('User');
  const [language, setLanguage] = useState<Language>('zh');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'general' | 'personalization'>('general');
  
  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});

  // Personalization Profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    nickname: '',
    profession: '',
    about: '',
    customInstructions: ''
  });
  // Temp state for editing profile
  const [tempProfile, setTempProfile] = useState<UserProfile>(userProfile);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<AppView>('chat');
  const [isLabMenuOpen, setIsLabMenuOpen] = useState(true); // Default open for visibility
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [exportMenuOpenId, setExportMenuOpenId] = useState<string | null>(null);
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const notePickerRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language];

  // Initialize Data
  useEffect(() => {
    const savedLang = localStorage.getItem('app_language') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'zh')) setLanguage(savedLang);

    const savedName = localStorage.getItem('app_username');
    if (savedName) setUserName(savedName);
    else {
      const randomName = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
      setUserName(randomName);
      localStorage.setItem('app_username', randomName);
    }
    
    // Load API Keys
    const savedKeys = localStorage.getItem('app_api_keys');
    if (savedKeys) {
      try { setApiKeys(JSON.parse(savedKeys)); } catch(e) {}
    }

    // Load User Profile
    const savedProfile = localStorage.getItem('gemini_user_profile');
    if (savedProfile) {
      try { 
        const parsed = JSON.parse(savedProfile);
        setUserProfile(parsed);
        setTempProfile(parsed);
      } catch(e) {}
    }

    const savedSessions = localStorage.getItem('gemini_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        const sortedIds = Object.keys(parsed).sort((a, b) => parsed[b].updatedAt - parsed[a].updatedAt);
        if (sortedIds.length > 0) loadSession(sortedIds[0], parsed);
        else createNewSession();
      } catch (e) { createNewSession(); }
    } else { createNewSession(); }

    const savedNotes = localStorage.getItem('gemini_notes');
    if (savedNotes) {
      try { setNotes(JSON.parse(savedNotes)); } catch(e) {}
    }
  }, []);

  // Compute available models based on configured keys
  const visibleModels = useMemo(() => {
    // 1. Google models (always available via env key)
    const models = [...AVAILABLE_MODELS];
    
    // 2. Add third party models if key exists
    THIRD_PARTY_MODELS.forEach(m => {
       const providerKey = apiKeys[m.provider as keyof ApiKeys];
       if (providerKey && providerKey.trim().length > 0) {
          models.push(m as any);
       }
    });
    
    return models;
  }, [apiKeys]);

  useEffect(() => {
    const handleClickOutside = () => setExportMenuOpenId(null);
    if (exportMenuOpenId) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [exportMenuOpenId]);

  useEffect(() => {
    if (Object.keys(sessions).length > 0) localStorage.setItem('gemini_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('gemini_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('gemini_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    if (currentSessionId && sessions[currentSessionId]) {
      setSessions(prev => ({
        ...prev,
        [currentSessionId]: {
          ...prev[currentSessionId],
          messages: messages,
          updatedAt: Date.now(),
          title: prev[currentSessionId].messages.length === 0 && messages.length > 0 
            ? (messages[0].text.substring(0, 30) || t.newTask) 
            : prev[currentSessionId].title
        }
      }));
    }
  }, [messages, currentSessionId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notePickerRef.current && !notePickerRef.current.contains(event.target as Node)) {
        setShowNotePicker(false);
      }
    };
    if (showNotePicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotePicker]);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('app_language', lang);
  };
  
  const updateApiKey = (provider: keyof ApiKeys, value: string) => {
    const newKeys = { ...apiKeys, [provider]: value };
    setApiKeys(newKeys);
    localStorage.setItem('app_api_keys', JSON.stringify(newKeys));
  };

  const handleSaveProfile = () => {
    setUserProfile(tempProfile);
    setIsSettingsOpen(false);
    showToast(t.saveChanges);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const loadSession = (id: string, allSessions = sessions) => {
    const session = allSessions[id];
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setAttachments([]);
      setInput('');
      setCurrentView('chat');
    }
  };

  const createNewSession = () => {
    const newId = generateId();
    const newSession: ChatSession = {
      id: newId,
      title: t.newTask,
      messages: [],
      updatedAt: Date.now()
    };
    setSessions(prev => ({ ...prev, [newId]: newSession }));
    setCurrentSessionId(newId);
    setMessages([]);
    setAttachments([]);
    setInput('');
    setCurrentView('chat');
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t.deleteChat)) {
      const newSessions = { ...sessions };
      delete newSessions[id];
      setSessions(newSessions);
      if (currentSessionId === id) createNewSession();
      localStorage.setItem('gemini_sessions', JSON.stringify(newSessions));
    }
  }

  // --- Actions ---
  const handleSaveToNotes = (text: string) => {
    if (notes.some(n => n.content === text)) { showToast(t.noteExists, "error"); return; }
    const title = text.split('\n')[0].substring(0, 40).replace(/[#*]/g, '').trim() || "Untitled Note";
    const newNote: Note = {
      id: generateId(),
      title: title,
      content: text,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      theme: ['blue', 'yellow', 'green', 'purple', 'default'][Math.floor(Math.random() * 5)] as any,
      tags: ['Saved Chat']
    };
    setNotes(prev => [newNote, ...prev]);
    showToast(t.noteSaved);
  };

  const handleCreateNote = (title: string, content: string) => {
    const newNote: Note = {
      id: generateId(),
      title: title || "Untitled Note",
      content: content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      theme: ['blue', 'yellow', 'green', 'purple', 'default'][Math.floor(Math.random() * 5)] as any,
      tags: ['New Note']
    };
    setNotes(prev => [newNote, ...prev]);
    showToast(t.noteSaved);
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    showToast(t.noteUpdated);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    showToast(t.noteDeleted);
  };

  const insertMention = (note: Note) => {
    setInput(prev => prev + `@${note.title} `);
    setShowNotePicker(false);
    textareaRef.current?.focus();
  };

  useEffect(() => {
    if (currentView === 'chat') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentView]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: Attachment[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.size > MAX_FILE_SIZE) { alert(`File ${file.name} exceeds 10MB.`); continue; }
        if (!ALLOWED_MIME_TYPES.includes(file.type)) { alert(`Unsupported file type: ${file.type}`); continue; }

        try {
          if (file.type.includes('wordprocessingml')) {
             const arrayBuffer = await file.arrayBuffer();
             // @ts-ignore
             if (window.mammoth) {
               // @ts-ignore
               const result = await window.mammoth.extractRawText({ arrayBuffer });
               newAttachments.push({ name: file.name, mimeType: 'text/plain', data: result.value, size: file.size, originalFileType: 'docx' });
             } else { alert("Parser not ready."); }
          } else if (file.type.startsWith('text')) {
             const text = await file.text();
             newAttachments.push({ name: file.name, mimeType: 'text/plain', data: text, size: file.size, originalFileType: 'txt' });
          } else {
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            newAttachments.push({ name: file.name, mimeType: file.type, data: base64, size: file.size, originalFileType: file.type.includes('pdf') ? 'pdf' : 'image' });
          }
        } catch (err) { console.error(err); alert(`Failed to parse ${file.name}`); }
      }
      setAttachments(prev => [...prev, ...newAttachments]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportWord = (content: string) => {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + `<div style="font-family: Calibri, sans-serif;">${content.replace(/\n/g, '<br>')}</div>` + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = 'gemini-export.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const handleExportMarkdown = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gemini-export-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (overrideInput?: string) => {
    let textToSend = overrideInput || input;
    if ((!textToSend.trim() && attachments.length === 0) || isLoading) return;

    let contextAddition = "";
    notes.forEach(note => {
      if (textToSend.includes(`@${note.title}`)) {
         contextAddition += `\n\n[CONTEXT FROM NOTE "${note.title}":\n${note.content}\n]`;
      }
    });
    
    let finalPrompt = textToSend + contextAddition;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: textToSend,
      attachments: [...attachments],
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setShowNotePicker(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);

    if (useSearch) setLoadingStatus("Searching the web...");
    else if (attachments.length > 0) setLoadingStatus("Reading files...");
    else setLoadingStatus("Thinking...");

    try {
      const aiMessageId = (Date.now() + 1).toString();
      const trimmedText = userMessage.text.trim();
      
      // Extended detection logic for image generation requests
      // 1. Explicit English: "Draw an image of...", "Generate a picture..."
      const engImageRegex = /^(please\s+)?(draw|generate|create|make)\s+(an?|the)?\s*(image|picture|photo|painting|illustration|drawing|sketch|art)/i;
      
      // 2. Direct "Draw..." command (e.g., "Draw a cat", "Draw future library")
      // Excludes abstract phrases like "Draw a conclusion"
      const drawCommandRegex = /^(please\s+)?(draw)\s+(?!up\b|a conclusion|an inference).+/i;

      // 3. Explicit Chinese: Starts with "画", "生成" etc. and contains "图", "照片" etc.
      const cnImageRegex = /^(画|生成|创作|制作|绘制).*(图|照片|海报|插画|像)/;
      
      // 4. Mixed: "Draw" followed by Chinese characters (e.g., "Draw 一幅...")
      const mixedRegex = /^(draw)\s+[\u4e00-\u9fa5]+/i;

      const isImageGenRequest = engImageRegex.test(trimmedText) || 
                                drawCommandRegex.test(trimmedText) || 
                                cnImageRegex.test(trimmedText) || 
                                mixedRegex.test(trimmedText);

      setMessages(prev => [...prev, { id: aiMessageId, role: Role.MODEL, text: '', timestamp: Date.now(), isStreaming: true }]);

      // If recognized as an image request, force usage of the image generation path regardless of selected model
      if (isImageGenRequest) {
        setLoadingStatus("Generating image...");
        const imageMarkdown = await generateImage(userMessage.text);
        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: imageMarkdown, isStreaming: false } : msg));
      } else {
        const historyForApi = [...messages, { ...userMessage, text: finalPrompt }];
        
        await streamChatResponse(
          historyForApi, 
          (chunkText) => {
             setLoadingStatus("Generating response...");
             const { plan, thought, text, isThinking, isPlanning } = parseMessageWithPlan(chunkText);
             
             if (isThinking) setLoadingStatus("Thinking deeply...");
             else if (isPlanning) setLoadingStatus("Planning execution...");

             setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { 
               ...msg, 
               text: text, 
               plan: plan || msg.plan,
               thought: thought || msg.thought 
             } : msg));
          },
          (metadata) => {
            setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, groundingMetadata: metadata } : msg));
          },
          selectedModel,
          useSearch,
          apiKeys,
          userProfile // Pass profile for personalization
        );

        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg));
      }

    } catch (error: any) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: Role.MODEL, 
        text: "", 
        errorMessage: error.message || t.errorProcessing,
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderNotePickerList = (isUpwards: boolean) => (
    <div className={`absolute ${isUpwards ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 z-50 w-64 bg-white rounded-lg shadow-xl border border-gray-100 max-h-60 overflow-y-auto animate-fade-in ring-1 ring-black/5`}>
      <div className="px-3 py-2 text-[10px] font-bold text-gray-400 bg-gray-50 border-b border-gray-100 flex justify-between items-center tracking-wider">
        <span>{t.selectNote}</span>
      </div>
      {notes.length === 0 ? (
        <div className="p-4 text-center text-xs text-gray-400">{t.noNotes}</div>
      ) : (
        notes.map(note => (
          <button
            key={note.id}
            onClick={() => insertMention(note)}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 truncate transition-colors border-b border-gray-50 last:border-0"
          >
            {note.title}
          </button>
        ))
      )}
    </div>
  );

  const renderModelSelector = (upwards = true, className = "") => (
    <div className={`relative ${className}`}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsModelMenuOpen(!isModelMenuOpen); }}
        className={`p-2 rounded-lg transition-colors flex items-center justify-center gap-1.5
          ${selectedModel.includes('pro') ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:bg-gray-100'}
        `}
        title={`Model: ${visibleModels.find(m => m.value === selectedModel)?.label}`}
      >
        <Zap size={16} className={selectedModel.includes('pro') ? "fill-gray-800" : ""} />
      </button>

      {isModelMenuOpen && (
        <div className={`absolute ${upwards ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 animate-fade-in z-50 ring-1 ring-black/5`}>
          <div className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {t.model}
          </div>
          {visibleModels.map((model) => (
            <button
              key={model.value}
              onClick={() => { setSelectedModel(model.value); setIsModelMenuOpen(false); }}
              className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors
                ${selectedModel === model.value ? 'bg-gray-50' : ''}`}
            >
              <div className={` ${selectedModel === model.value ? 'text-black' : 'text-gray-300'}`}>
                {selectedModel === model.value ? <div className="w-1.5 h-1.5 rounded-full bg-black" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />}
              </div>
              <div>
                <div className={`text-sm font-medium ${selectedModel === model.value ? 'text-gray-900' : 'text-gray-600'}`}>
                  {model.label}
                </div>
              </div>
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1 space-y-1">
             <button
              onClick={() => { setIsDocsOpen(true); setIsModelMenuOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors text-xs text-gray-500"
            >
              <BookOpen size={12} /> {t.docs}
            </button>
             <button
              onClick={() => { setIsSettingsOpen(true); setSettingsTab('general'); setIsModelMenuOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 transition-colors text-xs text-gray-500"
            >
              <Settings size={12} /> {t.settings}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-white text-gray-900 font-sans tracking-tight" onClick={() => setIsModelMenuOpen(false)}>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ImageModal isOpen={!!modalImage} src={modalImage || ''} onClose={() => setModalImage(null)} />
      <LandingPage isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} language={language} />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in" onClick={() => setIsSettingsOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => setSettingsTab('general')}
                   className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${settingsTab === 'general' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                 >
                   {t.general}
                 </button>
                 <button 
                   onClick={() => { setSettingsTab('personalization'); setTempProfile(userProfile); }}
                   className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${settingsTab === 'personalization' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}
                 >
                   {t.personalization}
                 </button>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
              {settingsTab === 'general' ? (
                <div className="p-6 space-y-8">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                      <Globe size={16} /> {t.language}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <button 
                        onClick={() => changeLanguage('zh')}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-medium transition-all ${language === 'zh' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                      >
                        <span className="text-lg">🇨🇳</span> 中文
                      </button>
                      <button 
                        onClick={() => changeLanguage('en')}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-medium transition-all ${language === 'en' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                      >
                        <span className="text-lg">🇺🇸</span> English
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <h4 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                        <Key size={16} /> {t.apiKeys}
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">{t.apiKeysDesc}</p>
                    
                    <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">DeepSeek API Key</label>
                          <input 
                            type="password" 
                            value={apiKeys.deepseek || ''}
                            onChange={(e) => updateApiKey('deepseek', e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-400 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Kimi (Moonshot) API Key</label>
                          <input 
                            type="password" 
                            value={apiKeys.kimi || ''}
                            onChange={(e) => updateApiKey('kimi', e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-400 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Qwen (DashScope) API Key</label>
                          <input 
                            type="password" 
                            value={apiKeys.qwen || ''}
                            onChange={(e) => updateApiKey('qwen', e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-black/5 focus:border-gray-400 outline-none transition-all"
                          />
                        </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
                     <h2 className="text-xl font-bold text-gray-900 mb-1">{t.personalization}</h2>
                     <p className="text-sm text-gray-500">{t.personalizationDesc}</p>
                  </div>
                  
                  <div className="p-8 space-y-8 flex-1">
                     <div className="flex border-b border-gray-200 mb-6">
                        <button className="px-1 py-2 text-sm font-medium text-gray-900 border-b-2 border-gray-900 mr-6">{t.personalInfo}</button>
                        <button className="px-1 py-2 text-sm font-medium text-gray-400 hover:text-gray-600 border-b-2 border-transparent mr-6 cursor-not-allowed" title="Coming Soon">{t.knowledge} <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-500 ml-1">?</span></button>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">{t.nickname}</label>
                          <input 
                            type="text" 
                            value={tempProfile.nickname}
                            onChange={(e) => setTempProfile(prev => ({ ...prev, nickname: e.target.value }))}
                            placeholder={t.nicknamePlaceholder}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-gray-400 outline-none transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">{t.profession}</label>
                          <input 
                            type="text" 
                            value={tempProfile.profession}
                            onChange={(e) => setTempProfile(prev => ({ ...prev, profession: e.target.value }))}
                            placeholder={t.professionPlaceholder}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-gray-400 outline-none transition-all text-sm"
                          />
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">{t.aboutYou}</label>
                        <textarea 
                          value={tempProfile.about}
                          onChange={(e) => setTempProfile(prev => ({ ...prev, about: e.target.value }))}
                          placeholder={t.aboutYouPlaceholder}
                          rows={4}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-gray-400 outline-none transition-all text-sm resize-none"
                        />
                        <div className="text-right text-xs text-gray-400 mt-1">{tempProfile.about.length} / 2000</div>
                     </div>

                     <div className="border-t border-gray-100 pt-6">
                        <label className="block text-sm font-semibold text-gray-800 mb-2">{t.customInstructions}</label>
                        <textarea 
                          value={tempProfile.customInstructions}
                          onChange={(e) => setTempProfile(prev => ({ ...prev, customInstructions: e.target.value }))}
                          placeholder={t.customInstructionsPlaceholder}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black/5 focus:border-gray-400 outline-none transition-all text-sm resize-none"
                        />
                     </div>
                  </div>

                  <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 sticky bottom-0">
                     <button 
                       onClick={() => { setIsSettingsOpen(false); setSettingsTab('general'); }}
                       className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                     >
                       {t.cancel}
                     </button>
                     <button 
                       onClick={handleSaveProfile}
                       className="px-6 py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-black transition-colors text-sm shadow-sm"
                     >
                       {t.save}
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-[260px]' : 'w-0'} bg-[#F9F9FB] border-r border-gray-100/80 z-20 transition-[width] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] overflow-hidden flex flex-col`}
      >
        <div className="p-4 min-w-[260px]">
          <div className="px-2 py-2 mb-4 flex items-center justify-between">
             <div className="flex items-center gap-2.5 text-gray-900">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-lg shadow-black/20">
                   <Sun size={18} className="text-white fill-white" />
                </div>
                <span className="text-xl font-semibold tracking-tight">Sidonie</span>
             </div>
             <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg">
                <PanelLeftClose size={20} />
             </button>
          </div>

          <button 
            onClick={createNewSession}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition-all shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] border border-gray-200 hover:border-gray-300 group mb-6"
          >
            <Plus size={18} className="text-gray-400 group-hover:text-gray-600" />
            <span className="font-medium text-sm">{t.newTask}</span>
          </button>
          
          <div className="space-y-0.5">
             <div className="px-2 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">
               {t.workspace}
             </div>
             <button 
               onClick={() => setCurrentView('chat')}
               className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentView === 'chat' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-200/50'}`}
             >
               <Bot size={18} strokeWidth={1.5} /> {t.agents}
             </button>
             <button 
               onClick={() => setCurrentView('notes')}
               className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentView === 'notes' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-200/50'}`}
             >
               <Library size={18} strokeWidth={1.5} /> {t.library}
             </button>

             {/* Painting Menu (Embedded) */}
             <button 
               onClick={() => setCurrentView('painting')}
               className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentView === 'painting' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-200/50'}`}
             >
               <Palette size={18} strokeWidth={1.5} /> {t.painting}
             </button>

             {/* Blog Menu */}
             <button 
               onClick={() => window.open('http://blog.fantasyailab.com/', '_blank')}
               className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-500 hover:bg-gray-200/50 hover:text-gray-900"
             >
               <Book size={18} strokeWidth={1.5} /> {t.blog}
             </button>

             {/* Lab Menu (Collapsible) */}
             <div>
               <button 
                 onClick={() => setIsLabMenuOpen(!isLabMenuOpen)}
                 className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isLabMenuOpen ? 'text-gray-900' : 'text-gray-500 hover:bg-gray-200/50'}`}
               >
                 <div className="flex items-center gap-2.5">
                    <FlaskConical size={18} strokeWidth={1.5} /> {t.lab}
                 </div>
                 {isLabMenuOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
               </button>
               
               {isLabMenuOpen && (
                 <div className="pl-4 space-y-0.5 mt-0.5 animate-fade-in-down">
                    <button 
                      onClick={() => window.open('http://lazybox.fantasyailab.com/', '_blank')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-500 hover:bg-gray-200/50 hover:text-gray-900"
                    >
                      <Box size={16} strokeWidth={1.5} /> {t.lazybox}
                    </button>
                    {/* Academic Module */}
                    <button 
                      onClick={() => setCurrentView('academic')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentView === 'academic' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-200/50'}`}
                    >
                      <Radar size={16} strokeWidth={1.5} /> {t.academicTitle}
                    </button>
                    {/* Study Module */}
                    <button 
                      onClick={() => setCurrentView('study')}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentView === 'study' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:bg-gray-200/50'}`}
                    >
                      <GraduationCap size={16} strokeWidth={1.5} /> {t.study}
                    </button>
                 </div>
               )}
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 min-w-[260px]">
           <div className="px-3 py-2 text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1 mt-4">
             {t.projects}
           </div>
           <div className="space-y-0.5">
              {Object.values(sessions)
                .sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt)
                .slice(0, 15)
                .map((session: ChatSession) => (
                <div 
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={`group flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors
                    ${currentSessionId === session.id && currentView === 'chat' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="truncate">{session.title}</span>
                  </div>
                  {currentSessionId !== session.id && (
                     <button onClick={(e) => deleteSession(e, session.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-0.5">
                       <Trash2 size={12} />
                     </button>
                  )}
                </div>
              ))}
           </div>
        </div>
        
        <div className="p-4 min-w-[260px] border-t border-gray-100">
           <div className="flex items-center justify-between">
             <div 
               className="flex items-center gap-3 cursor-pointer group"
               onClick={() => setIsSettingsOpen(true)}
             >
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 border border-white shadow-sm">
                 {userProfile.nickname ? userProfile.nickname.charAt(0).toUpperCase() : userName.charAt(0).toUpperCase()}
               </div>
               <div className="flex flex-col">
                 <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{userProfile.nickname || userName}</span>
               </div>
             </div>
             
             <div className="flex items-center">
                <button
                  onClick={() => setIsDocsOpen(true)}
                  className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t.docs}
                >
                  <BookOpen size={16} />
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title={t.settings}
                >
                  <Settings size={16} />
                </button>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative bg-white overflow-hidden w-full">
        {currentView === 'notes' ? (
           <NotesView 
             notes={notes}
             onUpdateNote={handleUpdateNote}
             onCreateNote={handleCreateNote}
             onDeleteNote={handleDeleteNote}
             language={language}
           />
        ) : currentView === 'study' ? (
           <StudyView 
             language={language}
             apiKeys={apiKeys}
             userProfile={userProfile}
           />
        ) : currentView === 'academic' ? (
           <AcademicView 
             language={language}
             apiKeys={apiKeys}
             userProfile={userProfile}
             onSaveNote={handleCreateNote}
           />
        ) : currentView === 'painting' ? (
            <div className="w-full h-full bg-white relative flex flex-col">
              <div className="flex flex-col">
                  {/* Warning for Mixed Content */}
                  <div className="bg-amber-50 text-amber-800 text-xs px-6 py-2 border-b border-amber-100 flex items-center justify-center gap-2">
                     <AlertTriangle size={14} className="text-amber-600" />
                     <span>
                       <strong>Security Note:</strong> This tool uses HTTP. If it doesn't load, your browser blocked it (Mixed Content). 
                     </span>
                     <a href="http://draw.fantasyailab.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold flex items-center gap-1 hover:text-amber-900">
                        Open in New Tab <ExternalLink size={10} />
                     </a>
                  </div>

                  <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-sm sticky top-0 z-20 border-b border-gray-100">
                      <div className="flex items-center">
                          {!isSidebarOpen && (
                            <button 
                              onClick={() => setIsSidebarOpen(true)}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors mr-3"
                            >
                              <Menu size={20} />
                            </button>
                          )}
                          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            {t.painting}
                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-normal border border-gray-200">HTTP Embed</span>
                          </h2>
                      </div>
                      <div className="flex items-center gap-2">
                         <button 
                           onClick={() => {
                             const iframe = document.getElementById('painting-iframe') as HTMLIFrameElement;
                             if(iframe) iframe.src = iframe.src;
                           }}
                           className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                           title="Refresh"
                         >
                           <RefreshCw size={16} />
                         </button>
                      </div>
                  </div>
              </div>
              
              <div className="flex-1 w-full relative bg-gray-100">
                  <iframe 
                    id="painting-iframe"
                    src="http://draw.fantasyailab.com/"
                    className="w-full h-full border-none block"
                    title="Painting Tool"
                    // Sandbox permissions to be permissive but explicit
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                  />
              </div>
            </div>
        ) : (
          <>
            <div className="flex items-center px-6 py-4 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
               {!isSidebarOpen && (
                 <button 
                   onClick={() => setIsSidebarOpen(true)}
                   className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors mr-3"
                 >
                   <Menu size={20} />
                 </button>
               )}
               <div className="flex-1"></div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 scroll-smooth">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto -mt-10">
                  <h1 className="text-3xl md:text-4xl font-medium text-gray-800 mb-10 text-center tracking-tight">
                    {t.whatCanIDo}
                  </h1>

                  <div className="w-full bg-white rounded-[24px] p-4 flex flex-col min-h-[140px] relative transition-all shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:border-gray-200">
                     <div className="flex-1 relative">
                       <textarea
                         ref={textareaRef}
                         value={input}
                         onChange={(e) => setInput(e.target.value)}
                         onKeyDown={handleKeyDown}
                         placeholder={t.placeholder}
                         className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-lg text-gray-700 placeholder-gray-300 resize-none h-full font-light"
                       />
                     </div>
                     
                     <FilePreview files={attachments} onRemove={(idx) => setAttachments(prev => prev.filter((_, i) => i !== idx))} />

                     <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1">
                           <input 
                              type="file" 
                              ref={fileInputRef}
                              className="hidden" 
                              onChange={handleFileSelect} 
                              accept=".jpg,.jpeg,.png,.pdf,.txt,.csv,.docx"
                              multiple
                            />
                           <button 
                             onClick={() => fileInputRef.current?.click()}
                             className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                             title={t.uploadFile}
                           >
                             <Plus size={20} strokeWidth={1.5} />
                           </button>

                           <div ref={notePickerRef} className="relative flex items-center">
                              <button
                                onClick={() => setShowNotePicker(!showNotePicker)}
                                className={`p-2 rounded-full transition-colors ${showNotePicker ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                                title={t.mentionNote}
                              >
                                <AtSign size={20} strokeWidth={1.5} />
                              </button>
                              {showNotePicker && renderNotePickerList(false)}
                           </div>

                           <button
                              onClick={() => setUseSearch(!useSearch)}
                              className={`p-2 rounded-full transition-colors ${useSearch ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                              title={t.googleSearch}
                           >
                              <Globe size={20} strokeWidth={1.5} />
                           </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {renderModelSelector(false)}
                          <button 
                            onClick={() => handleSubmit()}
                            disabled={!input.trim() && attachments.length === 0}
                            className={`p-2 rounded-full transition-all ${
                              input.trim() || attachments.length > 0 
                              ? 'bg-gray-900 text-white hover:bg-black' 
                              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            }`}
                          >
                            <Send size={18} className={input.trim() || attachments.length > 0 ? "text-white" : ""} strokeWidth={2} />
                          </button>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center w-full mt-8">
                     {[
                       { icon: <Layout size={14} />, text: t.createPresentation, val: "Create presentation" },
                       { icon: <Globe size={14} />, text: t.buildWebsite, val: "Build website" },
                       { icon: <Grid size={14} />, text: t.developApp, val: "Develop app" },
                       { icon: <Sparkles size={14} />, text: t.designLogo, val: "Design logo" },
                       { icon: <MoreHorizontal size={14} />, text: t.more, val: "More" }
                     ].map((sug, i) => (
                       <button 
                         key={i} 
                         onClick={() => sug.val !== "More" && handleSubmit(sug.val)}
                         className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm text-gray-600 rounded-full transition-all text-sm font-medium"
                       >
                          <span className="text-gray-400">{sug.icon}</span>
                          {sug.text}
                       </button>
                     ))}
                  </div>

                </div>
              ) : (
                <div className="max-w-[900px] mx-auto space-y-8 pb-32">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 animate-fade-in group`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1
                        ${msg.role === Role.USER ? 'invisible' : 'bg-white border border-gray-100 shadow-sm'}`}>
                        {msg.role === Role.MODEL && <Bot size={16} className="text-gray-700" strokeWidth={1.5} />}
                      </div>

                      <div className={`flex flex-col flex-1 min-w-0 ${msg.role === Role.USER ? 'items-end' : 'items-start'}`}>
                        
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={`flex flex-wrap gap-2 mb-2 ${msg.role === Role.USER ? 'justify-end' : ''}`}>
                            {msg.attachments.map((att, idx) => (
                              <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-100 text-xs shadow-sm">
                                 <FileText size={14} className="text-gray-400"/>
                                 <span className="truncate max-w-[150px] font-medium text-gray-700">{att.name}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className={`w-full ${msg.role === Role.USER 
                            ? 'bg-[#F4F4F5] px-4 py-2.5 rounded-2xl rounded-tr-sm text-gray-800 text-[15px] max-w-[85%]' 
                            : 'text-[15px] leading-relaxed text-gray-800'
                          }
                        `}>
                          {msg.role === Role.USER ? (
                            <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                          ) : (
                            <div className="min-h-[24px]">
                               {msg.isError ? (
                                 <div className="flex flex-col gap-1 p-3 bg-red-50 rounded-lg text-red-600 text-sm">
                                   <span className="font-semibold flex items-center gap-2"><Trash2 size={16}/> Error</span>
                                   <span>{msg.errorMessage || t.errorProcessing}</span>
                                 </div>
                               ) : (
                                 <>
                                   {(msg.plan) && (
                                     <PlanWidget 
                                       planContent={msg.plan} 
                                       currentContent={msg.text}
                                       isStreaming={msg.isStreaming} 
                                     />
                                   )}

                                   {msg.isStreaming && !msg.text && !msg.plan && (
                                     <LoadingBubble status={loadingStatus} />
                                   )}
                                   
                                   {msg.text && (
                                     <MarkdownRenderer 
                                       content={msg.text} 
                                       onImageClick={(src) => setModalImage(src)} 
                                       isStreaming={msg.isStreaming}
                                       language={language}
                                     />
                                   )}

                                   {msg.groundingMetadata && (
                                     <SearchSources metadata={msg.groundingMetadata} title={t.source} />
                                   )}

                                   {!msg.isStreaming && msg.text && !msg.text.includes("![Generated Image]") && (
                                     <div className="flex gap-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <div className="relative">
                                         <button 
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setExportMenuOpenId(exportMenuOpenId === msg.id ? null : msg.id);
                                           }}
                                           className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
                                         >
                                           <Download size={14} /> {t.export}
                                         </button>
                                         {exportMenuOpenId === msg.id && (
                                            <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-xl py-1 z-10 animate-fade-in ring-1 ring-black/5">
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation(); 
                                                    handleExportWord(msg.text); 
                                                    setExportMenuOpenId(null); 
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                  <FileText size={14} className="text-blue-600" /> {t.exportWord}
                                                </button>
                                                <button
                                                  onClick={(e) => { 
                                                    e.stopPropagation();
                                                    handleExportMarkdown(msg.text); 
                                                    setExportMenuOpenId(null); 
                                                  }}
                                                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                  <FileCode size={14} className="text-slate-600" /> {t.exportMarkdown}
                                                </button>
                                            </div>
                                         )}
                                       </div>

                                       <button 
                                         onClick={() => handleSaveToNotes(msg.text)}
                                         className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
                                       >
                                         <Bookmark size={14} /> {t.save}
                                       </button>
                                     </div>
                                   )}
                                 </>
                               )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {messages.length > 0 && (
              <div className="absolute bottom-6 left-0 right-0 px-4">
                <div className="max-w-[900px] mx-auto">
                   
                   <FilePreview files={attachments} onRemove={(idx) => setAttachments(prev => prev.filter((_, i) => i !== idx))} />

                   <div className="relative flex items-end gap-2 bg-white rounded-[26px] p-2 shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 ring-1 ring-gray-50">
                      
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        onChange={handleFileSelect} 
                        accept=".jpg,.jpeg,.png,.pdf,.txt,.csv,.docx"
                        multiple
                      />
                      
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2.5 mb-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                      >
                        <Plus size={20} strokeWidth={1.5} />
                      </button>

                      <div className="flex-1 relative py-2">
                        <textarea
                          ref={textareaRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder={t.placeholder}
                          className="w-full max-h-[150px] bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 resize-none px-2 custom-scrollbar text-[15px]"
                          rows={1}
                        />
                      </div>

                      <div className="flex items-center gap-1 mb-0.5">
                         <div ref={notePickerRef} className="relative">
                           <button
                             onClick={() => setShowNotePicker(!showNotePicker)}
                             className={`p-2 rounded-full transition-colors ${showNotePicker ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                           >
                             <AtSign size={18} strokeWidth={1.5} />
                           </button>
                           {showNotePicker && renderNotePickerList(true)}
                         </div>

                         <button
                           onClick={() => setUseSearch(!useSearch)}
                           className={`p-2 rounded-full transition-colors ${useSearch ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                           >
                           <Globe size={18} strokeWidth={1.5} />
                         </button>

                         {renderModelSelector(true, "")}

                         <div className="w-px h-5 bg-gray-200 mx-1"></div>

                         <button 
                           onClick={() => handleSubmit()}
                           disabled={isLoading || (!input.trim() && attachments.length === 0)}
                           className={`p-2 rounded-full transition-all duration-200 flex items-center justify-center
                             ${(input.trim() || attachments.length > 0) && !isLoading
                               ? 'bg-black text-white hover:bg-gray-800' 
                               : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                             }`}
                         >
                            {isLoading ? (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Send size={18} strokeWidth={2} />
                            )}
                         </button>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
