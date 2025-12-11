import React, { useState, useEffect } from 'react';
import { Check, Activity, Plus, X, Flame } from 'lucide-react';
import { MoodTheme } from '../types';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, addDoc, updateDoc, doc, orderBy, query, QuerySnapshot, DocumentData } from 'firebase/firestore';

interface Habit {
  id: string;
  name: string;
  completed: boolean;
  streak: number;
  lastCompletedDate?: string; // Format: YYYY-MM-DD
}

const HabitTracker: React.FC<{ theme: MoodTheme, uid: string }> = ({ theme, uid }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  // Helper to get today's date string YYYY-MM-DD
  const getTodayString = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'habits'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const today = getTodayString();
        const loadedHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));
        
        setHabits(loadedHabits);

        // DAILY RESET LOGIC
        // If a habit is marked completed but the date is old, reset it to false so user can do it again today.
        loadedHabits.forEach(habit => {
            if (habit.completed && habit.lastCompletedDate !== today) {
                // It was done in the past (e.g. yesterday). Uncheck it for today.
                updateDoc(doc(db, 'users', uid, 'habits', habit.id), {
                    completed: false
                    // We keep the streak as is. If they complete it today, it increments.
                });
            }
        });
    });
    return () => unsubscribe();
  }, [uid]);

  const toggleHabit = async (habit: Habit) => {
    const today = getTodayString();
    
    // If completing today:
    if (!habit.completed) {
        await updateDoc(doc(db, 'users', uid, 'habits', habit.id), {
            completed: true,
            streak: habit.streak + 1,
            lastCompletedDate: today
        });
    } else {
        // If undoing completion today:
        await updateDoc(doc(db, 'users', uid, 'habits', habit.id), {
            completed: false,
            streak: Math.max(0, habit.streak - 1),
            lastCompletedDate: '' // Clear date so it doesn't look done
        });
    }
  };

  const addHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    await addDoc(collection(db, 'users', uid, 'habits'), {
        name: newHabitName,
        completed: false,
        streak: 0,
        lastCompletedDate: ''
    });
    setNewHabitName('');
    setIsAdding(false);
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 flex items-center gap-2">
            <Activity size={16} /> Daily Habits
        </h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-[10px] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-gray-500 transition-colors flex items-center gap-1"
        >
          {isAdding ? <X size={10} /> : <Plus size={10} />} {isAdding ? 'Cancel' : 'Add'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={addHabit} className="mb-2">
          <input 
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="New habit (e.g. Drink Water)..."
            autoFocus
            className="w-full glass-input px-3 py-2 text-xs"
          />
        </form>
      )}

      <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto no-scrollbar">
        {habits.length === 0 && !isAdding && (
            <p className="text-center text-xs text-gray-400 py-4">No daily habits yet.</p>
        )}
        {habits.map(habit => (
            <div key={habit.id} className="flex items-center justify-between group bg-white border border-transparent hover:border-gray-100 p-2 rounded-xl transition-all">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => toggleHabit(habit)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all shadow-sm ${habit.completed ? `${theme.colors.primary} border-transparent text-white scale-110` : 'border-gray-100 hover:border-gray-300 bg-gray-50 text-gray-300'}`}
                    >
                        {habit.completed && <Check size={16} strokeWidth={4} />}
                    </button>
                    <div>
                        <span className={`text-sm font-bold transition-opacity block ${habit.completed ? 'opacity-50 line-through text-gray-400' : 'text-gray-800'}`}>
                            {habit.name}
                        </span>
                        {habit.completed && <span className="text-[9px] text-green-500 font-bold uppercase tracking-wider">Done for today</span>}
                    </div>
                </div>
                <div className={`text-xs font-bold font-mono flex items-center gap-1 ${habit.streak > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
                    <Flame size={12} fill={habit.streak > 0 ? "currentColor" : "none"} />
                    {habit.streak}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(HabitTracker);
