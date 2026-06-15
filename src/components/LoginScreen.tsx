/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { yogaAuth } from '../firebase';
import { UserRole } from '../types';
import { Compass, Sparkles, User, ShieldCheck, Mail, LogIn, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState<UserRole>('student');
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await yogaAuth.signInWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedLogin = (email: string, role: UserRole, displayName: string) => {
    setLoading(true);
    try {
      yogaAuth.simulateUserLogin(email, role, displayName);
      onLoginSuccess();
    } catch (err: any) {
      setError('Error al iniciar sesión simulada.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customName) {
      setError('Por favor completa todos los campos.');
      return;
    }
    handleSimulatedLogin(customEmail, customRole, customName);
  };

  return (
    <div className="min-h-screen bg-[#fdfaf5] flex flex-col justify-between font-sans antialiased relative overflow-hidden">
      {/* Background Shapes for Mesh Effect */}
      <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-[#e0f0e3] rounded-full blur-[120px] opacity-60 pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-[#f8ede3] rounded-full blur-[150px] opacity-60 pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-[#e9e4ff] rounded-full blur-[100px] opacity-40 pointer-events-none" />

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-white/40 backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 p-8"
        >
          {/* Logo Heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600/10 text-emerald-700 border border-white/50 mb-4 animate-pulse">
              <Compass className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-semibold text-emerald-950 tracking-tight">
              Yoga de Corazón
            </h1>
            <p className="text-emerald-800/70 text-sm mt-1">
              Estudio de Yoga Valentina • Práctica en Armonía
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50/60 backdrop-blur-md border border-red-200/50 text-red-700 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {!showRegisterForm ? (
            <div className="space-y-6">
              {/* Google Login button */}
              <button
                id="google-signin-btn"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 border border-white/40 rounded-xl text-slate-700 bg-white/60 hover:bg-white/80 font-medium text-sm transition-all shadow-sm active:scale-[0.98]"
              >
                <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {loading ? 'Cargando sesión...' : 'Iniciar Sesión con Google'}
              </button>

              <div className="relative my-6 text-center">
                <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-white/30"></span>
                <span className="relative z-10 bg-white/20 backdrop-blur px-3 py-0.5 rounded-full text-xs text-emerald-950/70 border border-white/20 font-medium uppercase tracking-wider">
                  Acceso de Prueba (Demo)
                </span>
              </div>

              {/* Demo profile simulation buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  id="demo-admin-login"
                  onClick={() => handleSimulatedLogin('valentina@yoga.com', 'admin', 'Valentina (Propietaria)')}
                  className="flex flex-col items-center justify-center p-3 border border-emerald-500/20 bg-[#e0f0e3]/45 hover:bg-[#e0f0e3]/70 rounded-xl text-emerald-900 transition-all active:scale-[0.98] shadow-sm backdrop-blur"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-750 mb-1" />
                  <span className="font-extrabold text-[11px]">Valentina</span>
                  <span className="text-[9px] text-emerald-800 font-bold">Admin</span>
                </button>
                <button
                  id="demo-student-login"
                  onClick={() => handleSimulatedLogin('joaquinvillanuevavarela@gmail.com', 'student', 'Joaquín V.')}
                  className="flex flex-col items-center justify-center p-3 border border-[#e9e4ff]/50 bg-[#e9e4ff]/35 hover:bg-[#e9e4ff]/60 rounded-xl text-indigo-950 transition-all active:scale-[0.98] shadow-sm backdrop-blur"
                >
                  <User className="w-4 h-4 text-indigo-705 mb-1" />
                  <span className="font-extrabold text-[11px]">Joaquín V.</span>
                  <span className="text-[9px] text-indigo-850 font-bold">Alumno</span>
                </button>
                <button
                  id="demo-instructor-login"
                  onClick={() => handleSimulatedLogin('sofia@yoga.com', 'instructor', 'Sofía')}
                  className="flex flex-col items-center justify-center p-3 border border-purple-200/55 bg-purple-50/35 hover:bg-purple-100/50 rounded-xl text-purple-950 transition-all active:scale-[0.98] shadow-sm backdrop-blur"
                >
                  <BookOpen className="w-4 h-4 text-purple-705 mb-1" />
                  <span className="font-extrabold text-[11px]">Sofía</span>
                  <span className="text-[9px] text-purple-800 font-bold">Profesora</span>
                </button>
              </div>

              {yogaAuth.isMockMode() && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowRegisterForm(true)}
                    className="w-full text-center text-xs text-emerald-850 hover:text-emerald-950 hover:underline font-semibold transition-colors"
                  >
                    ¿Deseas registrar un cliente nuevo alternativo?
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Registrar Cliente de Prueba
              </h3>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="ej. Valeria Mendoza"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/50 border border-white/40 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent backdrop-blur"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="ej. valeria@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white/50 border border-white/40 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent backdrop-blur"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setCustomRole('student')}
                  className={`py-2 text-[10px] font-black rounded-lg border transition-all ${
                    customRole === 'student'
                      ? 'bg-emerald-600/20 text-emerald-950 border-emerald-500/40 shadow-sm'
                      : 'bg-white/30 text-slate-500 border-white/30 hover:bg-white/50'
                  }`}
                >
                  Alumno
                </button>
                <button
                  type="button"
                  onClick={() => setCustomRole('admin')}
                  className={`py-2 text-[10px] font-black rounded-lg border transition-all ${
                    customRole === 'admin'
                      ? 'bg-emerald-600/20 text-emerald-950 border-emerald-500/40 shadow-sm'
                      : 'bg-white/30 text-slate-500 border-white/30 hover:bg-white/50'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setCustomRole('instructor')}
                  className={`py-2 text-[10px] font-black rounded-lg border transition-all ${
                    customRole === 'instructor'
                      ? 'bg-emerald-600/20 text-emerald-950 border-emerald-500/40 shadow-sm'
                      : 'bg-white/30 text-slate-500 border-white/30 hover:bg-white/50'
                  }`}
                >
                  Profesor
                </button>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegisterForm(false);
                    setError(null);
                  }}
                  className="flex-1 py-2 bg-white/30 border border-white/30 rounded-lg text-xs text-slate-700 hover:bg-white/50 transition-colors font-medium"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs transition-colors font-semibold shadow-sm"
                >
                  Crear e Iniciar
                </button>
              </div>
            </form>
          )}

          {/* LocalStorage sandbox text disclosure */}
          <div className="mt-8 flex items-start gap-2 bg-white/20 p-3 rounded-lg border border-white/30 backdrop-blur">
            <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-900/80 leading-normal font-medium">
              {yogaAuth.isMockMode() 
                ? "Modo Sandbox Activado. Toda la información se guarda de forma segura en el almacenamiento local del navegador para permitir pruebas inmediatas."
                : "Conexión en Vivo con Firebase Firestore habilitada. Los datos se guardan y consultan en tiempo real."
              }
            </p>
          </div>
        </motion.div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 relative z-10">
        &copy; {new Date().getFullYear()} Yoga de Corazón. Diseñado para Valentina.
      </footer>
    </div>
  );
}
