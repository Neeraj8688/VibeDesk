import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, X, Clock, Trash2, Bell, BellOff, CalendarDays, Volume2, CheckCircle, Smartphone, Mail, Check } from 'lucide-react';
import { MoodTheme } from '../types';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, orderBy, query, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { auth } from '../firebaseConfig';

interface Event {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  title: string;
  notified?: boolean; // New field to track if alarm happened/done
}

const NOTIFICATION_SOUND = "https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3";

// Added onTriggerAlert prop
const ScheduleWidget: React.FC<{ theme: MoodTheme, uid: string, onTriggerAlert?: (title: string) => void }> = ({ theme, uid, onTriggerAlert }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('09:00');
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  // Fake Email Alert State
  const [emailAlert, setEmailAlert] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.load();
  }, []);

  const requestPermission = async () => {
    const perm = await Notification.requestPermission();
    setPermission(perm);
    // Play sound to unlock autoplay
    if (audioRef.current) {
        audioRef.current.play().then(() => {
            audioRef.current?.pause();
            audioRef.current!.currentTime = 0;
        }).catch(e => console.log("Audio permission pending interaction"));
    }
  };

  const testNotification = () => {
      // 1. Sound
      if(audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play();
      }
      // 2. Global Alert (Demo)
      if (onTriggerAlert) {
          onTriggerAlert("Test Alert Event");
      }

      // 3. Visual
      if (permission === "granted") {
          new Notification("VibeDesk Test", {
              body: "This is how your alerts will look.",
              icon: '/favicon.ico'
          });
      } else {
          requestPermission();
      }
      // 4. Fake Email
      simulateEmailAlert("Test Event");
  };

  const simulateEmailAlert = (eventTitle: string) => {
      const email = auth.currentUser?.email || "user@example.com";
      setEmailAlert(`ALERT SENT TO: ${email} - "${eventTitle}"`);
      setTimeout(() => setEmailAlert(null), 8000); // Show for longer
  };

  // Fetch Events Real-time
  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'schedule'), orderBy('date'), orderBy('time'));
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    });
    return () => unsubscribe();
  }, [uid]);

  // Reliable Notification Checker (Every 1 second)
  useEffect(() => {
    const checkInterval = setInterval(() => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;
        const currentDate = now.toISOString().split('T')[0];

        events.forEach(event => {
            // Check if matches date/time AND hasn't been marked as done/notified
            if (event.date === currentDate && event.time === currentTime && !event.notified) {
                
                // 1. Play Sound
                if (audioRef.current) {
                    audioRef.current.play().catch(e => console.warn("Audio blocked. Click page once."));
                }

                // 2. Trigger Dashboard Alert (Hackathon Requirement)
                if (onTriggerAlert) {
                    onTriggerAlert(event.title);
                }

                // 3. Browser Notification
                if (permission === "granted") {
                    new Notification(`VibeDesk Alert: ${event.title}`, {
                        body: `Time is up!`,
                        icon: '/favicon.ico',
                        requireInteraction: true 
                    });
                }
                
                // 4. Simulate Email
                simulateEmailAlert(event.title);

                // 5. MARK AS DONE IN DB
                // This saves the "Done" status permanently
                updateDoc(doc(db, 'users', uid, 'schedule', event.id), {
                    notified: true
                });
            }
        });
    }, 1000); 

    return () => clearInterval(checkInterval);
  }, [events, permission, uid, onTriggerAlert]);

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
        await addDoc(collection(db, 'users', uid, 'schedule'), {
            date: newDate,
            time: newTime,
            title: newTitle,
            notified: false
        });
        setNewTitle('');
        setIsAdding(false);
    } catch (e) {
        console.error("Error adding event:", e);
        alert("Could not save event. Check your connection.");
    }
  };

  const deleteEvent = async (id: string) => {
    await deleteDoc(doc(db, 'users', uid, 'schedule', id));
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="glass-panel p-5 flex flex-col h-full min-h-[220px] relative overflow-hidden">
      
      {/* Email Simulation Toast */}
      {emailAlert && (
          <div className="absolute top-0 left-0 right-0 bg-emerald-600 text-white text-xs font-bold p-3 text-center z-50 animate-in slide-in-from-top flex items-center justify-center gap-2 shadow-lg">
              <Mail size={16} className="animate-bounce" /> {emailAlert}
          </div>
      )}

      <div className="flex justify-between items-center mb-4 mt-2">
         <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${theme.colors.primary} text-white`}>
                <Calendar size={14} />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Schedule</p>
                    {permission !== 'granted' ? (
                        <button onClick={requestPermission} className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                           <BellOff size={10} /> Enable
                        </button>
                    ) : (
                        <div className="flex gap-1">
                             <button onClick={testNotification} className="text-gray-300 hover:text-indigo-500 transition-colors text-[10px] flex items-center border border-gray-100 rounded px-1" title="Send Test Alert">
                                <Bell size={10} className="mr-1"/> Test
                             </button>
                        </div>
                    )}
                </div>
                <h3 className="text-sm font-bold leading-none text-gray-900 mt-0.5">
                    {events.length > 0 ? `${events.length} Events` : 'No events'}
                </h3>
            </div>
         </div>
         <button onClick={() => setIsAdding(!isAdding)} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all">
            {isAdding ? <X size={14} /> : <Plus size={14} />}
         </button>
      </div>

      {isAdding && (
        <form onSubmit={addEvent} className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-inner animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-2 mb-2">
                <div className="w-1/2 relative">
                    <input 
                        type="date" 
                        value={newDate} 
                        onChange={e => setNewDate(e.target.value)}
                        className="w-full bg-white rounded-lg px-2 py-1 text-xs text-gray-600 border border-gray-200 focus:outline-none"
                    />
                </div>
                <div className="w-1/2 relative">
                    <input 
                        type="time" 
                        value={newTime} 
                        onChange={e => setNewTime(e.target.value)}
                        className="w-full bg-white rounded-lg px-2 py-1 text-xs text-gray-600 border border-gray-200 focus:outline-none"
                    />
                </div>
            </div>
            <input 
                type="text" 
                placeholder="Class or Event Name..." 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                autoFocus
                className="w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none border-b border-gray-200 pb-1"
            />
            <button type="submit" className="hidden">Add</button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
        {events.length === 0 ? (
            <div className="text-center text-gray-400 text-xs mt-4">
                Click + to add a scheduled event.
            </div>
        ) : (
            events.map(ev => {
                const isToday = ev.date === today;
                const isDone = ev.notified; // It is done if notified is true
                return (
                    <div key={ev.id} className={`flex gap-3 group relative p-2 rounded-lg -mx-1 transition-colors ${isDone ? 'bg-gray-50 opacity-60' : (isToday ? 'bg-indigo-50/50 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent')}`}>
                        <div className="flex flex-col items-center pt-1">
                            <div className={`w-2 h-2 rounded-full ${isDone ? 'bg-green-400' : (isToday ? theme.colors.primary : 'bg-gray-300')}`}></div>
                            <div className="w-px h-full bg-gray-100 my-1 group-last:hidden"></div>
                        </div>
                        <div className="pb-1 flex-1">
                            <div className="flex justify-between items-start">
                                <span className={`text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${isDone ? 'text-gray-400 line-through' : (isToday ? 'text-indigo-600' : 'text-gray-500')}`}>
                                    <CalendarDays size={10} />
                                    {isToday ? 'TODAY' : new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                </span>
                                <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-gray-100">
                                    <Clock size={8} /> {ev.time}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className={`text-sm font-medium leading-tight mt-0.5 ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {ev.title}
                                </p>
                                {isDone && (
                                    <div className="flex items-center gap-1 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        <CheckCircle size={10} /> DONE
                                    </div>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={() => deleteEvent(ev.id)} 
                            className="opacity-0 group-hover:opacity-100 absolute right-2 bottom-2 text-gray-300 hover:text-red-500 transition-all"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default React.memo(ScheduleWidget);
