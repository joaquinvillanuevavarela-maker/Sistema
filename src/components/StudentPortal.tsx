/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile, ClassPackage, YogaClass, Booking, PackageType, BookingStatus } from '../types';
import { yogaDatabase } from '../firebase';
import { Calendar, User, Compass, Sparkles, CheckCircle2, AlertTriangle, Clock, X, Ticket, Plus, Landmark, Lock, CalendarRange } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentPortalProps {
  user: UserProfile;
}

export interface CalendarWeek {
  id: string;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'closed' | 'active' | 'open';
  datesText: string;
}

export const CALENDAR_WEEKS: CalendarWeek[] = [
  { id: 'week_1', label: 'Semana 1', startDate: '2026-06-01', endDate: '2026-06-07', status: 'closed', datesText: '01 Jun - 07 Jun' },
  { id: 'week_2', label: 'Semana 2', startDate: '2026-06-08', endDate: '2026-06-14', status: 'active', datesText: '08 Jun - 14 Jun' },
  { id: 'week_3', label: 'Semana 3', startDate: '2026-06-15', endDate: '2026-06-21', status: 'open', datesText: '15 Jun - 21 Jun' },
  { id: 'week_4', label: 'Semana 4', startDate: '2026-06-22', endDate: '2026-06-28', status: 'open', datesText: '22 Jun - 28 Jun' },
  { id: 'week_5', label: 'Semana 5', startDate: '2026-06-29', endDate: '2026-07-05', status: 'open', datesText: '29 Jun - 05 Jul' }
];

export default function StudentPortal({ user }: StudentPortalProps) {
  const [packages, setPackages] = useState<ClassPackage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [classes, setClasses] = useState<YogaClass[]>([]);
  const [selectedDay, setSelectedDay] = useState<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado'>('Lunes');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('todos');
  const [bookingMessage, setBookingMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeWeekId, setActiveWeekId] = useState<string>('week_2');
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyTab, setHistoryTab] = useState<'reservas' | 'planes' | 'pagos'>('reservas');

  // Load patient data
  const loadData = async () => {
    try {
      const allPkgs = await yogaDatabase.getPackages();
      const studentPkgs = allPkgs.filter(p => p.studentId === user.userId);
      setPackages(studentPkgs);

      const allBookings = await yogaDatabase.getBookings();
      const studentBookings = allBookings.filter(b => b.studentId === user.userId);
      setBookings(studentBookings);

      const allDynamicClasses = await yogaDatabase.getClasses();
      setClasses(allDynamicClasses);
    } catch (err) {
      console.error("Error loading student portal data", err);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh every 5 seconds to simulate real-time updates
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Active package calculation
  const activePackage = packages.find(p => p.status === 'active' || p.status === 'expiring');
  const expiredOrDormantPackages = packages.filter(p => p.status === 'expired' || p.status === 'dormant');

  // Handle class reserving
  const handleBookClass = async (yogaClass: YogaClass) => {
    const selectedWeek = CALENDAR_WEEKS.find(w => w.id === activeWeekId) || CALENDAR_WEEKS[1];

    if (selectedWeek.status === 'closed') {
      setBookingMessage({
        text: 'Esta semana de reservas ya transcurrió y el sistema está cerrado para modificaciones.',
        type: 'error'
      });
      return;
    }

    if (!activePackage) {
      setBookingMessage({
        text: 'No tienes un paquete activo. Compra un paquete para reservar tu cupo.',
        type: 'error'
      });
      return;
    }

    if (activePackage.type !== 'unlimited' && activePackage.remainingClasses <= 0) {
      setBookingMessage({
        text: 'No te quedan clases disponibles en tu paquete actual. Considera renovarlo.',
        type: 'error'
      });
      return;
    }

    // Calculate exact date based on selected week
    const weekStart = new Date(selectedWeek.startDate + 'T00:00:00');
    const daysOffset: Record<string, number> = { 'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3, 'Viernes': 4, 'Sábado': 5 };
    const offset = daysOffset[yogaClass.dayOfWeek] || 0;
    const targetDate = new Date(weekStart.getTime() + offset * 24 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const classFormattedDate = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;

    // Verify if already booked
    const alreadyBooked = bookings.some(b => 
      b.classId === yogaClass.classId && 
      b.classDate === classFormattedDate && 
      b.status === 'booked'
    );

    if (alreadyBooked) {
      setBookingMessage({
        text: `Ya tienes una reserva activa para esta clase el día ${classFormattedDate}.`,
        type: 'error'
      });
      return;
    }

    setLoading(true);
    const newBooking: Booking = {
      bookingId: 'b_' + Math.random().toString(36).substr(2, 9),
      classId: yogaClass.classId,
      className: yogaClass.name,
      instructor: yogaClass.instructor,
      studentId: user.userId,
      studentName: user.displayName,
      studentEmail: user.email,
      classDate: classFormattedDate,
      classTime: yogaClass.time,
      status: 'booked',
      createdAt: new Date().toISOString()
    };

    try {
      await yogaDatabase.createBooking(newBooking);
      setBookingMessage({
        text: `¡Excelente! Tu reserva para ${yogaClass.name} con ${yogaClass.instructor} ha sido confirmada para el ${yogaClass.dayOfWeek} (${classFormattedDate}).`,
        type: 'success'
      });
      loadData();
    } catch (err) {
      setBookingMessage({ text: 'Error al solicitar reserva.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Cancel reservation
  const handleCancelBooking = async (bookingId: string) => {
    const booking = bookings.find(b => b.bookingId === bookingId);
    if (booking && booking.classDate < '2026-06-08') {
      setBookingMessage({
        text: 'No puedes cancelar reservas de semanas que ya transcurrieron y se cerraron.',
        type: 'error'
      });
      return;
    }

    if (window.confirm('¿Seguro que deseas cancelar esta reserva?')) {
      try {
        await yogaDatabase.updateBookingStatus(bookingId, 'cancelled');
        setBookingMessage({
          text: 'Tu reservación ha sido cancelada exitosamente.',
          type: 'success'
        });
        loadData();
      } catch (err) {
        console.error("Error cancelling booking", err);
      }
    }
  };

  // Buy package simulation
  const handleBuyPackage = async (type: PackageType) => {
    const now = new Date('2026-06-10');
    let pricePaid = 0;
    let totalClasses = 0;
    let durationDays = 30;

    if (type === '10_classes') {
      pricePaid = 45000;
      totalClasses = 10;
      durationDays = 45;
    } else if (type === '20_classes') {
      pricePaid = 80000;
      totalClasses = 20;
      durationDays = 60;
    } else {
      pricePaid = 110000;
      totalClasses = 999;
      durationDays = 30;
    }

    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const newPkg: ClassPackage = {
      packageId: 'pkg_' + Math.random().toString(36).substr(2, 9),
      studentId: user.userId,
      studentName: user.displayName,
      studentEmail: user.email,
      type,
      pricePaid,
      totalClasses,
      remainingClasses: totalClasses,
      purchaseDate: now.toISOString(),
      expiryDate: expiryDate.toISOString(),
      status: 'active'
    };

    try {
      await yogaDatabase.createPackage(newPkg);
      setShowBuyModal(false);
      setBookingMessage({
        text: `¡Compra exitosa! Has adquirido el paquete de ${type === 'unlimited' ? 'Mensualidad Ilimitada' : totalClasses + ' clases'}.`,
        type: 'success'
      });
      loadData();
    } catch (err) {
      console.error("Error creating package", err);
    }
  };

  // Filter schedule classes
  const filteredClasses = classes.filter(c => {
    if (c.dayOfWeek !== selectedDay) return false;
    if (selectedInstructor !== 'todos' && c.instructor !== selectedInstructor) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10">
      {/* Messages */}
      <AnimatePresence>
        {bookingMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl shadow-lg border flex justify-between items-center backdrop-blur-md ${
              bookingMessage.type === 'success' 
                ? 'bg-emerald-50/70 border-emerald-255 text-emerald-900' 
                : 'bg-amber-50/70 border-amber-255 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {bookingMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              )}
              <span className="text-sm font-semibold">{bookingMessage.text}</span>
            </div>
            <button 
              onClick={() => setBookingMessage(null)}
              className="p-1 hover:bg-white/45 rounded-full transition-colors text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Student Dashboard & Booking Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Personal Package & Account details */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Student Welcome & Premium Card */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#e0f0e3]/40 rounded-full -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-12 h-12 rounded-full bg-emerald-600/10 text-emerald-800 border border-white/40 flex items-center justify-center font-bold text-lg">
                {user.displayName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 px-2.5 py-0.5 rounded-full bg-[#e0f0e3]/50">
                  Alumno
                </span>
                <h3 className="font-semibold text-emerald-950 text-lg mt-0.5">{user.displayName}</h3>
                <p className="text-slate-600 text-xs">{user.email}</p>
              </div>
            </div>

            {/* Remaining classes status card */}
            {activePackage ? (
              <div className="mt-6 border-t border-white/40 pt-6 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Paquete Vigente</p>
                    <h4 className="font-bold text-emerald-900 text-base mt-0.5">
                      {activePackage.type === '10_classes' && 'Paquete 10 Clases'}
                      {activePackage.type === '21_classes' && 'Paquete 20 Clases' /* fallback fallback */}
                      {activePackage.type === '20_classes' && 'Paquete 20 Clases'}
                      {activePackage.type === 'unlimited' && 'Mensualidad Ilimitada'}
                    </h4>
                  </div>
                  <div className="text-right">
                    {activePackage.type === 'unlimited' ? (
                      <span className="text-2xl font-black text-emerald-700">∞</span>
                    ) : (
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-3xl font-black text-emerald-700">
                          {activePackage.remainingClasses}
                        </span>
                        <span className="text-slate-500 text-xs">/{activePackage.totalClasses}</span>
                      </div>
                    )}
                    <span className="text-slate-500 text-[10px] block font-semibold">Clases Disponibles</span>
                  </div>
                </div>

                {/* Progress bar */}
                {activePackage.type !== 'unlimited' && (
                  <div className="w-full bg-white/40 h-2.5 rounded-full overflow-hidden border border-white/30 backdrop-blur">
                    <div 
                      className={`h-full transition-all duration-500 rounded-full ${
                        activePackage.remainingClasses <= 2 ? 'bg-amber-500' : 'bg-emerald-650'
                      }`}
                      style={{ width: `${(activePackage.remainingClasses / activePackage.totalClasses) * 100}%` }}
                    />
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-slate-600 bg-white/20 p-2.5 rounded-xl border border-white/30 backdrop-blur">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Límite de Uso:</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {new Date(activePackage.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-6 border-t border-white/40 pt-6 text-center py-4">
                <Ticket className="w-8 h-8 text-emerald-700/40 mx-auto mb-2" />
                <p className="text-slate-700 text-xs font-semibold">No cuentas con un plan activo</p>
                <p className="text-slate-600 text-[11px] mt-1 max-w-[200px] mx-auto leading-normal">Adquiere un paquete ahora para reservar tus sesiones con un solo click.</p>
                <button
                  id="buy-pkg-trigger"
                  onClick={() => setShowBuyModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Adquirir Paquete
                </button>
              </div>
            )}

            {activePackage && (
              <div className="mt-4 pt-2">
                <button
                  onClick={() => setShowBuyModal(true)}
                  className="w-full text-center text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center justify-center gap-1"
                >
                  Adquirir otro paquete o Renovar Plan &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Student Active Reservations Panel */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm animate-fade-in">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center justify-between">
              <span>Tus Reservas de la Semana</span>
              <span className="text-[10px] bg-[#e0f0e3]/60 text-emerald-900 border border-white/50 px-2 py-0.5 rounded-full font-bold">
                {bookings.filter(b => b.status === 'booked').length} Activas
              </span>
            </h3>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {bookings.filter(b => b.status === 'booked').length > 0 ? (
                bookings
                  .filter(b => b.status === 'booked')
                  .map((booking) => (
                    <div 
                      key={booking.bookingId} 
                      className="p-3 bg-white/30 backdrop-blur-md rounded-xl border border-white/40 text-xs flex justify-between items-start"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800">{booking.className}</div>
                        <div className="text-slate-600 font-semibold">Profesor: {booking.instructor}</div>
                        <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-emerald-600" /> {booking.classDate}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-650" /> {booking.classTime}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelBooking(booking.bookingId)}
                        title="Cancelar Reserva"
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
              ) : (
                <div className="text-center p-6 bg-white/20 rounded-xl border border-dashed border-white/40">
                  <Calendar className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-slate-600 text-[11px] font-medium">No tienes reservas para esta semana.</p>
                  <p className="text-[10px] text-emerald-900/60 mt-0.5">¡Elige un horario del calendario al lado!</p>
                </div>
              )}
            </div>
            
            {/* Class History Logs */}
            {bookings.filter(b => b.status !== 'booked').length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/30">
                <h4 className="text-[11px] uppercase tracking-wider text-slate-550 font-bold mb-2">Historial Reciente (Asistidos)</h4>
                <div className="space-y-2">
                  {bookings.filter(b => b.status !== 'booked').slice(0, 3).map((hist) => (
                    <div key={hist.bookingId} className="flex justify-between items-center text-[11px] text-slate-600 font-medium">
                      <span>{hist.className} • {hist.instructor}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        hist.status === 'attended' ? 'bg-emerald-100/40 text-emerald-800 border border-emerald-500/20' : 'bg-white/20 border border-white/30 text-slate-500'
                      }`}>
                        {hist.status === 'attended' ? 'Asistió' : 'Cancelado'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tu Registro Histórico Box */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm space-y-3">
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-800" />
              Tu Registro Histórico
            </h4>
            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
              Consulta el historial completo de inscripciones, de los planes que has adquirido y tus pagos efectuados.
            </p>
            <button
              id="view-detailed-history-trigger"
              onClick={() => setShowHistoryDialog(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-800 hover:bg-teal-905 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all hover:shadow active:scale-[0.98]"
            >
              <CalendarRange className="w-4 h-4 text-emerald-250 shrink-0" />
              Ver Historial de Reservas
            </button>
          </div>

        </div>

        {/* Right Side: 30 Classes Weekly Schedule Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/40 backdrop-blur-lg rounded-2xl p-6 border border-white/50 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/20 pb-5 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-700" />
                  Reservar Clases en Tiempo Real
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Revisa los 30 horarios semanales de Valentina y reserva tu cupo instantáneamente.
                </p>
              </div>

              {/* Instructor select filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-bold">Instructor:</span>
                <select
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                  className="bg-white/50 border border-white/50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-805 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="todos">Todos los profesores</option>
                  <option value="Sofía">Sofía (Vinyasa)</option>
                  <option value="Matías">Matías (Hatha)</option>
                  <option value="Camila">Camila (Ashtanga)</option>
                  <option value="Lucas">Lucas (Yin & Medit.)</option>
                </select>
              </div>
            </div>

            {/* Calendar Weeks Selector Accordant with June 2026 */}
            <div className="mb-6 bg-slate-50/55 p-3 rounded-xl border border-slate-200/50 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
                <CalendarRange className="w-3.5 h-3.5 text-emerald-700" />
                SISTEMA DE RESERVAS POR SEMANA CALENDARIO (JUNIO 2026)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {CALENDAR_WEEKS.map((w) => {
                  const isSelected = activeWeekId === w.id;
                  const isClosed = w.status === 'closed';
                  return (
                    <button
                      key={w.id}
                      onClick={() => setActiveWeekId(w.id)}
                      className={`text-left p-2 rounded-lg border transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-800 border-emerald-900 text-white shadow-sm ring-1 ring-emerald-700'
                          : isClosed
                          ? 'bg-slate-100 border-slate-200/80 text-slate-400 opacity-70 hover:bg-slate-150'
                          : 'bg-white/70 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="text-[10.5px] font-black flex items-center justify-between gap-1 w-full">
                          <span>{w.label}</span>
                          {isClosed && <Lock className="w-2.5 h-2.5 text-red-500" />}
                        </div>
                        <div className={`text-[9px] mt-0.5 font-semibold ${isSelected ? 'text-emerald-100/90' : 'text-slate-400'}`}>
                          {w.datesText}
                        </div>
                      </div>
                      <div className="mt-1 flex justify-end">
                        <span className={`text-[8px] px-1 py-0.2 rounded font-black uppercase ${
                          isSelected ? 'bg-white/20 text-white border border-white/10' :
                          isClosed ? 'bg-red-50 text-red-700 border border-red-100' :
                          w.status === 'active' ? 'bg-emerald-50 text-emerald-950 border border-emerald-100' :
                          'bg-blue-50 text-blue-900 border border-blue-150'
                        }`}>
                          {isClosed ? 'Cerrada' : w.status === 'active' ? 'Actual' : 'Siguiente'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Closed Warning notice */}
              {CALENDAR_WEEKS.find(w => w.id === activeWeekId)?.status === 'closed' && (
                <div className="mt-2 text-[10px] font-semibold text-rose-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-rose-650 shrink-0" />
                  Semana cerrada. No se permiten reservas ni cancelaciones para periodos correspondientes a fechas pasadas.
                </div>
              )}
            </div>

            {/* Days Tab Selector */}
            <div className="flex overflow-x-auto gap-1 border-b border-white/20 pb-1 mx-[-6px] px-[6px] no-scrollbar">
              {(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const).map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 shrink-0 ${
                    selectedDay === day
                      ? 'border-emerald-650 text-emerald-900 bg-white/45 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/20'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Classes of the Selected Day */}
            <div className="mt-5 space-y-4">
              <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider mb-2">Clases programadas para el {selectedDay}</span>
              
              {filteredClasses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredClasses.map((item) => {
                    const selectedWeek = CALENDAR_WEEKS.find(w => w.id === activeWeekId) || CALENDAR_WEEKS[1];
                    const weekStart = new Date(selectedWeek.startDate + 'T00:00:00');
                    const daysOffset: Record<string, number> = { 'Lunes': 0, 'Martes': 1, 'Miércoles': 2, 'Jueves': 3, 'Viernes': 4, 'Sábado': 5 };
                    const offset = daysOffset[item.dayOfWeek] || 0;
                    const targetDate = new Date(weekStart.getTime() + offset * 24 * 60 * 60 * 1000);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const classFormattedDate = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;

                    const isAlreadyBooked = bookings.some(b => b.classId === item.classId && b.classDate === classFormattedDate && b.status === "booked");
                    return (
                      <div 
                        key={item.classId} 
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between hover:border-emerald-350 relative overflow-hidden ${
                          isAlreadyBooked 
                            ? 'border-emerald-300 bg-emerald-100/15 backdrop-blur-sm shadow-inner' 
                            : 'border-white/40 bg-white/45 backdrop-blur-md hover:bg-white/60'
                        }`}
                      >
                        {/* Instructor accent badge */}
                        <div className="absolute top-0 right-0 w-2 h-full bg-[#e0f0e3]/40 hover:bg-[#e0f0e3]" />

                        <div className="space-y-2">
                          <div className="flex justify-between items-start pr-4">
                            <div>
                              <h4 className="font-bold text-slate-850 text-sm leading-tight">{item.name}</h4>
                              <p className="text-xs text-slate-550 mt-0.5">Instructor: <span className="font-bold text-slate-750">{item.instructor}</span></p>
                            </div>
                            <span className="p-1 px-2.5 rounded-lg bg-white/50 border border-white/60 text-emerald-800 font-bold text-xs flex items-center gap-1 shrink-0">
                              <Clock className="w-3.5 h-3.5 text-emerald-700" /> {item.time}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold pt-1">
                            <span>Capacidad:</span>
                            <span className="text-slate-700">{item.capacity} alumnos max</span>
                          </div>
                        </div>

                        {/* Booking action button */}
                        <div className="mt-4 pt-3 border-t border-white/30 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-slate-500 font-semibold">Reservación instantánea</span>
                          
                          <button
                            onClick={() => handleBookClass(item)}
                            disabled={loading}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                              isAlreadyBooked 
                                ? 'bg-emerald-600/15 text-emerald-900 font-bold cursor-default border border-emerald-500/20'
                                : 'bg-emerald-800 text-white hover:bg-emerald-700 hover:shadow shadow-sm active:scale-[0.97]'
                            }`}
                          >
                            {isAlreadyBooked ? '✓ Reservado' : 'Reservar Cupo'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-8 bg-white/20 rounded-xl border border-dashed border-white/35">
                  <p className="text-slate-500 text-xs font-medium">No hay clases registradas para este filtro o profesor en {selectedDay}.</p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* COMPRAR PAQUETE DIALOG MODAL */}
      <AnimatePresence>
        {showBuyModal && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/70 backdrop-blur-xl rounded-2xl w-full max-w-lg shadow-2xl border border-white/50 p-6 sm:p-8 overflow-hidden relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-emerald-850" />
                    Paquetes de Yoga de Corazón
                  </h3>
                  <p className="text-xs text-slate-650 mt-1">
                    Selecciona el plan ideal para tu rutina de bienestar físico y mental.
                  </p>
                </div>
                <button 
                  onClick={() => setShowBuyModal(false)}
                  className="p-1 px-2 rounded-full hover:bg-white/40 transition-colors text-slate-550 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Packages Cards list */}
              <div className="space-y-4">
                
                {/* 10 classes package */}
                <div className="p-4 border border-white/45 rounded-xl hover:border-emerald-300 transition-all flex justify-between items-center bg-white/30 hover:bg-white/50 backdrop-blur">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-550 uppercase tracking-widest block">Insignia Bronce</span>
                    <h4 className="font-bold text-slate-800 text-sm">Plan 10 Clases</h4>
                    <p className="text-xs text-slate-650">Válido por 45 días consecutivos</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-slate-808">$45.000 CLP</span>
                    <button
                      onClick={() => handleBuyPackage('10_classes')}
                      className="block mt-1.5 px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm"
                    >
                      Adquirir
                    </button>
                  </div>
                </div>

                {/* 20 classes package */}
                <div className="p-4 border border-white/45 rounded-xl hover:border-emerald-400 transition-all flex justify-between items-center bg-white/30 hover:bg-white/50 backdrop-blur relative">
                  <div className="absolute top-0 right-16 -mt-2 bg-emerald-100/70 backdrop-blur text-emerald-900 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                    MÁS VENDIDO
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-widest block">Insignia Plata</span>
                    <h4 className="font-bold text-slate-800 text-sm">Plan 20 Clases</h4>
                    <p className="text-xs text-slate-650">Válido por 60 días consecutivos</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-slate-808">$80.000 CLP</span>
                    <button
                      onClick={() => handleBuyPackage('20_classes')}
                      className="block mt-1.5 px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm"
                    >
                      Adquirir
                    </button>
                  </div>
                </div>

                {/* Unlimited Monthly package */}
                <div className="p-4 border border-emerald-300/40 rounded-xl hover:border-emerald-450 transition-all flex justify-between items-center bg-[#e0f0e3]/20 hover:bg-white/50 backdrop-blur">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-purple-750 uppercase tracking-widest block">Insignia Platino</span>
                    <h4 className="font-bold text-slate-800 text-sm">Mensualidad Ilimitada</h4>
                    <p className="text-xs text-slate-650">Acceso libre todos los días por 30 días</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-slate-808">$110.000 CLP</span>
                    <button
                      onClick={() => handleBuyPackage('unlimited')}
                      className="block mt-1.5 px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm"
                    >
                      Adquirir
                    </button>
                  </div>
                </div>

              </div>

              {/* Safe payments disclaimer */}
              <div className="mt-6 flex items-center justify-center gap-2 bg-white/20 p-2.5 rounded-lg border border-white/30 text-[11px] text-slate-650 font-bold backdrop-blur">
                <Landmark className="w-3.5 h-3.5 text-slate-550" />
                <span>Simulación de pasarela de pago segura de demostración.</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAILED HISTORY LOGS MODAL DIALOG */}
      <AnimatePresence>
        {showHistoryDialog && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-2xl shadow-2xl border border-white/50 p-6 sm:p-8 overflow-hidden relative text-left flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                    <CalendarRange className="w-5.5 h-5.5 text-teal-850" />
                    Historial Completo de Alumno
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    Registros oficiales y consolidados de matrículas, asistencias y cobros para <strong className="text-slate-800 font-extrabold">{user.displayName}</strong>.
                  </p>
                </div>
                <button 
                  onClick={() => setShowHistoryDialog(false)}
                  className="p-1 px-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* TABS SELECTOR */}
              <div className="flex border-b border-slate-200 mb-6 gap-2">
                <button
                  onClick={() => setHistoryTab('reservas')}
                  className={`px-4 py-2.5 text-xs font-extrabold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                    historyTab === 'reservas'
                      ? 'border-teal-700 text-teal-900'
                      : 'border-transparent text-slate-550 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> Clases y Reservas
                </button>
                <button
                  onClick={() => setHistoryTab('planes')}
                  className={`px-4 py-2.5 text-xs font-extrabold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                    historyTab === 'planes'
                      ? 'border-teal-700 text-teal-900'
                      : 'border-transparent text-slate-550 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" /> Planes e Inscripciones
                </button>
                <button
                  onClick={() => setHistoryTab('pagos')}
                  className={`px-4 py-2.5 text-xs font-extrabold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                    historyTab === 'pagos'
                      ? 'border-teal-700 text-teal-900'
                      : 'border-transparent text-slate-550 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" /> Historial de Pagos
                </button>
              </div>

              {/* CONTAINER SCROLL CONTENT */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {/* 1. RESERVATIONS TABS */}
                {historyTab === 'reservas' && (
                  <div className="space-y-4">
                    <p className="text-slate-600 text-xs leading-relaxed font-semibold bg-[#e0f0e3]/45 p-2.5 rounded-xl border border-teal-200">
                      Te has inscrito a las siguientes clases del calendario. Aquí puedes examinar tus estados de asistencia y reservas vigentes.
                    </p>
                    {bookings.length > 0 ? (
                      <div className="space-y-2.5 pr-1">
                        {bookings.slice().reverse().map((b) => (
                          <div key={b.bookingId} className="p-3.5 bg-white border border-slate-200/80 rounded-xl flex justify-between items-center text-xs shadow-xs hover:bg-slate-50 transition-all">
                            <div className="space-y-1">
                              <h5 className="font-extrabold text-slate-850">{b.className}</h5>
                              <p className="text-[10.5px] text-slate-550 font-bold">
                                Prof: {b.instructor} • {b.classDate} • {b.classTime} hs
                              </p>
                            </div>
                            <div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                b.status === 'booked' ? 'bg-blue-105 text-blue-900 border border-blue-200' :
                                b.status === 'attended' ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' :
                                'bg-rose-100 text-rose-955 border border-rose-200'
                              }`}>
                                {b.status === 'booked' ? 'Reservado' :
                                 b.status === 'attended' ? 'Asistió' : b.status === 'cancelled' ? 'Cancelado' : b.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 font-bold italic text-xs">
                        No posees reservas anteriores registradas en el sistema.
                      </div>
                    )}
                  </div>
                )}

                {/* 2. PLANS TABS */}
                {historyTab === 'planes' && (
                  <div className="space-y-4">
                    <p className="text-slate-600 text-xs leading-relaxed font-semibold bg-[#e0f0e3]/45 p-2.5 rounded-xl border border-teal-200">
                      Registro histórico de matrículas y de planes asignados a tu cuenta de estudiante.
                    </p>
                    {packages.length > 0 ? (
                      <div className="space-y-3 pr-1">
                        {packages.slice().reverse().map((pkg) => (
                          <div key={pkg.packageId} className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-2 shadow-xs hover:bg-slate-50 transition-all">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-extrabold text-slate-850">
                                  {pkg.type === '10_classes' ? 'Plan de 10 Clases' :
                                   pkg.type === '20_classes' ? 'Plan de 20 Clases' : 'Mensualidad Ilimitada'}
                                </h5>
                                <p className="text-[10.5px] text-slate-500 font-bold">
                                  ID: {pkg.packageId} • Adquirido: {new Date(pkg.purchaseDate).toLocaleDateString()}
                                </p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                pkg.status === 'active' ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' :
                                pkg.status === 'expiring' ? 'bg-amber-100 text-amber-955 border border-amber-350' :
                                pkg.status === 'dormant' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {pkg.status === 'active' ? 'Activo' :
                                 pkg.status === 'expiring' ? 'Por Vencer' :
                                 pkg.status === 'dormant' ? 'Agotado' : 'Expirado'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50">
                              <div>
                                Clases Totales: <span className="text-slate-800 font-extrabold">{pkg.type === 'unlimited' ? '∞' : pkg.totalClasses}</span>
                              </div>
                              <div>
                                Clases Disponibles: <span className="text-teal-900 font-extrabold">{pkg.type === 'unlimited' ? '∞' : pkg.remainingClasses}</span>
                              </div>
                              <div className="col-span-2 text-slate-500">
                                Período de Validez: <span className="text-slate-700 font-semibold">{new Date(pkg.purchaseDate).toLocaleDateString()} al {new Date(pkg.expiryDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 font-bold italic text-xs">
                        No posees planes contratados registrados en el sistema.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. PAYMENTS TABS */}
                {historyTab === 'pagos' && (
                  <div className="space-y-4">
                    <p className="text-slate-600 text-xs leading-relaxed font-semibold bg-[#e0f0e3]/45 p-2.5 rounded-xl border border-teal-200">
                      Recibos de pagos aprobados en Pesos Chilenos (CLP) por concepto de renovación de planes escolares.
                    </p>
                    {packages.length > 0 ? (
                      <div className="space-y-2.5 pr-1">
                        {packages.slice().reverse().map((pkg) => {
                          const planLabel =
                            pkg.type === '10_classes' ? 'Adquisición Plan 10 Clases' :
                            pkg.type === '20_classes' ? 'Adquisición Plan 20 Clases' : 'Adquisición Mensualidad Ilimitada';
                          return (
                            <div key={pkg.packageId + '_pay'} className="p-4 bg-white border border-slate-200/80 rounded-xl flex justify-between items-center shadow-xs">
                              <div className="space-y-1">
                                <h5 className="font-extrabold text-slate-850">{planLabel}</h5>
                                <p className="text-[10.5px] text-slate-500 font-bold">
                                  Ref: {pkg.packageId.toUpperCase()} • Pago: {new Date(pkg.purchaseDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-black text-slate-900">${pkg.pricePaid.toLocaleString('es-CL')} CLP</div>
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-850 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 uppercase mt-0.5">
                                  ✓ Completado
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 font-bold italic text-xs">
                        No se reportan registros de pagos para tu cuenta.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowHistoryDialog(false)}
                  className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm"
                >
                  Cerrar Historial
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
