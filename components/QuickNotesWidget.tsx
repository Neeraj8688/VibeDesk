import React, { useState, useEffect, useRef } from 'react';
import { StickyNote, Plus, Trash2, X, Link, FileText, ExternalLink, Save, Upload, AlertCircle } from 'lucide-react';
import { MoodTheme } from '../types';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc, orderBy, query, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

// --- INDEXED DB HELPER FOR NOTES ---
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

interface Attachment {
    name: string;
    url: string; 
    type: 'link' | 'file';
    originalKey?: string; // Critical for persistent blob restoration
}

interface Note {
    id: string;
    title: string;
    content: string;
    attachments?: Attachment[];
    createdAt: string;
}

const QuickNotesWidget: React.FC<{ theme: MoodTheme, uid: string }> = ({ theme, uid }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  
  // Editor State
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Link Adding State
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [inputType, setInputType] = useState<'url' | 'file'>('url');
  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, 'users', uid, 'notes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const fetchedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));
        setNotes(fetchedNotes);
        
        // Update active note if it's currently open
        if (activeNote) {
           const updated = fetchedNotes.find(n => n.id === activeNote.id);
           if (updated) {
               // Only update if content changed on server, preserve local blob state if possible
               setActiveNote(curr => {
                   if (!curr) return updated;
                   return { 
                       ...updated, 
                       // Merge attachments to keep blob URLs alive if they exist locally
                       attachments: updated.attachments?.map(remoteAtt => {
                           const existing = curr.attachments?.find(local => 
                               (local.originalKey && local.originalKey === remoteAtt.url) || 
                               local.url === remoteAtt.url
                           );
                           return existing ? existing : remoteAtt;
                       }) 
                   };
               });
           }
        }
    });
    return () => unsubscribe();
  }, [uid]);

  // RESTORE LOCAL BLOBS
  useEffect(() => {
      if (!activeNote || !activeNote.attachments) return;

      const restoreBlobs = async () => {
          let hasUpdates = false;
          const updatedAttachments = await Promise.all(activeNote.attachments!.map(async (att) => {
              // If it's a "local:" key but we don't have a blob URL yet
              if (att.type === 'file' && att.url.startsWith('local:')) {
                  const fileKey = att.url; 
                  const blob = await getFileFromIDB(fileKey);
                  if (blob) {
                      hasUpdates = true;
                      return { ...att, url: URL.createObjectURL(blob), originalKey: fileKey };
                  }
              }
              return att;
          }));

          if (hasUpdates) {
             setActiveNote(prev => prev ? ({...prev, attachments: updatedAttachments}) : null);
          }
      };
      
      // Only run if we see "local:" urls that haven't been resolved to "blob:" yet
      if (activeNote.attachments.some(a => a.url.startsWith('local:'))) {
          restoreBlobs();
      }
  }, [activeNote?.id, activeNote?.attachments]);

  const createNewNote = async () => {
    const newNote = {
        title: 'Untitled Note',
        content: '',
        createdAt: new Date().toISOString(),
        attachments: []
    };
    try {
        const docRef = await addDoc(collection(db, 'users', uid, 'notes'), newNote);
        const created = { ...newNote, id: docRef.id };
        openEditor(created);
        setIsExpanded(true);
    } catch(e) {
        console.error("Error creating note:", e);
    }
  };

  const openEditor = (note: Note) => {
    setActiveNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.content || '');
    setIsExpanded(true);
    setShowLinkInput(false);
  };

  const saveNote = async () => {
    if (!activeNote) return;
    
    const noteId = activeNote.id;
    const dataToSave = {
        title: editTitle,
        content: editContent,
    };
    
    setIsExpanded(false);
    setActiveNote(null);
    
    try {
        await updateDoc(doc(db, 'users', uid, 'notes', noteId), dataToSave);
    } catch(e) {
        console.error("Save failed in background:", e);
    }
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeNote?.id === id) {
        setActiveNote(null);
        setIsExpanded(false);
    }
    try {
        await deleteDoc(doc(db, 'users', uid, 'notes', id));
    } catch (e) {
        console.error("Delete failed:", e);
    }
  };

  const handleAddLink = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newLinkName || !activeNote) return;

      let finalUrl = newLinkUrl;
      let type: 'link' | 'file' = 'link';

      if (inputType === 'url') {
        if (!finalUrl) return;
        if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
      } else {
         return;
      }

      await saveAttachment(newLinkName, finalUrl, type);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !activeNote) return;

      const uniqueKey = `local:${activeNote.id}_${Date.now()}_${file.name}`;
      await saveFileToIDB(uniqueKey, file);

      const blobUrl = URL.createObjectURL(file);
      await saveAttachment(file.name, blobUrl, 'file', uniqueKey);
  };

  const saveAttachment = async (name: string, url: string, type: 'link' | 'file', persistenceKey?: string) => {
      if (!activeNote) return;
      
      const newAttachment: Attachment = { name, url, type, originalKey: persistenceKey };
      const currentAttachments = activeNote.attachments || [];
      const updatedAttachments = [...currentAttachments, newAttachment];

      // Optimistic update
      setActiveNote(prev => prev ? ({ ...prev, attachments: updatedAttachments }) : null);

      try {
        // Sanitize for DB: Convert blob URLs back to "local:" keys or original URLs
        const attachmentsForDB = updatedAttachments.map(a => {
            // Priority: originalKey (if it exists, it's the stable IDB key) > url
            const dbUrl = a.originalKey ? a.originalKey : a.url;
            return {
                name: a.name,
                url: dbUrl,
                type: a.type
            };
        });

        await updateDoc(doc(db, 'users', uid, 'notes', activeNote.id), {
            attachments: attachmentsForDB
        });
        
        setNewLinkName('');
        setNewLinkUrl('');
        setShowLinkInput(false);
      } catch (e) {
          console.error("Failed to add link", e);
      }
  };

  const deleteAttachment = async (indexToDelete: number) => {
      if(!activeNote) return;
      const updatedAttachments = activeNote.attachments?.filter((_, index) => index !== indexToDelete);
      
      setActiveNote(prev => prev ? ({ ...prev, attachments: updatedAttachments }) : null);

      const attachmentsForDB = updatedAttachments?.map(a => {
           const dbUrl = a.originalKey ? a.originalKey : a.url;
           return {
               name: a.name,
               url: dbUrl,
               type: a.type
           };
      });

      await updateDoc(doc(db, 'users', uid, 'notes', activeNote.id), {
          attachments: attachmentsForDB
      });
  };

  const handleClose = () => {
      saveNote(); 
  };

  return (
    <>
        <div className="glass-panel p-5 flex flex-col gap-3 min-h-[200px] relative group">
            <div className="flex items-center justify-between text-gray-500">
                <div className="flex items-center gap-2">
                    <StickyNote size={16} />
                    <h3 className="font-semibold text-sm uppercase tracking-wide">Quick Links</h3>
                </div>
                <button 
                    onClick={createNewNote}
                    className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                >
                    <Plus size={14} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-[150px]">
                {notes.length === 0 && <p className="text-center text-[10px] text-gray-400 mt-2">Create a note to add links.</p>}
                {notes.map((note) => (
                    <div 
                        key={note.id} 
                        onClick={() => openEditor(note)}
                        className="group/item cursor-pointer bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 rounded-lg p-3 relative transition-all active:scale-[0.99]"
                    >
                        <h4 className="text-xs font-bold text-gray-800 truncate pr-6">{note.title || "Untitled"}</h4>
                        {note.attachments && note.attachments.length > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-[9px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded w-fit">
                                <Link size={8} /> {note.attachments.length} link(s)
                            </div>
                        )}
                        <button 
                            onClick={(e) => deleteNote(note.id, e)}
                            className="absolute top-2 right-2 text-gray-300 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>
        </div>

        {/* FULL SCREEN EDITOR MODAL */}
        <AnimatePresence>
            {isExpanded && activeNote && (
                <MotionDiv 
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
                    onClick={handleClose}
                >
                    <MotionDiv 
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        className="w-full max-w-4xl h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Toolbar */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <input 
                                type="text" 
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Topic Name..."
                                className="text-xl font-bold bg-transparent text-gray-800 focus:outline-none w-full"
                            />
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={saveNote}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-200"
                                >
                                    <Save size={16} /> Save & Close
                                </button>
                                <button 
                                    onClick={handleClose}
                                    className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Editor Content */}
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100">
                                <textarea 
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder="Type your notes here..."
                                    className="w-full h-full resize-none focus:outline-none text-gray-700 leading-relaxed text-base"
                                ></textarea>
                            </div>

                            {/* Links Sidebar */}
                            <div className="w-full md:w-80 bg-gray-50 p-4 flex flex-col gap-4 overflow-y-auto">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold uppercase text-gray-400">Resources</h4>
                                    <button 
                                        onClick={() => setShowLinkInput(!showLinkInput)}
                                        className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add
                                    </button>
                                </div>

                                {showLinkInput && (
                                    <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm flex flex-col gap-2 animate-in slide-in-from-top-2">
                                        
                                        {/* Toggle Type */}
                                        <div className="flex gap-2 mb-1">
                                            <button 
                                                onClick={() => setInputType('url')}
                                                className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${inputType === 'url' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-100 text-gray-500'}`}
                                            >
                                                Web Link
                                            </button>
                                            <button 
                                                onClick={() => setInputType('file')}
                                                className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${inputType === 'file' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-100 text-gray-500'}`}
                                            >
                                                Local File
                                            </button>
                                        </div>

                                        {inputType === 'url' ? (
                                            <form onSubmit={handleAddLink} className="flex flex-col gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Name (e.g. Wiki)" 
                                                    value={newLinkName}
                                                    onChange={e => setNewLinkName(e.target.value)}
                                                    className="text-xs border border-gray-200 rounded p-1.5 focus:outline-none focus:border-indigo-300"
                                                    autoFocus
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="https://..." 
                                                    value={newLinkUrl}
                                                    onChange={e => setNewLinkUrl(e.target.value)}
                                                    className="text-xs border border-gray-200 rounded p-1.5 focus:outline-none focus:border-indigo-300"
                                                />
                                                <div className="flex justify-end gap-2 mt-1">
                                                    <button type="button" onClick={() => setShowLinkInput(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                                    <button type="submit" className="text-xs bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600">Add</button>
                                                </div>
                                            </form>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <div className="text-[10px] text-gray-400 flex items-start gap-1">
                                                    <AlertCircle size={10} className="mt-0.5 shrink-0" />
                                                    <span>Browser blocks local paths. We save to your browser database.</span>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    onChange={handleFileSelect}
                                                    className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                />
                                                 <div className="flex justify-end gap-2 mt-1">
                                                    <button type="button" onClick={() => setShowLinkInput(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div className="space-y-2">
                                    {activeNote.attachments?.map((file, idx) => (
                                        <div 
                                            key={idx} 
                                            className="relative group block p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all"
                                        >
                                            <a 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 mb-1"
                                                title={file.type === 'file' ? "Stored Locally in Browser" : file.url}
                                            >
                                                <div className={`p-1.5 rounded ${file.type === 'file' ? 'bg-purple-50 text-purple-500' : 'bg-orange-50 text-orange-500'}`}>
                                                    {file.type === 'file' ? <FileText size={16} /> : <Link size={16} />}
                                                </div>
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="text-xs font-bold text-gray-700 truncate">{file.name}</span>
                                                    <span className="text-[9px] text-gray-400 truncate">{file.type === 'file' ? 'Stored Locally' : file.url}</span>
                                                </div>
                                                <ExternalLink size={12} className="text-gray-400" />
                                            </a>
                                            <button 
                                                onClick={() => deleteAttachment(idx)}
                                                className="absolute -top-1 -right-1 bg-white border border-gray-200 text-gray-400 hover:text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                    {(!activeNote.attachments || activeNote.attachments.length === 0) && !showLinkInput && (
                                        <div className="text-center p-4 border-2 border-dashed border-gray-200 rounded-xl">
                                            <p className="text-[10px] text-gray-400">No links added.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </MotionDiv>
                </MotionDiv>
            )}
        </AnimatePresence>
    </>
  );
};

export default React.memo(QuickNotesWidget);
