import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MoodType, Task, MoodLog, User } from '../types';
import { MOOD_THEMES, MOOD_FOCUS_BASE } from '../constants';
import ClimateWidget from './ClimateWidget';
import TaskBoard from './TaskBoard';
import MoodFlowChart from './MoodFlowChart'; 
import VibeCoach from './VibeCoach'; 
import CheckInForm from './CheckInForm';
import PomodoroWidget from './PomodoroWidget';
import HabitTracker from './HabitTracker';
import ScheduleWidget from './ScheduleWidget';
import QuickNotesWidget from './QuickNotesWidget';
import ShortcutsWidget from './ShortcutsWidget';
import TiltCard from './TiltCard'; 
import BackgroundBlobs from './BackgroundBlobs';
import { analyzeInput } from '../services/geminiService';
import { LogOut, Sparkles, Music, Play, Pause, Loader2, AlertCircle, RotateCcw, BellRing, X, Link, FileAudio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Firebase Imports
import { db } from '../firebaseConfig';
import { collection, query, onSnapshot, addDoc, orderBy, updateDoc, doc, deleteDoc, Timestamp, setDoc, QuerySnapshot, DocumentData, DocumentSnapshot } from 'firebase/firestore';

const MotionDiv = motion.div as any;
const MotionH3 = motion.h3 as any;
const MotionP = motion.p as any;

// --- INDEXED DB HELPER FOR MUSIC ---
const DB_NAME = 'VibeDeskDB';
const STORE_NAME = 'files';

const openDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
};

const saveFileToIDB = async (key: string, file: Blob) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(file, key);
  } catch (e) { console.error("IDB Save Error", e); }
};

const getFileFromIDB = async (key: string): Promise<Blob | undefined> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
  } catch (e) { return undefined; }
};

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  // Initialize mood from local storage for instant load, fallback to NEUTRAL
  const [currentMood, setCurrentMood] = useState<MoodType>(() => {
     if (typeof window !== 'undefined') {
         const saved = localStorage.getItem(`vibe_mood_${user.uid}`);
         return (saved as MoodType) || MoodType.NEUTRAL;
     }
     return MoodType.NEUTRAL;
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Real Data State
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  
  const [aiAdvice, setAiAdvice] = useState<string>("I'm here for you. How are you feeling right now?");
  const [journalSummary, setJournalSummary] = useState<string | null>(null);
  
  // Music State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
  const [currentTrackName, setCurrentTrackName] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const [isLocalTrack, setIsLocalTrack] = useState(false);

  // Global Alert State
  const [globalAlert, setGlobalAlert] = useState<{ title: string; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Web Audio API Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const isContextInitialized = useRef(false);

  // Safe Theme Retrieval
  const theme = useMemo(() => {
    return MOOD_THEMES[currentMood] || MOOD_THEMES[MoodType.NEUTRAL];
  }, [currentMood]);

  // Greeting Logic
  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Good Morning";
      if (hour < 18) return "Good Afternoon";
      return "Good Evening";
  };

  // 1. Fetch Tasks Real-time
  useEffect(() => {
    if (!user.uid) return;
    const q = query(collection(db, 'users', user.uid, 'tasks'), orderBy('title')); 
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const tasksData: Task[] = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as Task));
        setAllTasks(tasksData);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // 2. Fetch Mood Logs & Persistent Dashboard State
  useEffect(() => {
    if (!user.uid) return;
    
    // A. Listen to Mood Logs
    const qMood = query(collection(db, 'users', user.uid, 'mood_logs'), orderBy('timestamp', 'asc'));
    const unsubMood = onSnapshot(qMood, (snapshot: QuerySnapshot<DocumentData>) => {
        const logsData: MoodLog[] = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        } as MoodLog));
        if (logsData.length > 0) {
            const lastLog = logsData[logsData.length - 1];
            if (MOOD_THEMES[lastLog.mood]) {
                setCurrentMood(lastLog.mood);
                localStorage.setItem(`vibe_mood_${user.uid}`, lastLog.mood);
            }
        }
    });

    // B. Listen to Dashboard State (Advice, Summary)
    const stateRef = doc(db, 'users', user.uid, 'settings', 'dashboard_state');
    const unsubState = onSnapshot(stateRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as { aiAdvice?: string; journalSummary?: string };
            if (data.aiAdvice) setAiAdvice(data.aiAdvice);
            if (data.journalSummary) setJournalSummary(data.journalSummary);
        }
    });

    return () => {
        unsubMood();
        unsubState();
    };
  }, [user.uid]);

  // 3. Music Persistence
  useEffect(() => {
    if (!user.uid) return;

    // Check Firestore for saved URL settings
    const docRef = doc(db, 'users', user.uid, 'settings', 'music');
    const unsubscribe = onSnapshot(docRef, async (docSnap: DocumentSnapshot<DocumentData>) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as { url?: string; name?: string } | undefined;
        
        // Prevent overwriting if user is actively changing tracks, but ensure load on fresh mount
        if (data && data.url && (currentTrackUrl === null || data.url.startsWith('local:'))) {
            
            if (data.url.startsWith('local:')) {
                // Try to load from IndexedDB
                const savedBlob = await getFileFromIDB('current_music_file');
                if (savedBlob) {
                    const objectUrl = URL.createObjectURL(savedBlob);
                    setCurrentTrackUrl(objectUrl);
                    setCurrentTrackName(data.name || "Local Audio");
                    setIsLocalTrack(true);
                }
            } else if (data.url !== currentTrackUrl) {
                // External URL
                setCurrentTrackUrl(data.url);
                setCurrentTrackName(data.name || "Custom Track");
                setIsLocalTrack(false);
            }
        }
      }
    });
    return () => unsubscribe();
  }, [user.uid]); 

  const saveMusicToProfile = async (url: string, name: string, isLocal: boolean) => {
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'music'), {
        url: isLocal ? `local:${name}` : url, // Store marker for local files
        name,
        updatedAt: Timestamp.now()
      });
    } catch (e) {
      console.error("Failed to save music preference", e);
    }
  };

  const handleTaskLogic = {
    toggle: async (id: string, currentStatus: boolean) => {
      await updateDoc(doc(db, 'users', user.uid, 'tasks', id), { completed: !currentStatus });
    },
    add: async (title: string) => {
      await addDoc(collection(db, 'users', user.uid, 'tasks'), {
          title, completed: false, priority: 'medium', createdAt: new Date().toISOString()
      });
    },
    delete: async (id: string) => {
      await deleteDoc(doc(db, 'users', user.uid, 'tasks', id));
    }
  };

  // --- MUSIC ENGINE ---
  useEffect(() => {
    const initAudio = () => {
        if (!isContextInitialized.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioContextClass();
            gainNodeRef.current = audioCtxRef.current.createGain();
            gainNodeRef.current.connect(audioCtxRef.current.destination);
            gainNodeRef.current.gain.value = 0.5;
            isContextInitialized.current = true;
        }
    };
    initAudio();
    return () => { audioCtxRef.current?.close(); };
  }, []);

  const playBuffer = (buffer: AudioBuffer) => {
      if (!audioCtxRef.current || !gainNodeRef.current) return;
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      if (sourceNodeRef.current) try { sourceNodeRef.current.stop(); } catch(e) {}

      const source = audioCtxRef.current.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gainNodeRef.current);
      source.start(0);
      sourceNodeRef.current = source;
  };

  const stopAudio = () => {
      if (!sourceNodeRef.current) return;
      try { sourceNodeRef.current.stop(); } catch(e) {}
      sourceNodeRef.current = null;
  };

  useEffect(() => {
    if (!currentTrackUrl) return;

    const abortController = new AbortController();
    const loadAndPlay = async () => {
        if (!audioCtxRef.current) return;
        setIsAudioLoading(true);
        setAudioError(null);
        
        try {
            const response = await fetch(currentTrackUrl, { signal: abortController.signal });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            if (abortController.signal.aborted) return;

            const decodedBuffer = await audioCtxRef.current.decodeAudioData(arrayBuffer);
            audioBufferRef.current = decodedBuffer;
            if (isPlaying) playBuffer(decodedBuffer);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error("Audio Error:", error);
                setAudioError("Playback error");
                setIsPlaying(false);
            }
        } finally {
            if (!abortController.signal.aborted) setIsAudioLoading(false);
        }
    };

    loadAndPlay();
    return () => abortController.abort();
  }, [currentTrackUrl]);

  useEffect(() => {
     if (isPlaying && audioBufferRef.current) {
         playBuffer(audioBufferRef.current);
     } else {
         stopAudio();
     }
  }, [isPlaying]);

  const handleLocalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await saveFileToIDB('current_music_file', file);
    const objectUrl = URL.createObjectURL(file);
    
    setIsLocalTrack(true);
    setCurrentTrackUrl(objectUrl);
    setCurrentTrackName(file.name.replace(/\.[^/.]+$/, ""));
    setIsPlaying(true);
    setAudioError(null);

    saveMusicToProfile(objectUrl, file.name.replace(/\.[^/.]+$/, ""), true);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInputValue.trim()) {
      setIsLocalTrack(false);
      setCurrentTrackUrl(urlInputValue);
      setCurrentTrackName("External Stream");
      saveMusicToProfile(urlInputValue, "External Stream", false);
      setShowUrlInput(false);
      setIsPlaying(true);
    }
  };

  // --- ANALYTICS & LOGIC ---
  const focusScore = useMemo(() => {
    const baseScore = MOOD_FOCUS_BASE[currentMood] || 60;
    const completedCount = allTasks.filter(t => t.completed).length;
    return Math.min(baseScore + (completedCount * 5), 100);
  }, [currentMood, allTasks]);

  const focusInfo = useMemo(() => {
    if (focusScore <= 29) return { label: "Drained", sub: "Take a break." };
    if (focusScore <= 59) return { label: "Distracted", sub: "Start small." };
    if (focusScore <= 79) return { label: "Steady", sub: "Good flow." };
    return { label: "Sharp", sub: "Peak focus." };
  }, [focusScore]);

  const handleAnalysis = useCallback(async (type: 'text' | 'image' | 'audio', data: any) => {
    setIsAnalyzing(true);
    try {
        console.log("🔍 Starting analysis:", { type, dataLength: typeof data === 'string' ? data.length : 'object' });
        const result: any = await analyzeInput(data, type);
        console.log("✅ Analysis result:", result);
        
        let safeMood = result.mood;
        if (!MOOD_THEMES[safeMood]) {
            console.warn("⚠️ Unknown mood detected:", result.mood, "Defaulting to NEUTRAL");
            safeMood = MoodType.NEUTRAL;
        }

        console.log("📊 Setting mood to:", safeMood);
        setCurrentMood(safeMood);
        localStorage.setItem(`vibe_mood_${user.uid}`, safeMood); // Immediate cache

        if (result.shortSummary) setJournalSummary(result.shortSummary);
        if (result.suggestedTasks?.[0]) setAiAdvice(result.suggestedTasks[0]);
        
        // Save Mood Log
        addDoc(collection(db, 'users', user.uid, 'moodEntries'), {
            mood: safeMood,
            createdAt: Timestamp.now()
        }).catch(e => console.error("❌ Firestore mood log error:", e));

        // Save Dashboard State (Advice, Summary) so it survives refresh
        setDoc(doc(db, 'users', user.uid, 'settings', 'dashboard_state'), {
            aiAdvice: result.suggestedTasks?.[0] || aiAdvice,
            journalSummary: result.shortSummary || journalSummary,
            lastMood: safeMood,
            updatedAt: Timestamp.now()
        }, { merge: true });

        if (result.suggestedTasks) {
            result.suggestedTasks.slice(0, 2).forEach((t: string) => {
                 if (!allTasks.some(existing => existing.title === t)) handleTaskLogic.add(t);
            });
        }
    } catch (error) {
        console.error("❌ Analysis Failed:", error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        // Check if it's a rate limit error
        if (errorMsg.includes('quota') || errorMsg.includes('429')) {
            alert('📊 Gemini API Daily Quota Exceeded!\n\nYou\'ve used all 20 free requests today.\n\nOptions:\n1. Wait until tomorrow\n2. Upgrade to a paid Gemini API plan (limits removed)\n\nGo to: https://ai.google.com/pricing/');
        } else {
            alert(`❌ Error analyzing input:\n\n${errorMsg}`);
        }
    } finally {
        setIsAnalyzing(false);
    }
  }, [user.uid, allTasks, aiAdvice, journalSummary]);

  // Alert Handler
  const handleSchedulerAlert = (title: string) => {
     setGlobalAlert({
        title: "Scheduled Event Started",
        message: `It's time for: ${title}`
     });
     // Auto dismiss after 10s
     setTimeout(() => setGlobalAlert(null), 10000);
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-8 overflow-hidden relative font-sans text-gray-900">
      
      {/* GLOBAL ALERT BANNER */}
      <AnimatePresence>
        {globalAlert && (
            <MotionDiv 
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-6 left-0 right-0 z-[100] flex justify-center pointer-events-none"
            >
                <div className="bg-white/90 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl p-4 flex items-center gap-4 max-w-md pointer-events-auto ring-4 ring-indigo-500/10">
                    <div className="bg-indigo-500 text-white p-3 rounded-xl animate-bounce">
                        <BellRing size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 text-sm">{globalAlert.title}</h4>
                        <p className="text-gray-600 text-xs font-medium">{globalAlert.message}</p>
                    </div>
                    <button 
                        onClick={() => setGlobalAlert(null)}
                        className="ml-2 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            </MotionDiv>
        )}
      </AnimatePresence>

      {/* Smooth Background Transition */}
      <div className="absolute inset-0 z-0">
         <AnimatePresence>
            <MotionDiv
              key="dashboard-bg"
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="absolute inset-0"
              style={{ background: theme.colors.background }}
            />
         </AnimatePresence>
      </div>

      <BackgroundBlobs palette={theme.colors.palette} />

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10 pb-4">
        
        {/* Header */}
        <header className="md:col-span-12 flex justify-between items-center bg-white/80 backdrop-blur-md rounded-[32px] px-8 py-5 z-50 shadow-sm border border-white/50">
          <div className="flex items-center gap-4">
            <MotionDiv 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-xl shadow-lg ${theme.colors.primary} text-white`}>
              VD
            </MotionDiv>
            <div className="flex flex-col justify-center">
              <h1 className="font-extrabold text-2xl leading-none tracking-tight text-gray-900">VibeDesk</h1>
              <p className="text-xs font-bold uppercase tracking-widest mt-1 text-gray-400">Real-Time Workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-sm font-bold text-gray-900">{getGreeting()}, {user.displayName}</span>
                <span className="text-xs font-medium text-gray-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
             </div>
             
             <button onClick={onLogout} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full transition-all active:scale-95 text-gray-600 border border-transparent hover:border-gray-200">
               <LogOut size={20} />
             </button>
          </div>
        </header>

        {/* Left Column */}
        <div className="md:col-span-3 flex flex-col gap-6">
           <TiltCard delay={0.1} className="h-[340px] flex items-center justify-center relative overflow-hidden bg-white/90 backdrop-blur-sm border-0">
             <ClimateWidget mood={currentMood} weather={theme.weather} theme={theme} />
           </TiltCard>

           <div className="flex-1 min-h-[250px] relative">
             <div className="absolute inset-0">
               <TiltCard delay={0.2} className="h-full flex flex-col bg-white/90 backdrop-blur-sm">
                  <CheckInForm 
                      onAnalyze={handleAnalysis} 
                      isAnalyzing={isAnalyzing} 
                      theme={theme} 
                   />
               </TiltCard>
             </div>
           </div>

           <TiltCard delay={0.3} className="bg-white/90 backdrop-blur-sm">
             <ShortcutsWidget theme={theme} uid={user.uid} />
           </TiltCard>
           
           <TiltCard delay={0.4} className="bg-white/90 backdrop-blur-sm">
             <QuickNotesWidget theme={theme} uid={user.uid} />
           </TiltCard>
        </div>

        {/* Center Column */}
        <div className="md:col-span-5 flex flex-col gap-6">
           <TiltCard delay={0.2} className="p-8 flex items-center justify-between min-h-[180px] relative overflow-hidden bg-white/90 backdrop-blur-sm">
               <div className="flex items-center gap-6 z-10">
                 <div className="w-24 h-24 relative flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" stroke="#f3f4f6" strokeWidth="8" fill="transparent" />
                      <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="8" fill="transparent" 
                              strokeDasharray={213} strokeDashoffset={213 - (213 * focusScore) / 100}
                              strokeLinecap="round"
                              className={`transition-all duration-1000 ease-out ${theme.colors.focusRing}`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                        <span className="text-3xl font-black tabular-nums text-gray-900 leading-none">{focusScore}</span>
                        <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Focus</span>
                    </div>
                 </div>
                 <div>
                   <MotionH3 
                     key={focusInfo.label}
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="text-3xl font-black tracking-tight text-gray-900"
                   >
                     {focusInfo.label}
                   </MotionH3>
                   <p className="text-sm font-medium text-gray-500 mt-1 max-w-[200px] leading-tight">{focusInfo.sub}</p>
                 </div>
               </div>
               
               <div className="flex-1 pl-6 z-10 border-l border-gray-100 ml-6">
                 <div className="flex items-center gap-2 mb-3 text-gray-400">
                    <Sparkles size={16} className="text-amber-400" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">AI Insight</span>
                 </div>
                 <AnimatePresence mode='wait'>
                    <MotionP 
                      key={aiAdvice}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm font-semibold leading-relaxed text-gray-800"
                    >
                      "{aiAdvice}"
                    </MotionP>
                 </AnimatePresence>
               </div>
           </TiltCard>

           <div className="grid grid-cols-2 gap-6">
             <TiltCard delay={0.3} className="bg-white/90 backdrop-blur-sm">
                <PomodoroWidget theme={theme} />
             </TiltCard>
             <TiltCard delay={0.35} className="bg-white/90 backdrop-blur-sm">
                <HabitTracker theme={theme} uid={user.uid} />
             </TiltCard>
           </div>

           <TiltCard delay={0.4} className="flex-1 p-6 flex flex-col min-h-[300px] bg-white/90 backdrop-blur-sm">
             <TaskBoard 
                tasks={allTasks} 
                toggleTask={handleTaskLogic.toggle}
                addTask={handleTaskLogic.add}
                deleteTask={handleTaskLogic.delete}
                theme={theme} 
             />
           </TiltCard>
        </div>

        {/* Right Column */}
        <div className="md:col-span-4 flex flex-col gap-6">
           {/* MUSIC WIDGET */}
           <TiltCard delay={0.2} className="p-6 flex flex-col relative overflow-hidden min-h-[160px] bg-white/90 backdrop-blur-sm">
             <div className="flex justify-between items-start mb-4 z-10">
                <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme.colors.primary} shadow-lg text-white`}>
                      {isAudioLoading ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : 
                       audioError ? <AlertCircle size={24} className="text-red-300" /> :
                       <Music size={24} />}
                   </div>
                   <div className="overflow-hidden">
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${theme.colors.focusRing}`}>
                        {currentTrackUrl ? (isLocalTrack ? "Local Audio" : "Stream") : "No Music"}
                      </p>
                      {audioError ? (
                          <p className="text-red-500 text-xs font-bold">{audioError}</p>
                      ) : (
                        <MotionH3 
                            key={currentTrackName}
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 1 }}
                            className="font-bold text-lg truncate max-w-[160px] leading-tight text-gray-900"
                        >
                            {currentTrackName || "Add your music"}
                        </MotionH3>
                      )}
                   </div>
                </div>
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLocalFileSelect} 
                        accept="audio/*" 
                        className="hidden" 
                    />
                    
                    {showUrlInput ? (
                      <form onSubmit={handleUrlSubmit} className="absolute top-16 right-4 left-4 bg-white p-2 rounded-xl shadow-xl z-50 flex gap-2 border border-gray-100">
                         <input 
                            type="text" 
                            placeholder="Paste MP3 URL..." 
                            className="flex-1 text-xs outline-none bg-gray-50 px-2 rounded"
                            value={urlInputValue}
                            onChange={(e) => setUrlInputValue(e.target.value)}
                            autoFocus
                         />
                         <button type="submit" className="text-xs bg-indigo-500 text-white px-2 rounded">Go</button>
                         <button type="button" onClick={() => setShowUrlInput(false)} className="text-gray-400"><RotateCcw size={12}/></button>
                      </form>
                    ) : (
                      <>
                        <button onClick={() => setShowUrlInput(true)} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors" title="Link URL">
                           <Link size={16} />
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors" title="Play Local File">
                            <FileAudio size={16} />
                        </button>
                      </>
                    )}
                    
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)} 
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform active:scale-95 text-white shadow-xl ${(!currentTrackUrl || isAudioLoading) ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-900 hover:bg-black'}`} 
                      disabled={!currentTrackUrl || isAudioLoading}
                    >
                       {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                    </button>
                </div>
             </div>
             
             {/* Visualizer */}
             <div className="flex-1 flex items-end justify-between gap-1.5 h-16 w-full px-2">
                 {[...Array(16)].map((_, i) => (
                    <div key={i} 
                         className={`w-1.5 rounded-full origin-bottom ${isPlaying && !isAudioLoading && !audioError ? 'bg-gray-800 animate-[music-bar_0.8s_ease-in-out_infinite]' : 'bg-gray-100 h-2'}`}
                         style={{ 
                             height: isPlaying && !isAudioLoading && !audioError ? '100%' : '10%',
                             animationDelay: `${i * 0.05}s`,
                             animationDuration: `${0.5 + Math.random() * 0.5}s` 
                         }}>
                    </div>
                 ))}
             </div>
           </TiltCard>

           {/* Mood Flow Chart */}
           <TiltCard delay={0.3} className="p-6 min-h-[220px] flex flex-col bg-white/90 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4 z-10">
                <p className="text-xs uppercase text-gray-400 font-extrabold tracking-wider">Mood Flow</p>
                <span className="text-[10px] bg-gray-50 px-2 py-1 rounded-full font-bold text-gray-500">24h</span>
              </div>
              <div className="flex-1 w-full -ml-3 relative z-10">
                <MoodFlowChart uid={user.uid} theme={theme} />
              </div>
           </TiltCard>

           {/* Vibe Coach */}
           <TiltCard delay={0.4} className="bg-white/90 backdrop-blur-sm">
              <VibeCoach mood={currentMood} tasks={allTasks} theme={theme} />
           </TiltCard>

           <TiltCard delay={0.5} className="min-h-[160px] bg-white/90 backdrop-blur-sm">
              <ScheduleWidget theme={theme} uid={user.uid} onTriggerAlert={handleSchedulerAlert} />
           </TiltCard>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
