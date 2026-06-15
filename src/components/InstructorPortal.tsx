/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile, YogaClass, Booking, BookingStatus } from '../types';
import { yogaDatabase } from '../firebase';
import { Calendar, Users, Clock, Search, BookOpen, Compass, Award, User, RefreshCw, Star, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InstructorPortalProps {
  user: UserProfile;
}

export default function InstructorPortal({ user }: InstructorPortalProps) {
  const [classes, setClasses] = useState<YogaClass[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Instructors list
  const instructorsList = ['Sofía', 'Matías', 'Camila', 'Lucas'];
  
  // Since the simulated user might be a student or admin, we'll let any logged-in user switch instructor view 
  // to toggle and explore Sofia, Matias, etc. if they are logged in.
  const initialInstructor = instructorsList.includes(user.displayName) ? user.displayName : 'Sofía';
  const [activeInstructor, setActiveInstructor] = useState<string>(initialInstructor);

  // Search filter for student lookup
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<string>('');

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const allWebClasses = await yogaDatabase.getClasses();
      setClasses(allWebClasses);

      const allBookings = await yogaDatabase.getBookings();
      setBookings(allBookings);

      const allUsers = await yogaDatabase.getAllUsers();
      setUsers(allUsers);
    } catch (e) {
      console.error("Error loading instructor portal data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
    const interval = setInterval(loadPortalData, 8000);
    return () => clearInterval(interval);
  }, []);

  // Filter classes taught by active instructor
  const instructorClasses = classes.filter(c => c.instructor === activeInstructor);

  // Filter bookings taught by active instructor
  const instructorBookings = bookings.filter(b => b.instructor === activeInstructor);

  // Get list of unique students under this instructor
  const uniqueStudentIds = Array.from(new Set(instructorBookings.map(b => b.studentId)));
  const instructorStudents = uniqueStudentIds.map(id => {
    const matchedProfile = users.find(u => u.userId === id);
    const bookingsWithMe = instructorBookings.filter(b => b.studentId === id);
    const attendedCount = bookingsWithMe.filter(b => b.status === 'attended').length;
    const bookedCount = bookingsWithMe.filter(b => b.status === 'booked').length;
    
    return {
      userId: id,
      name: matchedProfile?.displayName || bookingsWithMe[0]?.studentName || 'Alumno de Yoga',
      email: matchedProfile?.email || bookingsWithMe[0]?.studentEmail || '',
      attendedCount,
      bookedCount,
      totalReservations: bookingsWithMe.length,
      bookings: bookingsWithMe
    };
  }).sort((a, b) => b.attendedCount - a.attendedCount);

  // Handle student search query filter
  const filteredStudents = instructorStudents.filter(s => {
    const q = studentSearchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  // Calculate stats for current teacher
  const totalAttended = instructorBookings.filter(b => b.status === 'attended').length;
  const totalUpcoming = instructorBookings.filter(b => b.status === 'booked').length;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10 font-sans">
      
      {/* Header view */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-emerald-900 text-[10px] font-black uppercase tracking-wider bg-emerald-100/60 border border-emerald-200/50 px-2.5 py-1 rounded-full">
            Portal de Instructores • Yoga de Corazón
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 mt-2">
            Cronograma de Clases y Ficha de Alumnos
          </h1>
          <p className="text-xs text-slate-650 mt-1 font-medium">
            Visualiza los días, horas y lista de profesores/alumnos para cada clase asistida o programada en el estudio.
          </p>
        </div>

        {/* Sync trigger */}
        <button
          onClick={loadPortalData}
          className="flex items-center gap-2 px-4 py-2 border border-white/60 rounded-xl bg-white/40 hover:bg-white/60 backdrop-blur text-xs font-bold text-slate-800 shadow-sm transition-all active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-800 ${loading ? 'animate-spin' : ''}`} /> 
          {loading ? 'Refrescando...' : 'Sincronizar'}
        </button>
      </div>

      {/* Select Instructor Switcher (Allows testing for different instructors) */}
      <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-4 rounded-2xl shadow-sm text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <label className="text-[10px] uppercase font-black text-slate-450 tracking-wider">Simular Profesor/a en sesión:</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {instructorsList.map((inst) => (
              <button
                key={inst}
                onClick={() => {
                  setActiveInstructor(inst);
                  setSelectedStudentForHistory('');
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                  activeInstructor === inst
                    ? 'bg-emerald-800 hover:bg-emerald-700 text-white border-emerald-900 shadow-md scale-102'
                    : 'bg-white/50 border-white/60 text-slate-600 hover:text-slate-850 hover:bg-white/80'
                }`}
              >
                {inst}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/40 p-3 rounded-xl border border-white/55 flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 font-bold shrink-0">
            {activeInstructor.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-black text-slate-800">Profesor/a: {activeInstructor}</div>
            <div className="text-[10px] text-slate-500 font-bold">
              Especialidad: {
                activeInstructor === 'Sofía' ? 'Vinyasa Flow' :
                activeInstructor === 'Matías' ? 'Hatha Tradicional' :
                activeInstructor === 'Camila' ? 'Ashtanga Pro' : 'Yin & Sonidos'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Clases en tu Agenda</span>
            <span className="text-2xl font-mono font-black text-slate-800">{instructorClasses.length} clases</span>
            <p className="text-[10px] font-semibold text-slate-500 mt-1">Horas reservables programadas</p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-455 font-black uppercase tracking-wider block">Alumnos que Tuviste</span>
            <span className="text-2xl font-mono font-black text-emerald-900">{totalAttended} asistencias</span>
            <p className="text-[10px] font-semibold text-slate-500 mt-1">Acumulado de clases dictadas</p>
          </div>
          <div className="w-10 h-10 bg-emerald-55 rounded-xl flex items-center justify-center text-emerald-800">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm text-left flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-455 font-black uppercase tracking-wider block">Reservas Próximas</span>
            <span className="text-2xl font-mono font-black text-blue-900">{totalUpcoming} reservas</span>
            <p className="text-[10px] font-semibold text-slate-500 mt-1">Cupos reservados esta semana</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-800">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Days, Hours and Scheduled classes of the Teacher (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-sm text-left space-y-4">
            <div className="border-b border-white/20 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-1.5">
                  <Calendar className="w-4.5 h-4.5 text-emerald-700" />
                  Tus Días y Horarios de Clases
                </h3>
                <p className="text-slate-600 text-xs mt-0.5">Control de días, horas y asignación de alumnos para tus sesiones.</p>
              </div>
              <span className="text-[10px] bg-emerald-100 ring-1 ring-emerald-250/20 px-2 py-0.5 text-emerald-950 font-black rounded-lg">
                Cronograma Semanal
              </span>
            </div>

            {/* Visual Grid of classes by day */}
            <div className="space-y-4">
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day) => {
                const dayClasses = instructorClasses.filter(c => c.dayOfWeek === day);
                
                return (
                  <div key={day} className="p-4 bg-white/50 rounded-xl border border-white/70 space-y-3 shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-850 uppercase tracking-wider block">{day}</span>
                      <span className="text-[10px] text-slate-450 font-bold">
                        {dayClasses.length} {dayClasses.length === 1 ? 'clase programada' : 'clases programadas'}
                      </span>
                    </div>

                    {dayClasses.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {dayClasses.map((yogaClass) => {
                          const classBookings = instructorBookings.filter(b => b.classId === yogaClass.classId);
                          const activeBookings = classBookings.filter(b => b.status === 'booked');
                          const attendedBookings = classBookings.filter(b => b.status === 'attended');
                          
                          return (
                            <div key={yogaClass.classId} className="bg-white/80 p-3 rounded-lg border border-slate-205/60 space-y-2 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-extrabold text-slate-900">{yogaClass.name}</span>
                                  <span className="text-[10px] bg-slate-100 font-mono text-slate-700 py-0.5 px-2 rounded-md font-bold flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-500" /> {yogaClass.time}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-[10px] text-slate-500 font-bold">Capacidad:</span>
                                  <span className="text-[10px] text-slate-800 font-bold">{yogaClass.capacity} cupos totales</span>
                                </div>
                              </div>

                              <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px] font-bold">
                                <span className="text-blue-800">{activeBookings.length} Reservados</span>
                                <span className="text-emerald-800">{attendedBookings.length} Asistieron</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-450 italic font-semibold">No dictas clases los días {day}.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Student Lookup & Mutual history (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-sm text-left space-y-4">
            <div>
              <h3 className="font-bold text-slate-850 text-sm flex items-center gap-1.5">
                <Users className="w-4.5 h-4.5 text-emerald-700" />
                Alumnos Registrados Contigo ({instructorStudents.length})
              </h3>
              <p className="text-slate-600 text-xs mt-0.5 font-medium">Buscador y bitácora clínica de asistencia de tus alumnos.</p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="Buscar alumno por nombre o email..."
                className="w-full text-xs font-bold text-slate-800 bg-white/60 border border-slate-200/80 rounded-xl py-2.5 pl-9 pr-4 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              {studentSearchQuery && (
                <button 
                  onClick={() => setStudentSearchQuery('')} 
                  className="absolute right-3 top-3 text-slate-450 hover:text-slate-800 text-xs font-black"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Students list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredStudents.map((student) => {
                const isSelected = selectedStudentForHistory === student.userId;
                return (
                  <div
                    key={student.userId}
                    onClick={() => setSelectedStudentForHistory(isSelected ? '' : student.userId)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left flex items-center justify-between ${
                      isSelected 
                        ? 'bg-emerald-100/30 border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-sm'
                        : 'bg-white/50 border-white/60 hover:bg-white/80'
                    }`}
                  >
                    <div className="space-y-0.5 pr-2 truncate">
                      <div className="text-xs font-black text-slate-850 truncate">{student.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold truncate">{student.email}</div>
                      <div className="flex gap-2 pt-1">
                        <span className="text-[9px] bg-emerald-50 text-emerald-950 font-bold px-1.5 py-0.2 rounded border border-emerald-100">
                          {student.attendedCount} asistió
                        </span>
                        {student.bookedCount > 0 && (
                          <span className="text-[9px] bg-blue-50 text-blue-950 font-bold px-1.5 py-0.2 rounded border border-blue-150">
                            {student.bookedCount} reservó
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowRight className={`w-4 h-4 transition-transform text-slate-400 ${isSelected ? 'rotate-90 text-emerald-700' : ''}`} />
                  </div>
                );
              })}
              {filteredStudents.length === 0 && (
                <div className="p-8 text-center text-slate-450 font-bold italic text-xs border border-dashed border-slate-200 rounded-xl bg-white/20">
                  No se registran alumnos con estos criterios.
                </div>
              )}
            </div>

            {/* Expanded mutual history with the selected student */}
            <AnimatePresence>
              {selectedStudentForHistory && (() => {
                const sObj = instructorStudents.find(s => s.userId === selectedStudentForHistory);
                if (!sObj) return null;
                
                return (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border border-emerald-250/50 rounded-xl p-4 bg-emerald-50/15 backdrop-blur-sm shadow-inner space-y-3 origin-top"
                  >
                    <div className="flex justify-between items-center border-b border-emerald-100/50 pb-2">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800">EXPEDIENTE MUTUO</span>
                        <h4 className="text-xs font-black text-slate-800">{sObj.name}</h4>
                      </div>
                      <button 
                        onClick={() => setSelectedStudentForHistory('')}
                        className="text-[10px] text-red-700 font-black hover:underline"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {sObj.bookings.map((booking) => (
                        <div key={booking.bookingId} className="bg-white/80 p-2.5 rounded-lg border border-slate-200/80 flex justify-between items-center text-[11px]">
                          <div className="space-y-0.5 text-left">
                            <div className="font-extrabold text-slate-850">{booking.className}</div>
                            <div className="text-[10px] text-slate-500 font-semibold">
                              {booking.classDate} • {booking.classTime} hs
                            </div>
                          </div>

                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            booking.status === 'attended' ? 'bg-emerald-100 text-emerald-950 border border-emerald-200' :
                            booking.status === 'booked' ? 'bg-blue-105 text-blue-900 border border-blue-150' :
                            'bg-red-50 text-red-950 border border-red-150'
                          }`}>
                            {booking.status === 'attended' ? 'Asistió' :
                             booking.status === 'booked' ? 'Reservado' : 'Cancelado'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        </div>

      </div>

    </div>
  );
}
