import React, { useState } from 'react';
import { User } from '../types';
import { ArrowRight, Lock, Mail, AlertCircle, ExternalLink, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import BackgroundBlobs from './BackgroundBlobs';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

interface LoginProps {
  // Auth is handled by App.tsx onAuthStateChanged, login only needs to trigger Firebase auth
}

const Login: React.FC<LoginProps> = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleMode = () => {
      setIsSignUp(!isSignUp);
      setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if(auth.currentUser) {
            await updateProfile(auth.currentUser, {
                displayName: email.split('@')[0]
            });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      const errorCode = err.code;
      const errorMessage = err.message || "";

      // Firebase v9+ consolidates 'user-not-found' and 'wrong-password' into 'invalid-credential' for security
      if (
          errorCode === 'auth/invalid-credential' || 
          errorCode === 'auth/user-not-found' || 
          errorCode === 'auth/wrong-password' ||
          errorMessage.includes('invalid-credential')
      ) {
        setError("Account not found or incorrect password. Please check your spelling or switch to 'Sign Up' if you are new.");
      } else if (errorCode === 'auth/email-already-in-use') {
        setError("This email is already registered. Please log in instead.");
      } else if (errorCode === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (errorCode === 'auth/operation-not-allowed' || errorCode === 'auth/configuration-not-found') {
        setError("Login Disabled. Please enable 'Email/Password' in Firebase Console -> Authentication.");
      } else if (errorCode === 'auth/network-request-failed') {
        setError("Network error. Please check your internet connection.");
      } else if (errorCode === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(errorMessage || "An error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-white">
      
      {/* Dynamic Animated Background */}
      <BackgroundBlobs palette={['#4facfe', '#00f2fe', '#a18cd1']} />

      <MotionDiv 
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="z-10 w-full max-w-md p-10 bg-white/80 backdrop-blur-md rounded-[40px] shadow-2xl shadow-indigo-500/10 border border-white/50"
      >
        <div className="text-center mb-8">
           <MotionDiv 
             initial={{ scale: 0, rotate: -20 }}
             animate={{ scale: 1, rotate: 0 }}
             transition={{ delay: 0.2, type: "spring" }}
             className="w-20 h-20 mx-auto bg-gradient-to-tr from-cyan-400 to-indigo-500 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/30"
           >
             <span className="text-white font-black text-3xl">VD</span>
           </MotionDiv>
           <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">VibeDesk</h1>
           <p className="text-gray-400 text-sm font-bold tracking-wide uppercase">
             {isSignUp ? "Create Student Account" : "Unlock your flow"}
           </p>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl flex flex-col gap-2 animate-[shake_0.5s_ease-in-out]">
                <div className="flex items-center gap-2 font-bold">
                    <AlertCircle size={16} /> Login Failed
                </div>
                <p>{error}</p>
                {(error.includes("Firebase Console") || error.includes("Access Disabled")) && (
                    <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline flex items-center gap-1 mt-1 hover:text-indigo-800">
                        Go to Firebase Console <ExternalLink size={10} />
                    </a>
                )}
            </div>
        )}

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-2xl mb-6 relative">
             <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-spring ${isSignUp ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'}`}></div>
             <button 
                type="button"
                onClick={() => { setIsSignUp(false); setError(''); }}
                className={`flex-1 relative z-10 py-2.5 text-sm font-bold transition-colors ${!isSignUp ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
             >
                Log In
             </button>
             <button 
                type="button"
                onClick={() => { setIsSignUp(true); setError(''); }}
                className={`flex-1 relative z-10 py-2.5 text-sm font-bold transition-colors ${isSignUp ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
             >
                Sign Up
             </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-gray-400 uppercase ml-1 tracking-wider">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50/50 border-2 border-transparent rounded-2xl py-3 pl-12 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                placeholder="student@university.edu"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-extrabold text-gray-400 uppercase ml-1 tracking-wider">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-gray-50/50 border-2 border-transparent rounded-2xl py-3 pl-12 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <MotionButton 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading}
            className={`w-full mt-4 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xl ${isSignUp ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-gray-900 hover:bg-black shadow-gray-900/20'}`}
          >
            {isLoading ? (
               <span className="flex items-center gap-2 text-sm">
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 {isSignUp ? "Creating Account..." : "Logging In..."}
               </span>
            ) : (
               <>
                 {isSignUp ? (
                    <>Create Account <UserPlus size={20} /></>
                 ) : (
                    <>Get Started <LogIn size={20} /></>
                 )}
               </>
            )}
          </MotionButton>
        </form>

        <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
                {isSignUp ? "Already have an account? " : "First time here? "}
                <button 
                    onClick={toggleMode} 
                    className="font-bold text-indigo-600 hover:underline"
                >
                    {isSignUp ? "Log In" : "Create Account"}
                </button>
            </p>
        </div>
      </MotionDiv>
    </div>
  );
};

export default Login;
