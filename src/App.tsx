/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import { yogaAuth } from './firebase';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import StudentPortal from './components/StudentPortal';
import InstructorPortal from './components/InstructorPortal';
import { Compass, LogOut, ShieldAlert, Sparkles, User, UserCheck, Activity, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeView, setActiveView] = useState<'admin' | 'student' | 'instructor'>('student');

  useEffect(() => {
    // Subscribe to unified authorization stream
    const unsubscribe = yogaAuth.onAuthStateChanged((userProfile) => {
      setCurrentUser(userProfile);
      setAuthLoading(false);
      
      // Auto routing based on user permissions
      if (userProfile) {
        if (userProfile.role === 'admin') {
          setActiveView('admin');
        } else if (userProfile.role === 'instructor') {
          setActiveView('instructor');
        } else {
          setActiveView('student');
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Handle manual logout
  const handleSignOut = async () => {
    try {
      await yogaAuth.signOut();
      setCurrentUser(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Rendering Loading Skeleton
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-500 font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
            Iniciando Yoga de Corazón...
          </p>
        </div>
      </div>
    );
  }

  // Not Logged In screen redirection
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-[#fdfaf5] text-slate-800 flex flex-col font-sans select-none antialiased relative overflow-hidden">
      
      {/* Background Shapes for Mesh Effect */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-[#e0f0e3] rounded-full blur-[120px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-[#f8ede3] rounded-full blur-[150px] opacity-60 pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-[#e9e4ff] rounded-full blur-[100px] opacity-40 pointer-events-none" />

      {/* Main Top bar Header */}
      <header className="bg-white/40 backdrop-blur-xl sticky top-0 z-40 border-b border-white/30 shadow-sm px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-600/10 text-emerald-800 flex items-center justify-center border border-white/40 shadow-sm backdrop-blur">
              <Compass className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-sm tracking-tight leading-none sm:text-base">
                Yoga de Corazón
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${yogaAuth.isMockMode() ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {yogaAuth.isMockMode() ? 'Modo Sandbox' : 'Conexión Firestore'}
                </span>
              </div>
            </div>
          </div>

          {/* Perspective Selector tab: visible for Admin or if they want to explore styles */}
          {(currentUser.role === 'admin' || currentUser.role === 'instructor') && (
            <div className="hidden sm:flex bg-white/20 backdrop-blur-lg p-1 rounded-xl border border-white/40 shadow-sm">
              {currentUser.role === 'admin' && (
                <button
                  id="toggle-admin-view"
                  onClick={() => setActiveView('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeView === 'admin'
                      ? 'bg-white/80 text-emerald-950 border border-white/50 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5 text-emerald-700" />
                  Métricas Valentina
                </button>
              )}
              <button
                id="toggle-student-view"
                onClick={() => setActiveView('student')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeView === 'student'
                    ? 'bg-white/80 text-blue-950 border border-white/50 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                }`}
              >
                <User className="w-3.5 h-3.5 text-blue-600" />
                Reservas Alumno
              </button>
              <button
                id="toggle-instructor-view"
                onClick={() => setActiveView('instructor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeView === 'instructor'
                    ? 'bg-white/80 text-purple-950 border border-white/50 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                Control Profesor
              </button>
            </div>
          )}

          {/* User badge + Action logout */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <span className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider bg-white/50 border border-white/40 px-2.5 py-0.5 rounded-full">
                {currentUser.role === 'admin' ? 'Valentina (Admin)' : 'Estudiante'}
              </span>
              <p className="font-semibold text-slate-700 text-xs mt-0.5">{currentUser.displayName}</p>
            </div>

            {/* Logout trigger */}
            <button
              onClick={handleSignOut}
              title="Cerrar Sesión"
              className="p-2 border border-white/40 text-slate-400 hover:text-slate-700 hover:border-white/60 rounded-xl transition-all bg-white/40 backdrop-blur shadow-sm hover:bg-white/60 active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Small screen mobile Perspective switcher */}
        {(currentUser.role === 'admin' || currentUser.role === 'instructor') && (
          <div className="mt-3.5 grid grid-cols-3 gap-1.5 sm:hidden bg-white/20 border border-white/30 p-1 rounded-xl backdrop-blur-md">
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setActiveView('admin')}
                className={`py-2 rounded-lg text-center text-[10px] font-black transition-all ${
                  activeView === 'admin' ? 'bg-white/80 text-slate-800 shadow-sm border border-white/40' : 'text-slate-500'
                }`}
              >
                Admin
              </button>
            )}
            <button
              onClick={() => setActiveView('student')}
              className={`py-2 rounded-lg text-center text-[10px] font-black transition-all ${
                activeView === 'student' ? 'bg-white/80 text-slate-800 shadow-sm border border-white/40' : 'text-slate-500'
              }`}
            >
              Alumno
            </button>
            <button
              onClick={() => setActiveView('instructor')}
              className={`py-2 rounded-lg text-center text-[10px] font-black transition-all ${
                activeView === 'instructor' ? 'bg-white/80 text-slate-800 shadow-sm border border-white/40' : 'text-slate-500'
              }`}
            >
              Profesor
            </button>
          </div>
        )}
      </header>

      {/* Primary Application view canvas container */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35 }}
          >
            {activeView === 'admin' ? (
              <AdminDashboard />
            ) : activeView === 'instructor' ? (
              <InstructorPortal user={currentUser} />
            ) : (
              <StudentPortal user={currentUser} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Clean footer line */}
      <footer className="py-6 border-t border-white/30 bg-white/20 backdrop-blur-md text-center text-xs text-slate-400 relative z-10">
        <p>&copy; {new Date().getFullYear()} Yoga de Corazón • Conectado de forma segura.</p>
      </footer>
    </div>
  );
}

