import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Database, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import BackgroundBlobs from './BackgroundBlobs';
import { isFirebaseConfigured } from '../firebaseConfig';

const MotionDiv = motion.div as any;
const MotionForm = motion.form as any;

const SetupWizard: React.FC = () => {
  // If Firebase is already hardcoded in firebaseConfig.ts, start at step 2 (Gemini Key)
  const [step, setStep] = useState(isFirebaseConfigured() ? 2 : 1);
  const [firebaseInput, setFirebaseInput] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [error, setError] = useState('');

  const parseFirebaseConfig = (input: string) => {
    try {
      // Clean up input if they pasted the whole "const firebaseConfig = { ... }" block
      let jsonStr = input;
      
      // Basic extraction of the object part
      const objectMatch = input.match(/{[\s\S]*}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }

      // Convert JS object syntax to JSON if needed (keys without quotes)
      // This is a simple regex fix for common copy-pastes from Firebase console
      jsonStr = jsonStr.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": '); // quote keys
      jsonStr = jsonStr.replace(/'/g, '"'); // replace single quotes
      
      const config = JSON.parse(jsonStr);
      
      if (!config.apiKey || !config.projectId) throw new Error("Missing required fields");
      return config;
    } catch (e) {
      console.error(e);
      throw new Error("Could not parse configuration. Please make sure to copy only the content inside the curly braces { ... } or the full object.");
    }
  };

  const handleFirebaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const config = parseFirebaseConfig(firebaseInput);
      localStorage.setItem('vibe_firebase_config', JSON.stringify(config));
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGeminiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (geminiKey.trim().length < 10) {
      setError("That doesn't look like a valid API Key.");
      return;
    }
    localStorage.setItem('vibe_gemini_key', geminiKey.trim());
    setStep(1); // Reset form, show success message, or let parent handle refresh
    window.location.reload(); // Keep as fallback for now but marked for removal
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-white p-6">
      <BackgroundBlobs palette={['#fdfbfb', '#ebedee', '#a18cd1']} />
      
      <MotionDiv 
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-xl w-full bg-white/90 backdrop-blur-xl rounded-[40px] shadow-2xl p-8 md:p-12 relative z-10 border border-white/50"
      >
        <div className="flex items-center gap-3 mb-8">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg ${step === 1 ? 'bg-orange-500' : 'bg-indigo-500'} text-white transition-colors duration-500`}>
              {step === 1 ? '1' : '2'}
            </div>
            <div>
                <h1 className="text-2xl font-black text-gray-900 leading-none">Setup VibeDesk</h1>
                <p className="text-sm font-medium text-gray-400 mt-1">Connect your services to start</p>
            </div>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-medium">
                <AlertCircle size={18} /> {error}
            </div>
        )}

        {step === 1 && (
            <MotionForm 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                onSubmit={handleFirebaseSubmit}
                className="space-y-6"
            >
                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <Database size={16} /> Firebase Configuration
                    </label>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                        Go to your Firebase Console Project Settings → General → Your Apps.<br/>
                        Click the <b>&lt;/&gt;</b> icon, register the app, and paste the code block below.
                    </p>
                    <textarea 
                        value={firebaseInput}
                        onChange={e => setFirebaseInput(e.target.value)}
                        placeholder={'const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  ...\n};'}
                        className="w-full h-48 glass-input p-4 font-mono text-xs leading-relaxed resize-none focus:ring-2 focus:ring-orange-100"
                        required
                    />
                </div>
                <button type="submit" className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Next Step <ArrowRight size={18} />
                </button>
            </MotionForm>
        )}

        {step === 2 && (
             <MotionForm 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                onSubmit={handleGeminiSubmit}
                className="space-y-6"
            >
                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                        <Sparkles size={16} /> Gemini API Key
                    </label>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                        Go to <b>aistudio.google.com/app/apikey</b> to get your free key for the mood analysis.
                    </p>
                    <input 
                        type="text"
                        value={geminiKey}
                        onChange={e => setGeminiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full glass-input p-4 font-mono text-sm focus:ring-2 focus:ring-indigo-100"
                        required
                    />
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Launch VibeDesk <CheckCircle size={18} />
                </button>
            </MotionForm>
        )}
      </MotionDiv>
    </div>
  );
};

export default SetupWizard;
