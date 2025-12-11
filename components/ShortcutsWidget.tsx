import React, { useState, useEffect } from 'react';
import { ExternalLink, Plus, X, Globe } from 'lucide-react';
import { MoodTheme } from '../types';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, QuerySnapshot, DocumentData } from 'firebase/firestore';

interface Shortcut {
  id: string;
  name: string;
  url: string;
}

const ShortcutsWidget: React.FC<{ theme: MoodTheme, uid: string }> = ({ theme, uid }) => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users', uid, 'shortcuts'));
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        setShortcuts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shortcut)));
    });
    return () => unsubscribe();
  }, [uid]);

  const addShortcut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return;
    let validUrl = newUrl;
    if (!validUrl.startsWith('http')) validUrl = 'https://' + validUrl;
    
    let name = 'Link';
    try {
        const hostname = new URL(validUrl).hostname;
        name = hostname.replace('www.', '').split('.')[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);
    } catch (e) {}

    await addDoc(collection(db, 'users', uid, 'shortcuts'), {
        name,
        url: validUrl
    });
    setNewUrl('');
    setShowInput(false);
  };

  const removeShortcut = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteDoc(doc(db, 'users', uid, 'shortcuts', id));
  };

  return (
    <div className="glass-panel p-5">
      <div className="flex justify-between items-center mb-3">
         <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-500 flex items-center gap-2">
            <ExternalLink size={14} /> Shortcuts
         </h3>
         <button onClick={() => setShowInput(!showInput)} className="text-gray-400 hover:text-gray-800 transition-colors">
            {showInput ? <X size={14} /> : <Plus size={14} />}
         </button>
      </div>

      {showInput && (
        <form onSubmit={addShortcut} className="mb-3">
            <input 
                type="text" 
                value={newUrl} 
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://..." 
                autoFocus
                className="w-full glass-input px-2 py-1 text-xs"
            />
        </form>
      )}

      <div className="grid grid-cols-4 gap-2">
         {shortcuts.map(s => (
             <a 
                key={s.id} 
                href={s.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="aspect-square bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 group relative transition-all"
             >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-gray-600 shadow-sm">
                   <img 
                    src={`https://www.google.com/s2/favicons?domain=${s.url}&sz=64`} 
                    alt={s.name} 
                    className="w-5 h-5 opacity-80"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                   />
                   <Globe size={16} className="absolute opacity-0" style={{ opacity: 0 }} /> 
                </div>
                <span className="text-[10px] text-gray-500 truncate max-w-full px-1">{s.name}</span>
                <button 
                    onClick={(e) => removeShortcut(e, s.id)}
                    className="absolute -top-1 -right-1 bg-rose-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-white"
                >
                    <X size={8} />
                </button>
             </a>
         ))}
      </div>
    </div>
  );
};

export default React.memo(ShortcutsWidget);
