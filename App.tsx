import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SetupWizard from './components/SetupWizard';
import { User } from './types';
import { auth, isFirebaseConfigured } from './firebaseConfig';
import { isGeminiConfigured } from './services/geminiService';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

// Simple Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: string}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error.toString() };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-red-50 text-red-900 font-sans">
          <AlertTriangle size={48} className="mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="mb-4 opacity-80">We encountered an unexpected error.</p>
          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm max-w-md overflow-auto text-xs font-mono mb-6">
            {this.state.error}
          </div>
          <button 
            onClick={() => {
                localStorage.clear();
                // Trigger re-render or manual redirect instead of reload
                window.location.href = window.location.origin;
            }}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            Reset App & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [configError, setConfigError] = useState('');

  useEffect(() => {
    try {
        // Check if configuration exists
        if (!isFirebaseConfigured() || !isGeminiConfigured()) {
            setNeedsSetup(true);
            setLoading(false);
            return;
        }

        if (!auth) {
            throw new Error("Firebase Auth is not initialized.");
        }

        // Real-time listener for authentication state
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student'
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        }, (error: any) => {
            console.error("Auth Error", error);
            // Translate common config errors to human readable messages
            if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
                setConfigError("Authentication is not enabled in Firebase Console. Please enable Email/Password provider.");
            } else {
                setConfigError(error.message);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    } catch (e: any) {
        console.error("App Init Error", e);
        setConfigError(e.message || "Initialization failed");
        setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      if(auth) await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-indigo-500 w-10 h-10" />
      </div>
    );
  }

  if (configError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 font-sans">
            <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Setup Issue</h2>
                <p className="text-gray-500 mb-6 font-medium leading-relaxed">{configError}</p>
                
                {configError.includes("Authentication") && (
                     <div className="bg-blue-50 p-4 rounded-xl text-left text-sm text-blue-800 mb-6">
                        <strong>To fix this:</strong>
                        <ol className="list-decimal list-inside mt-2 space-y-1 opacity-90">
                            <li>Go to Firebase Console</li>
                            <li>Click <b>Authentication</b> in the menu</li>
                            <li>Click <b>Get Started</b></li>
                            <li>Select <b>Email/Password</b></li>
                            <li>Enable it and click <b>Save</b></li>
                        </ol>
                     </div>
                )}

                <div className="flex gap-3">
                    <a 
                        href="https://console.firebase.google.com/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                         Open Console <ExternalLink size={16} />
                    </a>
                    <button 
                        onClick={() => window.location.href = window.location.origin}
                        className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-200"
                    >
                        Check Again
                    </button>
                </div>
            </div>
        </div>
      );
  }

  if (needsSetup) {
    return <SetupWizard />;
  }

  if (!user) {
    return <Login />; 
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
}