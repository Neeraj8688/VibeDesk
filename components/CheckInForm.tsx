import React, { useState, useRef } from 'react';
import { Camera, Mic, Send, StopCircle, Loader2, Brain } from 'lucide-react';
import { MoodTheme } from '../types';

interface CheckInFormProps {
  onAnalyze: (type: 'text' | 'image' | 'audio', data: any) => void;
  isAnalyzing: boolean;
  theme: MoodTheme;
}

const CheckInForm: React.FC<CheckInFormProps> = ({ onAnalyze, isAnalyzing, theme }) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onAnalyze('text', input);
    setInput('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await blobToBase64(file);
    const data = base64.split(',')[1];
    onAnalyze('image', { mimeType: file.type, data });
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Use standard webm which Gemini 2.5 Flash handles well via the REST API
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const base64 = await blobToBase64(blob);
          const data = base64.split(',')[1];
          onAnalyze('audio', { mimeType: 'audio/webm', data });
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Mic error", err);
        alert("Microphone access denied or not supported.");
      }
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col justify-between shadow-none bg-transparent">
      <div>
        <h3 className="font-semibold mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-gray-400">
          <span className="flex items-center gap-2"><Brain size={14} /> Mental Check-In</span>
          {isRecording && <span className="text-rose-500 animate-pulse font-bold">Recording...</span>}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Listening to your voice..." : "How are you feeling right now?"}
            disabled={isRecording}
            className={`w-full h-24 glass-input p-4 text-sm resize-none focus:ring-1 focus:ring-gray-200 ${isRecording ? 'bg-red-50/50' : ''}`}
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all text-gray-600 active:scale-95" title="Analyze Face/Room">
                <Camera size={18} />
              </button>
              <button type="button" onClick={toggleRecording} className={`p-2.5 rounded-xl transition-all active:scale-95 flex items-center gap-2 ${isRecording ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`} title="Voice Check-in">
                {isRecording ? <StopCircle size={18} className="animate-pulse" /> : <Mic size={18} />}
              </button>
            </div>
            <button type="submit" disabled={isAnalyzing || isRecording} className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all hover:translate-y-[-2px] active:translate-y-0 shadow-md text-white ${theme.colors.primary}`}>
              {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Analyze
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckInForm;
