import React, { useState, useEffect } from 'react';
import { Task, MoodTheme } from '../types';
import { CheckCircle, Circle, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

interface TaskBoardProps {
  tasks: Task[];
  toggleTask: (id: string, currentStatus: boolean) => void;
  addTask: (title: string) => void;
  deleteTask: (id: string) => void;
  theme: MoodTheme;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, toggleTask, addTask, deleteTask, theme }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [flashingTaskId, setFlashingTaskId] = useState<string | null>(null);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    // Optimistic Add
    const tempId = Math.random().toString();
    const tempTask: Task = { id: tempId, title: newTaskTitle, completed: false, priority: 'medium' };
    setLocalTasks(prev => [...prev, tempTask]);
    
    addTask(newTaskTitle);
    setNewTaskTitle('');
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    // 1. Trigger Flash Effect if completing
    if (!currentStatus) {
        setFlashingTaskId(id);
        setTimeout(() => setFlashingTaskId(null), 500);
    }

    // 2. Optimistic Update
    setLocalTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !currentStatus } : t));
    
    // 3. DB Update
    toggleTask(id, currentStatus);
  };

  const handleDelete = (id: string) => {
    setLocalTasks(prev => prev.filter(t => t.id !== id));
    deleteTask(id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-900 font-bold text-lg">Current Objectives</h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">{localTasks.filter(t => !t.completed).length} Pending</span>
      </div>
      
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2 relative group">
        <input 
          type="text" 
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add assignment or task..."
          className="flex-1 glass-input px-4 py-3 text-sm transition-all focus:bg-white"
        />
        <button 
          type="submit"
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-3 rounded-xl transition-all absolute right-1 top-1 bottom-1 flex items-center justify-center"
        >
          <Plus size={18} />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
        <AnimatePresence initial={false}>
            {localTasks.map(task => {
              const isFlashing = flashingTaskId === task.id;
              
              return (
                <MotionDiv 
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ 
                        opacity: 1, 
                        x: 0,
                        backgroundColor: isFlashing ? '#d1fae5' : (task.completed ? '#f9fafb' : '#ffffff'),
                        scale: isFlashing ? 1.02 : 1
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    layout
                    className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${task.completed ? 'opacity-50 border-transparent' : 'border-gray-100 hover:border-gray-300 hover:shadow-sm'}`}
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                    <button onClick={() => handleToggle(task.id, task.completed)} className="text-gray-400 hover:text-gray-600 transition-colors relative">
                        {task.completed ? 
                            <CheckCircle size={22} className={`text-emerald-500`} /> : 
                            <Circle size={22} className={`group-hover:scale-110 transition-transform ${theme.colors.focusRing}`} />
                        }
                    </button>
                    <span className={`text-sm font-medium truncate transition-all ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {task.title}
                    </span>
                    </div>
                    <button 
                    onClick={() => handleDelete(task.id)}
                    className="text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                    >
                    <Trash2 size={16} />
                    </button>
                </MotionDiv>
              );
            })}
        </AnimatePresence>
        
        {localTasks.length === 0 && (
          <MotionDiv initial={{ opacity: 1 }} animate={{ opacity: 1 }} className="text-center text-gray-300 mt-10 text-sm">
            <p>Ready for your next subject!</p>
          </MotionDiv>
        )}
      </div>
    </div>
  );
};

export default TaskBoard;
