/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile, ClassPackage, YogaClass, Booking, PackageType, BookingStatus, PackageStatus, Expense, ExpenseCategory } from '../types';
import { yogaDatabase } from '../firebase';
import { INITIAL_CLASSES } from '../data/initialSchedule';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line, LabelList } from 'recharts';
import { 
  Users, DollarSign, Award, ThumbsUp, CheckSquare, PlusCircle, 
  Send, Clipboard, MessageCircle, Clock, Trash, RefreshCw, UserPlus, FileText, CheckCircle, X,
  Calendar, Info, Check, Ticket, Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const [packages, setPackages] = useState<ClassPackage[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Dynamic Class Schedule States
  const [classes, setClasses] = useState<YogaClass[]>([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [modalDay, setModalDay] = useState<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado'>('Lunes');
  const [modalTime, setModalTime] = useState<string>('07:00');
  const [modalInstructor, setModalInstructor] = useState<string>('Sofía');
  const [modalClassName, setModalClassName] = useState<string>('Vinyasa Flow');
  const [modalCapacity, setModalCapacity] = useState<number>(15);
  const [customClassName, setCustomClassName] = useState<string>('');

  // Manager business metrics states
  const [managerTimeSegment, setManagerTimeSegment] = useState<'weekly' | 'monthly'>('weekly');
  const [managerChartType, setManagerChartType] = useState<'bar' | 'trend'>('bar');
  const [managerSelectedTeacher, setManagerSelectedTeacher] = useState<string>('todos');
  const [managerSelectedMonth, setManagerSelectedMonth] = useState<string>('todos');

  // Dynamic Chart Interactive States (Fidelidad / Afluencia)
  const [chartSelectedInstructor, setChartSelectedInstructor] = useState<string>('todos');
  const [chartMonthFilter, setChartMonthFilter] = useState<string>('2026-06');
  const [chartWeekFilter, setChartWeekFilter] = useState<string>('todos');

  // Calendar and Schedules Month/Week and edit bypass states
  const [calMonthFilter, setCalMonthFilter] = useState<string>('2026-06');
  const [calWeekFilter, setCalWeekFilter] = useState<string>('week_2');
  const [calAllowExpiredEditing, setCalAllowExpiredEditing] = useState<boolean>(false);

  // State for adding student directly to class
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedClassForBooking, setSelectedClassForBooking] = useState<YogaClass | null>(null);
  const [selectedStudentForBookingId, setSelectedStudentForBookingId] = useState<string>('');
  const [isGeneralAdd, setIsGeneralAdd] = useState(false);

  // Tab states
  const [activeTab, setActiveTab] = useState<'calendar' | 'attendance' | 'instructors' | 'financials' | 'enroll_students'>('calendar');
  
  // Tab 1 state
  const [selectedDayTab1, setSelectedDayTab1] = useState<'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado'>('Lunes');
  const [selectedInstructorTab1, setSelectedInstructorTab1] = useState<string>('todos');

  // Tab 2 search/filter states
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceInstructorFilter, setAttendanceInstructorFilter] = useState('todos');

  // Tab 3 detailed student view state
  const [selectedDetStudentId, setSelectedDetStudentId] = useState<string | null>(null);
  const [showAdminPkgHist, setShowAdminPkgHist] = useState(false);
  const [showAdminPayHist, setShowAdminPayHist] = useState(false);
  const [showAdminAttendanceHist, setShowAdminAttendanceHist] = useState(false);
  const [financialSelectedStudent, setFinancialSelectedStudent] = useState<string>('todos');

  // Finances & Expenses management state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [financialYear, setFinancialYear] = useState<number>(2026);
  const [financialMonth, setFinancialMonth] = useState<string>('todos'); // 'todos' or '0'-'11'
  
  // Expense form state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseFormMode, setExpenseFormMode] = useState<'create' | 'edit'>('create');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseFormCategory, setExpenseFormCategory] = useState<ExpenseCategory>('generales');
  const [expenseFormAmount, setExpenseFormAmount] = useState<string>('');
  const [expenseFormDescription, setExpenseFormDescription] = useState<string>('');
  const [expenseFormDate, setExpenseFormDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Helper to get detailed student info
  const getStudentDetail = (studentId: string) => {
    const studentUser = users.find(u => u.userId === studentId);
    const studentPkgs = packages.filter(p => p.studentId === studentId);
    // Find active or expiring package first, then dormant/expired
    let currentPkg = studentPkgs.find(p => p.status === 'active' || p.status === 'expiring');
    if (!currentPkg && studentPkgs.length > 0) {
      currentPkg = studentPkgs[0];
    }
    
    const studentBookings = bookings.filter(b => b.studentId === studentId);
    const attendedCount = studentBookings.filter(b => b.status === 'attended').length;
    const bookedUpcomingCount = studentBookings.filter(b => b.status === 'booked').length;
    
    return {
      user: studentUser,
      activePackage: currentPkg,
      packagesHistory: studentPkgs,
      attendedCount,
      bookedUpcomingCount,
      attendanceHistory: studentBookings
    };
  };

  // Helper to compute weekly classes count per instructor
  const getInstructorWeeklyClassesCount = (instructor: string) => {
    return classes.filter(c => c.instructor === instructor).length;
  };
  
  // Package assignment state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [selectedPkgType, setSelectedPkgType] = useState<PackageType>('10_classes');
  const [overridePrice, setOverridePrice] = useState('45000');
  const [enrollmentDate, setEnrollmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Reminders alert template state
  const [activeReminder, setActiveReminder] = useState<{
    studentName: string;
    text: string;
    copied: boolean;
  } | null>(null);

  const loadAllData = async () => {
    try {
      const allPkgs = await yogaDatabase.getPackages();
      setPackages(allPkgs);

      const allBookings = await yogaDatabase.getBookings();
      setBookings(allBookings);

      const allUsers = await yogaDatabase.getAllUsers();
      setUsers(allUsers);

      const allWebClasses = await yogaDatabase.getClasses();
      setClasses(allWebClasses);

      const allExpenses = await yogaDatabase.getExpenses();
      setExpenses(allExpenses);
    } catch (e) {
      console.error("Error loading admin data", e);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Expense operations
  const handleOpenAddExpense = () => {
    setExpenseFormMode('create');
    setEditingExpenseId(null);
    setExpenseFormAmount('');
    setExpenseFormCategory('generales');
    setExpenseFormDescription('');
    setExpenseFormDate(new Date().toISOString().split('T')[0]);
    setShowExpenseModal(true);
  };

  const handleOpenEditExpense = (exp: Expense) => {
    setExpenseFormMode('edit');
    setEditingExpenseId(exp.expenseId);
    setExpenseFormAmount(String(exp.amount));
    setExpenseFormCategory(exp.category);
    setExpenseFormDescription(exp.description);
    setExpenseFormDate(exp.date);
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseFormAmount);
    if (!amountNum || amountNum <= 0) {
      return;
    }
    if (!expenseFormDescription.trim()) {
      return;
    }

    const expenseId = expenseFormMode === 'create' 
      ? `exp_${Date.now()}` 
      : (editingExpenseId || `exp_${Date.now()}`);

    const newExpense: Expense = {
      expenseId,
      amount: amountNum,
      category: expenseFormCategory,
      description: expenseFormDescription.trim(),
      date: expenseFormDate,
      createdAt: new Date().toISOString()
    };

    try {
      setLoading(true);
      await yogaDatabase.saveExpense(newExpense);
      await loadAllData();
      setShowExpenseModal(false);
      // Reset form
      setExpenseFormAmount('');
      setExpenseFormDescription('');
    } catch (err) {
      console.error("Error saving expense", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      setLoading(true);
      await yogaDatabase.deleteExpense(expenseId);
      await loadAllData();
    } catch (err) {
      console.error("Error deleting expense", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync package default prices
  useEffect(() => {
    if (selectedPkgType === '10_classes') {
      setOverridePrice('45000');
    } else if (selectedPkgType === '20_classes') {
      setOverridePrice('80000');
    } else {
      setOverridePrice('110000');
    }
  }, [selectedPkgType]);

  // Helper to convert USD value to Chilean Pesos if it seems to be in USD (i.e. < 1000)
  const getCLPValue = (pricePaid: number): number => {
    if (pricePaid > 1000) return pricePaid;
    if (pricePaid === 50) return 45000;
    if (pricePaid === 90) return 80000;
    if (pricePaid === 120) return 110000;
    return Math.round(pricePaid * 920);
  };

  const formatCLP = (clpValue: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(clpValue);
  };

  // ==========================================
  // METRICS CALCULATIONS
  // ==========================================

  // 1. Demand by Instructor & Time Slot (Dynamic based on Month, Week, and Instructor Filters)
  const getDemandWeeksForMonth = (monthStr: string) => {
    if (monthStr === '2026-04') {
      return [
        { id: 'week_1', label: 'Semana 1', startDate: '2026-04-01', endDate: '2026-04-07', datesText: '01-07 Abr' },
        { id: 'week_2', label: 'Semana 2', startDate: '2026-04-08', endDate: '2026-04-14', datesText: '08-14 Abr' },
        { id: 'week_3', label: 'Semana 3', startDate: '2026-04-15', endDate: '2026-04-21', datesText: '15-21 Abr' },
        { id: 'week_4', label: 'Semana 4', startDate: '2026-04-22', endDate: '2026-04-28', datesText: '22-28 Abr' },
        { id: 'week_5', label: 'Semana 5', startDate: '2026-04-29', endDate: '2026-05-05', datesText: '29 Abr-05 May' }
      ];
    }
    if (monthStr === '2026-05') {
      return [
        { id: 'week_1', label: 'Semana 1', startDate: '2026-05-01', endDate: '2026-05-07', datesText: '01-07 May' },
        { id: 'week_2', label: 'Semana 2', startDate: '2026-05-08', endDate: '2026-05-14', datesText: '08-14 May' },
        { id: 'week_3', label: 'Semana 3', startDate: '2026-05-15', endDate: '2026-05-21', datesText: '15-21 May' },
        { id: 'week_4', label: 'Semana 4', startDate: '2026-05-22', endDate: '2026-05-28', datesText: '22-28 May' },
        { id: 'week_5', label: 'Semana 5', startDate: '2026-05-29', endDate: '2026-06-04', datesText: '29 May-04 Jun' }
      ];
    }
    if (monthStr === '2026-07') {
      return [
        { id: 'week_1', label: 'Semana 1', startDate: '2026-07-01', endDate: '2026-07-07', datesText: '01-07 Jul' },
        { id: 'week_2', label: 'Semana 2', startDate: '2026-07-08', endDate: '2026-07-14', datesText: '08-14 Jul' },
        { id: 'week_3', label: 'Semana 3', startDate: '2026-07-15', endDate: '2026-07-21', datesText: '15-21 Jul' },
        { id: 'week_4', label: 'Semana 4', startDate: '2026-07-22', endDate: '2026-07-28', datesText: '22-28 Jul' },
        { id: 'week_5', label: 'Semana 5', startDate: '2026-07-29', endDate: '2026-08-04', datesText: '29 Jul-04 Ago' }
      ];
    }
    // Default to '2026-06' if todos or any other value
    return [
      { id: 'week_1', label: 'Semana 1', startDate: '2026-06-01', endDate: '2026-06-07', datesText: '01-07 Jun' },
      { id: 'week_2', label: 'Semana 2', startDate: '2026-06-08', endDate: '2026-06-14', datesText: '08-14 Jun' },
      { id: 'week_3', label: 'Semana 3', startDate: '2026-06-15', endDate: '2026-06-21', datesText: '15-21 Jun' },
      { id: 'week_4', label: 'Semana 4', startDate: '2026-06-22', endDate: '2026-06-28', datesText: '22-28 Jun' },
      { id: 'week_5', label: 'Semana 5', startDate: '2026-06-29', endDate: '2026-07-05', datesText: '29 Jun-05 Jul' }
    ];
  };

  const getDateForDayInWeek = (startDateStr: string, day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado') => {
    const dayOffsets = {
      'Lunes': 0,
      'Martes': 1,
      'Miércoles': 2,
      'Jueves': 3,
      'Viernes': 4,
      'Sábado': 5
    };
    const start = new Date(startDateStr + 'T12:00:00');
    const targetDate = new Date(start.getTime() + dayOffsets[day] * 24 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;
  };

  const isWeekExpired = (endDateStr: string) => {
    const today = new Date('2026-06-13T23:59:59'); // Based on metadata current date 2026-06-13
    const end = new Date(endDateStr + 'T23:59:59');
    return end.getTime() < today.getTime();
  };

  const CHART_CALENDAR_WEEKS = getDemandWeeksForMonth(chartMonthFilter);

  // Calendar weeks and active week selection details
  const CAL_WEEKS = getDemandWeeksForMonth(calMonthFilter);
  const activeCalWeek = CAL_WEEKS.find(w => w.id === calWeekFilter) || CAL_WEEKS[0];
  const isCalWeekPassed = isWeekExpired(activeCalWeek.endDate);
  const isCalendarLocked = isCalWeekPassed && !calAllowExpiredEditing;

  // We filter bookings for both charts depending on month and week selection
  const chartFilteredBookings = bookings.filter(b => {
    if (b.status !== 'booked' && b.status !== 'attended') return false;

    // Month Filter: can be 'todos', '2026-05', '2026-06', '2026-07'
    if (chartMonthFilter !== 'todos') {
      const monthPrefix = b.classDate ? b.classDate.substring(0, 7) : '';
      if (monthPrefix !== chartMonthFilter) return false;
    }

    // Week Filter: only applicable if a specific week is selected
    if (chartWeekFilter !== 'todos') {
      const selectedWeek = CHART_CALENDAR_WEEKS.find(w => w.id === chartWeekFilter);
      if (selectedWeek) {
        if (!b.classDate || b.classDate < selectedWeek.startDate || b.classDate > selectedWeek.endDate) {
          return false;
        }
      }
    }

    return true;
  });

  const instructorDemand: Record<string, number> = {};
  // Pre-populate with all known instructors
  ['Sofía', 'Matías', 'Camila', 'Lucas'].forEach(inst => {
    instructorDemand[inst] = 0;
  });

  chartFilteredBookings.forEach(b => {
    if (b.instructor in instructorDemand) {
      instructorDemand[b.instructor] += 1;
    } else {
      instructorDemand[b.instructor] = 1;
    }
  });

  const instructorChartData = Object.entries(instructorDemand).map(([name, count]) => ({
    name,
    Reservas: count
  }));

  const slotDemand: Record<string, number> = {};
  // Pre-populate common/recognized slots to keep the x-axis clean/ordered
  const defaultSlotsList = ['07:00', '08:30', '10:00', '12:00', '15:00', '17:30', '18:30', '19:30', '20:30'];
  defaultSlotsList.forEach(slot => {
    slotDemand[slot] = 0;
  });

  chartFilteredBookings.forEach(b => {
    // If we have selected a specific instructor, filter the slot demand to ONLY that instructor
    if (chartSelectedInstructor !== 'todos' && b.instructor !== chartSelectedInstructor) {
      return;
    }
    if (b.classTime) {
      slotDemand[b.classTime] = (slotDemand[b.classTime] || 0) + 1;
    }
  });

  const timeSlotChartData = Object.entries(slotDemand).map(([slot, count]) => ({
    slot,
    Reservas: count
  })).sort((a, b) => a.slot.localeCompare(b.slot));

  // Helper to extract the weeks dynamically for any month YYYY-MM
  const getWeeksForMonth = (monthStr: string) => {
    const active = monthStr === 'todos' ? '2026-06' : monthStr;
    if (active === '2026-04') {
      return [
        { id: 'week_1', name: 'Semana 1', startDate: '2026-04-01', endDate: '2026-04-07', datesText: '01-07 Abr' },
        { id: 'week_2', name: 'Semana 2', startDate: '2026-04-08', endDate: '2026-04-14', datesText: '08-14 Abr' },
        { id: 'week_3', name: 'Semana 3', startDate: '2026-04-15', endDate: '2026-04-21', datesText: '15-21 Abr' },
        { id: 'week_4', name: 'Semana 4', startDate: '2026-04-22', endDate: '2026-04-28', datesText: '22-28 Abr' },
        { id: 'week_5', name: 'Semana 5', startDate: '2026-04-29', endDate: '2026-05-05', datesText: '29 Abr-05 May' }
      ];
    }
    if (active === '2026-05') {
      return [
        { id: 'week_1', name: 'Semana 1', startDate: '2026-05-01', endDate: '2026-05-07', datesText: '01-07 May' },
        { id: 'week_2', name: 'Semana 2', startDate: '2026-05-08', endDate: '2026-05-14', datesText: '08-14 May' },
        { id: 'week_3', name: 'Semana 3', startDate: '2026-05-15', endDate: '2026-05-21', datesText: '15-21 May' },
        { id: 'week_4', name: 'Semana 4', startDate: '2026-05-22', endDate: '2026-05-28', datesText: '22-28 May' },
        { id: 'week_5', name: 'Semana 5', startDate: '2026-05-29', endDate: '2026-06-04', datesText: '29 May-04 Jun' }
      ];
    }
    if (active === '2026-07') {
      return [
        { id: 'week_1', name: 'Semana 1', startDate: '2026-07-01', endDate: '2026-07-07', datesText: '01-07 Jul' },
        { id: 'week_2', name: 'Semana 2', startDate: '2026-07-08', endDate: '2026-07-14', datesText: '08-14 Jul' },
        { id: 'week_3', name: 'Semana 3', startDate: '2026-07-15', endDate: '2026-07-21', datesText: '15-21 Jul' },
        { id: 'week_4', name: 'Semana 4', startDate: '2026-07-22', endDate: '2026-07-28', datesText: '22-28 Jul' },
        { id: 'week_5', name: 'Semana 5', startDate: '2026-07-29', endDate: '2026-08-04', datesText: '29 Jul-04 Ago' }
      ];
    }
    // Default to '2026-06'
    return [
      { id: 'week_1', name: 'Semana 1', startDate: '2026-06-01', endDate: '2026-06-07', datesText: '01-07 Jun' },
      { id: 'week_2', name: 'Semana 2', startDate: '2026-06-08', endDate: '2026-06-14', datesText: '08-14 Jun' },
      { id: 'week_3', name: 'Semana 3', startDate: '2026-06-15', endDate: '2026-06-21', datesText: '15-21 Jun' },
      { id: 'week_4', name: 'Semana 4', startDate: '2026-06-22', endDate: '2026-06-28', datesText: '22-28 Jun' },
      { id: 'week_5', name: 'Semana 5', startDate: '2026-06-29', endDate: '2026-07-05', datesText: '29 Jun-05 Jul' }
    ];
  };

  const selectedManagerWeeks = getWeeksForMonth(managerSelectedMonth);

  const getManagerWeekName = (dateStr: string) => {
    if (!dateStr) return 'Semana Fuera';
    const match = selectedManagerWeeks.find(w => dateStr >= w.startDate && dateStr <= w.endDate);
    return match ? match.name : 'Otra Semana';
  };

  const weeklyInstructorData = selectedManagerWeeks.map(w => ({
    name: w.name,
    dates: w.datesText,
    'Sofía': 0,
    'Matías': 0,
    'Camila': 0,
    'Lucas': 0,
    'total': 0
  }));

  // Populate base mock values if it's June, Mayo, Abril etc. so charts aren't completely blank if there are few custom bookings
  if (managerSelectedMonth === 'todos' || managerSelectedMonth === '2026-06') {
    // June 2026 initial baseline
    weeklyInstructorData[0]['Sofía'] = 3;
    weeklyInstructorData[0]['Matías'] = 2;
    weeklyInstructorData[0]['Camila'] = 1;
    weeklyInstructorData[0]['Lucas'] = 2;
    weeklyInstructorData[0]['total'] = 8;
  } else if (managerSelectedMonth === '2026-05') {
    // May 2026 initial baseline
    weeklyInstructorData[0]['Sofía'] = 3;
    weeklyInstructorData[0]['Matías'] = 4;
    weeklyInstructorData[0]['Camila'] = 2;
    weeklyInstructorData[0]['Lucas'] = 3;
    weeklyInstructorData[0]['total'] = 12;

    weeklyInstructorData[1]['Sofía'] = 4;
    weeklyInstructorData[1]['Matías'] = 5;
    weeklyInstructorData[1]['Camila'] = 3;
    weeklyInstructorData[1]['Lucas'] = 2;
    weeklyInstructorData[1]['total'] = 14;

    weeklyInstructorData[2]['Sofía'] = 3;
    weeklyInstructorData[2]['Matías'] = 4;
    weeklyInstructorData[2]['Camila'] = 4;
    weeklyInstructorData[2]['Lucas'] = 2;
    weeklyInstructorData[2]['total'] = 13;

    weeklyInstructorData[3]['Sofía'] = 4;
    weeklyInstructorData[3]['Matías'] = 5;
    weeklyInstructorData[3]['Camila'] = 3;
    weeklyInstructorData[3]['Lucas'] = 3;
    weeklyInstructorData[3]['total'] = 15;
  } else if (managerSelectedMonth === '2026-04') {
    // April 2026 initial baseline
    weeklyInstructorData[0]['Sofía'] = 2;
    weeklyInstructorData[0]['Matías'] = 3;
    weeklyInstructorData[0]['Camila'] = 2;
    weeklyInstructorData[0]['Lucas'] = 1;
    weeklyInstructorData[0]['total'] = 8;

    weeklyInstructorData[1]['Sofía'] = 2;
    weeklyInstructorData[1]['Matías'] = 3;
    weeklyInstructorData[1]['Camila'] = 3;
    weeklyInstructorData[1]['Lucas'] = 2;
    weeklyInstructorData[1]['total'] = 10;

    weeklyInstructorData[2]['Sofía'] = 2;
    weeklyInstructorData[2]['Matías'] = 3;
    weeklyInstructorData[2]['Camila'] = 2;
    weeklyInstructorData[2]['Lucas'] = 1;
    weeklyInstructorData[2]['total'] = 8;

    weeklyInstructorData[3]['Sofía'] = 2;
    weeklyInstructorData[3]['Matías'] = 3;
    weeklyInstructorData[3]['Camila'] = 3;
    weeklyInstructorData[3]['Lucas'] = 2;
    weeklyInstructorData[3]['total'] = 10;
  }

  bookings.forEach(b => {
    if (b.status === 'booked' || b.status === 'attended') {
      // Dynamic Month filtering check
      if (managerSelectedMonth !== 'todos') {
        const bMonth = b.classDate ? b.classDate.substring(0, 7) : '';
        if (bMonth !== managerSelectedMonth) return;
      }
      const weekName = getManagerWeekName(b.classDate);
      const row = weeklyInstructorData.find(w => w.name === weekName);
      if (row) {
        const inst = b.instructor;
        if (inst && inst in row) {
          row[inst as 'Sofía' | 'Matías' | 'Camila' | 'Lucas'] += 1;
        }
        row.total += 1;
      }
    }
  });

  // Calculate monthly trend records (comparing May vs June vs July)
  const monthlyInstructorDataMap: Record<string, { name: string; 'Sofía': number; 'Matías': number; 'Camila': number; 'Lucas': number; 'total': number }> = {
    '2026-04': { name: 'Abril 2026', 'Sofía': 8, 'Matías': 12, 'Camila': 10, 'Lucas': 6, 'total': 36 },
    '2026-05': { name: 'Mayo 2026', 'Sofía': 14, 'Matías': 18, 'Camila': 12, 'Lucas': 10, 'total': 54 },
    '2026-06': { name: 'Junio 2026', 'Sofía': 0, 'Matías': 0, 'Camila': 0, 'Lucas': 0, 'total': 0 },
    '2026-07': { name: 'Julio 2026', 'Sofía': 0, 'Matías': 0, 'Camila': 0, 'Lucas': 0, 'total': 0 },
  };

  bookings.forEach(b => {
    if (b.status === 'booked' || b.status === 'attended') {
      const monthPrefix = b.classDate ? b.classDate.substring(0, 7) : '2026-06';
      if (!monthlyInstructorDataMap[monthPrefix]) {
        monthlyInstructorDataMap[monthPrefix] = {
          name: monthPrefix === '2026-06' ? 'Junio 2026' : monthPrefix === '2026-07' ? 'Julio 2026' : monthPrefix,
          'Sofía': 0, 'Matías': 0, 'Camila': 0, 'Lucas': 0, 'total': 0
        };
      }
      const inst = b.instructor;
      if (inst && inst in monthlyInstructorDataMap[monthPrefix]) {
        monthlyInstructorDataMap[monthPrefix][inst as 'Sofía' | 'Matías' | 'Camila' | 'Lucas'] += 1;
      }
      monthlyInstructorDataMap[monthPrefix].total += 1;
    }
  });

  // Filter monthly charts data based on month selected (if not 'todos')
  let monthlyInstructorData = Object.values(monthlyInstructorDataMap);
  if (managerSelectedMonth !== 'todos') {
    monthlyInstructorData = monthlyInstructorData.filter(m => {
      const yearMonth = m.name === 'Abril 2026' ? '2026-04' :
                        m.name === 'Mayo 2026' ? '2026-05' :
                        m.name === 'Junio 2026' ? '2026-06' :
                        m.name === 'Julio 2026' ? '2026-07' : '';
      return yearMonth === managerSelectedMonth;
    });
  }

  // Determine top instructor and slot
  let topInstructor = 'Ninguno';
  let maxInstCount = -1;
  Object.entries(instructorDemand).forEach(([name, count]) => {
    if (count > maxInstCount) {
      maxInstCount = count;
      topInstructor = name;
    }
  });

  let topSlot = 'Ninguno';
  let maxSlotCount = -1;
  Object.entries(slotDemand).forEach(([slot, count]) => {
    if (count > maxSlotCount) {
      maxSlotCount = count;
      topSlot = slot;
    }
  });


  // 2. Client Cohorts Count (Active vs Expiring vs Dormid / Expired)
  let activeClients = 0;
  let expiringClients = 0;
  let dormantClients = 0;

  packages.forEach(p => {
    if (p.status === 'active') activeClients++;
    else if (p.status === 'expiring') expiringClients++;
    else if (p.status === 'dormant' || p.status === 'expired') dormantClients++;
  });

  const cohortData = [
    { name: 'Activos', value: activeClients, color: '#10b981' }, // emerald-500
    { name: 'Por Vencer', value: expiringClients, color: '#f59e0b' }, // amber-500
    { name: 'Dormidos/Vencidos', value: dormantClients, color: '#ef4444' } // red-500
  ];


  // 3. Financial Average Revenue Per User (Ingreso Promedio por Alumno - ARPU) in Chilean Pesos (CLP)
  const totalRevenue = packages.reduce((acc, p) => acc + getCLPValue(p.pricePaid), 0);
  
  // Calculate unique student list
  const uniqueStudents = new Set<string>();
  packages.forEach(p => uniqueStudents.add(p.studentId));
  const totalStudentsCount = uniqueStudents.size || 1; // prevent divide-by-zero
  const arpu = totalRevenue / totalStudentsCount;

  // Dynamic student financial calculations
  const selectedStudentPackages = packages.filter(p => p.studentId === financialSelectedStudent);
  const selectedStudentSum = selectedStudentPackages.reduce((acc, p) => acc + getCLPValue(p.pricePaid), 0);
  const financialDisplayValue = financialSelectedStudent === 'todos' ? arpu : selectedStudentSum;
  
  const financialDisplayTitle = financialSelectedStudent === 'todos' ? 'Ingreso por Alumno' : 'Total del Alumno';
  const financialDisplaySubtitle = financialSelectedStudent === 'todos'
    ? 'Promedio general (ARPU)'
    : `Suma de ${selectedStudentPackages.length} ${selectedStudentPackages.length === 1 ? 'plan adquirido' : 'planes adquiridos'}`;

  // FINANCIAL & EXPENSE METRICS HELPERS
  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const getMonthlyFinancials = (year: number) => {
    return MONTH_NAMES.map((name, index) => {
      // Filter packages purchased in this specific year and month
      const pkgsInMonth = packages.filter(p => {
        try {
          const d = new Date(p.purchaseDate);
          return d.getFullYear() === year && d.getMonth() === index;
        } catch {
          return false;
        }
      });
      const monthlyIncome = pkgsInMonth.reduce((acc, p) => acc + getCLPValue(p.pricePaid), 0);

      // Filter expenses registered in this specific year and month
      const expsInMonth = expenses.filter(e => {
        try {
          const d = new Date(e.date);
          return d.getFullYear() === year && d.getMonth() === index;
        } catch {
          return false;
        }
      });
      const monthlyExpense = expsInMonth.reduce((acc, e) => acc + e.amount, 0);
      const monthlyBenefit = monthlyIncome - monthlyExpense;

      return {
        monthIndex: index,
        name,
        income: monthlyIncome,
        expense: monthlyExpense,
        benefit: monthlyBenefit
      };
    });
  };

  // Get current year and next year financials
  const currentYearMonthlyData = getMonthlyFinancials(financialYear);
  const nextYearPredictedData = (() => {
    // Calculate baseline based on current active months in the selected year
    const activeMonths = currentYearMonthlyData.filter(m => m.income > 0 || m.expense > 0);
    const baselineIncome = activeMonths.length > 0 
      ? activeMonths.reduce((acc, m) => acc + m.income, 0) / activeMonths.length 
      : 300000;
    const baselineExpense = activeMonths.length > 0 
      ? activeMonths.reduce((acc, m) => acc + m.expense, 0) / activeMonths.length 
      : 150000;

    return MONTH_NAMES.map((name, index) => {
      const currentMonthData = currentYearMonthlyData[index];
      const baseInc = currentMonthData && currentMonthData.income > 0 ? currentMonthData.income : baselineIncome;
      const baseExp = currentMonthData && currentMonthData.expense > 0 ? currentMonthData.expense : baselineExpense;
      
      // Visual realistic seasonality (sin wave peak in central months)
      const seasonality = 1 + Math.sin((index - 2) * Math.PI / 6) * 0.15;
      
      // Projections: 18% revenue increase, 5% expense inflation
      const predictedIncome = Math.round(baseInc * 1.18 * seasonality);
      const predictedExpense = Math.round(baseExp * 1.05 * (seasonality * 0.4 + 0.6));
      const predictedBenefit = predictedIncome - predictedExpense;

      return {
        monthIndex: index,
        name,
        income: predictedIncome,
        expense: predictedExpense,
        benefit: predictedBenefit
      };
    });
  })();

  // Filtered metrics for current display
  let displayIncome = 0;
  let displayExpense = 0;
  let displayBenefit = 0;

  if (financialMonth === 'todos') {
    displayIncome = currentYearMonthlyData.reduce((acc, m) => acc + m.income, 0);
    displayExpense = currentYearMonthlyData.reduce((acc, m) => acc + m.expense, 0);
    displayBenefit = displayIncome - displayExpense;
  } else {
    const mIdx = parseInt(financialMonth, 10);
    const mData = currentYearMonthlyData[mIdx];
    if (mData) {
      displayIncome = mData.income;
      displayExpense = mData.expense;
      displayBenefit = mData.benefit;
    }
  }

  // 4. Students with most attendance ("alumnos que más asisten")
  const studentStats: Record<string, { name: string; email: string; attendedCount: number; bookedCount: number }> = {};
  
  bookings.forEach(b => {
    if (!studentStats[b.studentId]) {
      studentStats[b.studentId] = {
        name: b.studentName,
        email: b.studentEmail,
        attendedCount: 0,
        bookedCount: 0
      };
    }
    if (b.status === 'attended') {
      studentStats[b.studentId].attendedCount += 1;
    } else if (b.status === 'booked') {
      studentStats[b.studentId].bookedCount += 1;
    }
  });

  const topAttendingStudents = Object.values(studentStats)
    .map(s => ({
      name: s.name,
      email: s.email,
      attended: s.attendedCount,
      booked: s.bookedCount,
      total: s.attendedCount + s.bookedCount
    }))
    .sort((a, b) => b.attended - a.attended || b.total - a.total)
    .slice(0, 5);


  // ==========================================
  // MANAGEMENT OPERATIONS
  // ==========================================

  // Create & Assign package manually
  const handleAssignPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let studentId = selectedStudentId;
    let studentName = '';
    let studentEmail = '';

    if (studentId === 'new_student') {
      if (!newStudentName || !newStudentEmail) {
        alert('Por favor ingresa nombre y correo del nuevo alumno.');
        return;
      }
      studentId = 'st_u_' + Math.random().toString(36).substr(2, 9);
      studentName = newStudentName;
      studentEmail = newStudentEmail;

      // Register mock user
      await yogaDatabase.getUserProfile(studentId); // trigger standard check
      const fakeNewUser: UserProfile = {
        userId: studentId,
        displayName: studentName,
        email: studentEmail,
        role: 'student',
        createdAt: new Date().toISOString()
      };
      // For mock mode, it registers in our collections
      if (yogaDatabase.getAllUsers) {
        const cachedUsers = await yogaDatabase.getAllUsers();
        const usersMap: Record<string, UserProfile> = {};
        cachedUsers.forEach(u => {
          usersMap[u.userId] = u;
        });
        usersMap[studentId] = fakeNewUser;
        localStorage.setItem('yoga_studio_users', JSON.stringify(usersMap));
      }
    } else {
      const match = users.find(u => u.userId === studentId);
      if (match) {
        studentName = match.displayName;
        studentEmail = match.email;
      } else {
        alert('Por favor selecciona un alumno válido.');
        return;
      }
    }

    setIsAssigning(true);
    const now = new Date(enrollmentDate + 'T12:00:00');
    let totalClasses = 10;
    let durationDays = 45;

    if (selectedPkgType === '10_classes') {
      totalClasses = 10;
      durationDays = 45;
    } else if (selectedPkgType === '20_classes') {
      totalClasses = 20;
      durationDays = 60;
    } else {
      totalClasses = 999;
      durationDays = 30;
    }

    const expiryDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const newPkg: ClassPackage = {
      packageId: 'pkg_' + Math.random().toString(36).substr(2, 9),
      studentId,
      studentName,
      studentEmail,
      type: selectedPkgType,
      pricePaid: Number(overridePrice),
      totalClasses,
      remainingClasses: totalClasses,
      purchaseDate: now.toISOString(),
      expiryDate: expiryDate.toISOString(),
      status: 'active'
    };

    try {
      await yogaDatabase.createPackage(newPkg);
      alert(`¡Paquete asignado exitosamente a ${studentName}!`);
      
      // Cleanup inputs
      setSelectedStudentId('');
      setNewStudentName('');
      setNewStudentEmail('');
      loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar el paquete.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Change booking status and deduct classes automatically
  const handleMarkAttendance = async (bookingId: string, status: BookingStatus) => {
    setLoading(true);
    try {
      await yogaDatabase.updateBookingStatus(bookingId, status);
      await loadAllData();
    } catch (e) {
      console.error("Error updating status", e);
    } finally {
      setLoading(false);
    }
  };

  // Trigger copy message helper for WhatsApp
  const handleGenerateReminder = (studentName: string, pkgType: string, remaining: number, expiry: string) => {
    const d = new Date(expiry).toLocaleDateString();
    
    let planDesc = '';
    if (pkgType === '10_classes') planDesc = 'Paquete de 10 Clases';
    else if (pkgType === '20_classes') planDesc = 'Paquete de 20 Clases';
    else planDesc = 'Mensualidad Ilimitada';

    let msg = `Hola ${studentName}! Te saluda Valentina de Yoga de Corazón. 🧘✨ Te escribo para recordarte que te quedan ${remaining} clases en tu ${planDesc}, el cual vence el próximo ${d}. ¡Te esperamos en clase para continuar tu hermosa práctica! Namasté.`;
    
    if (pkgType === 'unlimited') {
      msg = `Hola ${studentName}! Te saluda Valentina de Yoga de Corazón. 🧘✨ Te escribo para recordarte que tu suscripción de Mensualidad Ilimitada renovará próximamente el día ${d}. ¡Queremos seguir acompañándote en tu camino de bienestar! Namasté.`;
    }

    setActiveReminder({
      studentName,
      text: msg,
      copied: false
    });
  };

  const copyToClipboard = () => {
    if (!activeReminder) return;
    navigator.clipboard.writeText(activeReminder.text);
    setActiveReminder({ ...activeReminder, copied: true });
    setTimeout(() => {
      setActiveReminder(prev => prev ? { ...prev, copied: false } : null);
    }, 2500);
  };

  // Operations to Create and Edit Classes
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalClassName = modalClassName === 'Otros' || modalClassName === 'Otro' ? customClassName : modalClassName;
    if (!finalClassName.trim()) {
      alert('Por favor ingresa un nombre para la clase.');
      return;
    }

    // Explicit constraint validation:
    // "que cada instructor tenga como máximo 6 clases de 1 hora y media al día"
    const instructorClassesToday = classes.filter(
      c => c.dayOfWeek === modalDay && 
      c.instructor === modalInstructor &&
      c.classId !== editingClassId
    );

    if (instructorClassesToday.length >= 6) {
      alert(`Error: El instructor/a ${modalInstructor} ya tiene asignadas el máximo permitido de 6 clases el día ${modalDay}.`);
      return;
    }

    const newClass: YogaClass = {
      classId: editingClassId || 'class_' + Math.random().toString(36).substr(2, 9),
      name: finalClassName,
      instructor: modalInstructor,
      dayOfWeek: modalDay,
      time: modalTime,
      capacity: modalCapacity
    };

    try {
      await yogaDatabase.saveClass(newClass);
      setShowClassModal(false);
      setCustomClassName('');
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error al guardar la clase.');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta clase del cronograma? Se cancelarán las reservas asociadas.')) {
      try {
        await yogaDatabase.deleteClass(classId);
        await loadAllData();
      } catch (err) {
        console.error(err);
        alert('Error al eliminar la clase.');
      }
    }
  };

  const handleOpenAddStudentModal = (yogaClass: YogaClass) => {
    setSelectedClassForBooking(yogaClass);
    setSelectedStudentForBookingId('');
    setIsGeneralAdd(false);
    setShowAddStudentModal(true);
  };

  const handleOpenGeneralAddModal = () => {
    setSelectedClassForBooking(classes[0] || null);
    setSelectedStudentForBookingId('');
    setIsGeneralAdd(true);
    setShowAddStudentModal(true);
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassForBooking) {
      alert('Por favor selecciona una clase.');
      return;
    }
    if (!selectedStudentForBookingId) {
      alert('Por favor selecciona un alumno.');
      return;
    }

    const studentUser = users.find(u => u.userId === selectedStudentForBookingId);
    if (!studentUser) {
      alert('Alumno no encontrado.');
      return;
    }

    // Verify vacancy
    const curBookings = bookings.filter(b => b.classId === selectedClassForBooking.classId && b.status === 'booked');
    if (curBookings.length >= selectedClassForBooking.capacity) {
      alert('Error: La clase ya está completa.');
      return;
    }

    // Calculate exact target date of class enrollment according to the selected week of calendars
    const calWeeks = getDemandWeeksForMonth(calMonthFilter);
    const activeWeek = calWeeks.find(w => w.id === calWeekFilter) || calWeeks[0];
    const classFormattedDate = getDateForDayInWeek(activeWeek.startDate, selectedClassForBooking.dayOfWeek);

    // Verify if already booked
    const alreadyBooked = bookings.some(b => 
      b.classId === selectedClassForBooking.classId && 
      b.studentId === studentUser.userId &&
      b.classDate === classFormattedDate && 
      b.status === 'booked'
    );

    if (alreadyBooked) {
      alert(`Este alumno ya tiene una reserva activa para esta clase el día ${classFormattedDate}.`);
      return;
    }

    const newBooking: Booking = {
      bookingId: 'b_' + Math.random().toString(36).substr(2, 9),
      classId: selectedClassForBooking.classId,
      className: selectedClassForBooking.name,
      instructor: selectedClassForBooking.instructor,
      studentId: studentUser.userId,
      studentName: studentUser.displayName || studentUser.email,
      studentEmail: studentUser.email,
      classDate: classFormattedDate,
      classTime: selectedClassForBooking.time,
      status: 'booked',
      createdAt: new Date().toISOString()
    };

    try {
      await yogaDatabase.createBooking(newBooking);
      setShowAddStudentModal(false);
      setSelectedStudentForBookingId('');
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert('Error al inscribir al alumno.');
    }
  };

  // Calculations for Tab 1, 2, 3
  const filteredBookings = bookings
    .filter(b => {
      const searchLower = attendanceSearch.toLowerCase();
      const matchesSearch = b.studentName.toLowerCase().includes(searchLower) ||
                            b.studentEmail.toLowerCase().includes(searchLower) ||
                            b.className.toLowerCase().includes(searchLower);
      const matchesInstructor = attendanceInstructorFilter === 'todos' || b.instructor === attendanceInstructorFilter;
      return matchesSearch && matchesInstructor;
    })
    .sort((a, b) => {
      if (a.classDate !== b.classDate) {
        return b.classDate.localeCompare(a.classDate);
      }
      return a.classTime.localeCompare(b.classTime);
    });

  const filteredTab1Classes = classes.filter(c => {
    const dayMatch = c.dayOfWeek === selectedDayTab1;
    const instructorMatch = selectedInstructorTab1 === 'todos' || c.instructor === selectedInstructorTab1;
    return dayMatch && instructorMatch;
  });

  const instructorsList = ['Sofía', 'Matías', 'Camila', 'Lucas'];
  const instructorStudentsAndBookings = instructorsList.map(inst => {
    const instBookings = bookings.filter(b => b.instructor === inst);
    const studentIds = Array.from(new Set(instBookings.map(b => b.studentId as string)));
    
    const mappedStudents = studentIds.map((id: string) => {
      const user = users.find(u => u.userId === id);
      const studentName = user?.displayName || instBookings.find(b => b.studentId === id)?.studentName || 'Alumno Demo';
      const studentEmail = user?.email || instBookings.find(b => b.studentId === id)?.studentEmail || '';
      return { userId: id, displayName: studentName, email: studentEmail };
    });

    return {
      instructorName: inst,
      studentsCount: mappedStudents.length,
      students: mappedStudents
    };
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 relative z-10 font-sans">
      
      {/* Header and Sync info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Panel de Gestión: Yoga de Corazón
          </h1>
          <p className="text-xs text-slate-650 mt-1 font-medium">
            Análisis de rentabilidad, calendario semanal, control automatizado de asistencia y retención de alumnos para Valentina.
          </p>
        </div>
        <button
          onClick={loadAllData}
          className="flex items-center gap-2 px-4 py-2 border border-white/60 rounded-xl bg-white/40 hover:bg-white/60 backdrop-blur text-xs font-bold text-slate-800 shadow-sm transition-all active:scale-95 animate-pulse"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-800 animate-spin" style={{ animationDuration: '3s' }} /> Sincronizar Datos
        </button>
      </div>

      {/* Elegant Nav Tabs Bar */}
      <div className="flex border-b border-gray-250/30 gap-1 overflow-x-auto no-scrollbar pb-px">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'border-emerald-600 text-emerald-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-emerald-700" />
          Calendario y Horarios
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-emerald-600 text-emerald-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-emerald-700" />
          Registro de Asistencia
        </button>
        <button
          onClick={() => setActiveTab('instructors')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'instructors'
              ? 'border-emerald-600 text-emerald-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-700" />
          Instructores y Alumnos
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'financials'
              ? 'border-emerald-600 text-emerald-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-700" />
          Métricas Financieras
        </button>
        <button
          onClick={() => setActiveTab('enroll_students')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'enroll_students'
              ? 'border-emerald-600 text-emerald-950 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserPlus className="w-4 h-4 text-emerald-700" />
          Inscripción de Alumnos
        </button>
      </div>

      {/* ========================================================== */}
      {/* TAB 1: CALENDAR & HORARIOS */}
      {/* ========================================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/20 pb-4">
              <div>
                <h3 className="font-bold text-slate-850 text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-700" />
                  Cronograma Horario de Clases Semanales
                </h3>
                <p className="text-slate-600 text-xs mt-0.5 text-left">
                  Modifica, asigna y controla el cronograma de clases. Cada instructor puede tener un máximo de 6 clases diarias de 1.5 hs en los horarios autorizados.
                </p>
              </div>

              {/* Constraint Information Tag */}
              <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl text-[11px] sm:text-xs">
                <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-emerald-950 font-bold block text-left">
                  Bloques autorizados de 1.5 horas. Capacidad y estilos editables.
                </span>
              </div>
            </div>

            {/* SISTEMA DE SEMANAS Y FILTRO DE MES (CONTROL DE BLOQUEO) */}
            <div className="bg-slate-105/90 border border-slate-200/60 p-4 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-left shadow-xs">
              <div className="flex flex-wrap items-center gap-4">
                {/* Month filter */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Mes de Planificación</span>
                  <select
                    value={calMonthFilter}
                    onChange={(e) => {
                      setCalMonthFilter(e.target.value);
                      setCalWeekFilter('week_1'); // reset to week_1 on month change
                    }}
                    className="bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[150px] shadow-sm"
                  >
                    <option value="2026-04">Abril 2026</option>
                    <option value="2026-05">Mayo 2026</option>
                    <option value="2026-06">Junio 2026</option>
                    <option value="2026-07">Julio 2026</option>
                  </select>
                </div>

                {/* Week filter */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Semana de Planificación</span>
                  <select
                    value={calWeekFilter}
                    onChange={(e) => setCalWeekFilter(e.target.value)}
                    className="bg-white border border-slate-250 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-w-[180px] shadow-sm"
                  >
                    {CAL_WEEKS.map(w => (
                      <option key={w.id} value={w.id}>{w.label} ({w.datesText})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lock Status & Edit Override Switch */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/70 p-3 rounded-xl border border-white/80 shadow-xs">
                <div className="flex items-center gap-2">
                  {isCalWeekPassed ? (
                    <div className="p-1 px-2.5 rounded-full bg-red-100 border border-red-200 text-red-905 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse block" />
                      <span>🔒 Semana Bloqueada</span>
                    </div>
                  ) : (
                    <div className="p-1 px-2.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 block animate-pulse" style={{ animationDuration: '3s' }} />
                      <span>✅ Semana Disponible</span>
                    </div>
                  )}
                </div>

                {isCalWeekPassed && (
                  <label className="flex items-center gap-2 cursor-pointer select-none border-l border-slate-200 pl-4">
                    <input
                      type="checkbox"
                      checked={calAllowExpiredEditing}
                      onChange={(e) => setCalAllowExpiredEditing(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <div className="text-left">
                      <span className="text-[11px] font-extrabold text-slate-800 block leading-tight">Permitir Edición</span>
                      <span className="text-[9px] text-slate-500 font-bold block leading-none">Desbloquear semana</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Days Tabs selector */}
            <div className="flex flex-wrap gap-1 p-1 bg-white/20 backdrop-blur rounded-xl border border-white/40">
              {(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const).map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDayTab1(day)}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all text-center ${
                    selectedDayTab1 === day
                      ? 'bg-emerald-700 text-white font-black shadow'
                      : 'text-slate-700 hover:bg-white/30'
                  }`}
                  style={{
                    backgroundColor: selectedDayTab1 === day ? '#047857' : undefined,
                    color: selectedDayTab1 === day ? '#ffffff' : undefined,
                  }}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Visual Schedule Grid Table */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider text-left">
                  Grilla Horaria Visual — {selectedDayTab1}
                </h4>
                <span className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full font-black border border-emerald-150 inline-block w-fit">
                  Bloques de Clase de 1 Hora y Media (1h 30m)
                </span>
              </div>

              {/* Table wrapper with elegant horizontal scroll and glass aesthetic */}
              <div className="overflow-x-auto rounded-xl border border-white/50 shadow-sm bg-white/25 backdrop-blur-md">
                <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                  <thead>
                    <tr className="border-b border-gray-250/30 bg-slate-100/50 text-slate-600">
                      <th className="py-4 px-4 font-black text-[11px] uppercase tracking-wider text-slate-500 w-[140px] text-center">Horario</th>
                      {['Sofía', 'Matías', 'Camila', 'Lucas'].map((instructor) => {
                        const countToday = classes.filter(
                          c => c.dayOfWeek === selectedDayTab1 && c.instructor === instructor
                        ).length;
                        
                        return (
                          <th key={instructor} className="py-4 px-3 text-center border-l border-white/20">
                            <div className="font-extrabold text-slate-850 text-sm">{instructor}</div>
                            <div className="text-[10px] font-bold text-slate-500 mt-1 flex items-center justify-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${countToday >= 6 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                              {countToday} de 6 clases asignadas
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {['07:00', '09:00', '11:00', '13:00', '16:30', '18:30'].map((slot, sIdx) => {
                      let endTime = "";
                      if (slot === "07:00") endTime = "08:30";
                      else if (slot === "09:00") endTime = "10:30";
                      else if (slot === "11:00") endTime = "12:30";
                      else if (slot === "13:00") endTime = "14:30";
                      else if (slot === "16:30") endTime = "18:00";
                      else if (slot === "18:30") endTime = "20:00";

                      return (
                        <tr 
                          key={slot} 
                          className={`border-b border-gray-250/20 ${sIdx % 2 === 0 ? 'bg-white/10' : 'bg-transparent'}`}
                        >
                          {/* Time Slot column */}
                          <td className="py-6 px-3 text-center bg-slate-50/30 align-middle">
                            <span className="inline-block text-xs font-black text-emerald-950 bg-emerald-100/70 border border-emerald-250 rounded-lg px-2.5 py-1">
                              {slot} - {endTime}
                            </span>
                            <div className="text-[9px] text-slate-450 font-extrabold mt-1 uppercase tracking-wider">
                              1.5 Horas
                            </div>
                          </td>

                          {/* 4 Instructor columns */}
                          {['Sofía', 'Matías', 'Camila', 'Lucas'].map((instructor) => {
                            const matchingClass = classes.find(
                              c => c.dayOfWeek === selectedDayTab1 && c.time === slot && c.instructor === instructor
                            );

                            if (matchingClass) {
                              const slotDate = getDateForDayInWeek(activeCalWeek.startDate, selectedDayTab1);
                              const curClassBookings = bookings.filter(
                                b => b.classId === matchingClass.classId && b.classDate === slotDate && b.status === 'booked'
                              );
                              const enrolledCount = curClassBookings.length;
                              const isFull = enrolledCount >= matchingClass.capacity;

                              return (
                                <td key={instructor} className="py-3 px-3 border-l border-gray-200/20 align-top">
                                  <div className="bg-white/90 border border-white p-3.5 rounded-xl shadow-sm space-y-3 text-left h-full transition-all hover:shadow hover:bg-white flex flex-col justify-between">
                                    
                                    <div className="space-y-1.5">
                                      {/* Header class info & control buttons */}
                                      <div className="flex justify-between items-start gap-1">
                                        <h5 className="font-extrabold text-xs text-slate-850 leading-tight">
                                          {matchingClass.name}
                                        </h5>
                                        
                                        <div className="flex gap-1 shrink-0">
                                          <button
                                            onClick={() => {
                                              if (isCalendarLocked) {
                                                alert('Esta semana está bloqueada para edición.');
                                                return;
                                              }
                                              setModalMode('edit');
                                              setEditingClassId(matchingClass.classId);
                                              setModalDay(matchingClass.dayOfWeek);
                                              setModalTime(matchingClass.time);
                                              setModalInstructor(matchingClass.instructor);
                                              setModalClassName(matchingClass.name);
                                              setModalCapacity(matchingClass.capacity);
                                              setShowClassModal(true);
                                            }}
                                            disabled={isCalendarLocked}
                                            title={isCalendarLocked ? "Semana bloqueada para edición" : "Editar clase"}
                                            className={`p-1 rounded text-slate-600 hover:text-slate-800 transition-colors ${
                                              isCalendarLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100'
                                            }`}
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (isCalendarLocked) {
                                                alert('Esta semana está bloqueada para edición.');
                                                return;
                                              }
                                              handleDeleteClass(matchingClass.classId);
                                            }}
                                            disabled={isCalendarLocked}
                                            title={isCalendarLocked ? "Semana bloqueada para edición" : "Eliminar clase"}
                                            className={`p-1 rounded text-slate-450 hover:text-red-700 transition-colors ${
                                              isCalendarLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-red-50'
                                            }`}
                                          >
                                            <Trash className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Capacity Display */}
                                      <div className="flex items-center justify-between text-[10px] font-bold">
                                        <span className="text-slate-500">Capacidad:</span>
                                        <span className={`px-1.5 py-0.5 rounded font-black ${
                                          isFull
                                            ? 'bg-red-100 text-red-800'
                                            : enrolledCount > matchingClass.capacity * 0.7
                                              ? 'bg-amber-100 text-amber-900'
                                              : 'bg-emerald-50 text-emerald-800'
                                        }`}>
                                          {enrolledCount} / {matchingClass.capacity} alumnos
                                        </span>
                                      </div>
                                    </div>

                                    {/* Registered Students Names display - Horizontal layout as student cards as explicitly requested */}
                                    <div className="pt-2 border-t border-slate-100 space-y-1">
                                      <div className="flex justify-between items-center gap-1 pb-1">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-450 block">
                                          Alumnos ({enrolledCount}):
                                        </span>
                                        {!isFull && (
                                          <button
                                            onClick={() => {
                                              if (isCalendarLocked) {
                                                alert('Esta semana está bloqueada para inscripciones.');
                                                return;
                                              }
                                              handleOpenAddStudentModal(matchingClass);
                                            }}
                                            disabled={isCalendarLocked}
                                            className={`text-[10px] font-extrabold flex items-center gap-0.5 ${
                                              isCalendarLocked 
                                                ? 'text-slate-400 cursor-not-allowed opacity-50' 
                                                : 'text-emerald-700 hover:text-emerald-950 font-extrabold'
                                            }`}
                                            title={isCalendarLocked ? "Semana bloqueada" : "Inscribir Alumno"}
                                          >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            <span>Inscribir</span>
                                          </button>
                                        )}
                                      </div>
                                      {enrolledCount > 0 ? (
                                        <div className="space-y-1 max-h-[80px] overflow-y-auto no-scrollbar scroll-smooth">
                                          {curClassBookings.map((b) => (
                                            <div 
                                              key={b.bookingId} 
                                              className="flex items-center justify-between gap-1.5 p-1 bg-emerald-50/50 border border-emerald-100 rounded text-[10px] font-bold text-slate-700"
                                            >
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 block shrink-0" />
                                                <span className="truncate block" title={b.studentName}>{b.studentName}</span>
                                              </div>
                                              <button
                                                onClick={async () => {
                                                  if (isCalendarLocked) {
                                                    alert('Esta semana está bloqueada para modificaciones.');
                                                    return;
                                                  }
                                                  if (window.confirm(`¿Seguro que deseas remover a ${b.studentName} de esta clase?`)) {
                                                    try {
                                                      await yogaDatabase.updateBookingStatus(b.bookingId, 'cancelled');
                                                      await loadAllData();
                                                    } catch (err) {
                                                      console.error(err);
                                                      alert('Error al remover alumno.');
                                                    }
                                                  }
                                                }}
                                                disabled={isCalendarLocked}
                                                className={`p-0.5 shrink-0 transition-colors ${
                                                  isCalendarLocked ? 'text-slate-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700'
                                                }`}
                                                title={isCalendarLocked ? "Semana bloqueada" : "Remover de la clase"}
                                              >
                                                <X className="w-3px h-3px" />
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-bold block italic uppercase tracking-wide">
                                          Sin alumnos aún
                                        </span>
                                      )}
                                    </div>

                                  </div>
                                </td>
                              );
                            }

                            // Empty class slot placeholder
                            return (
                              <td key={instructor} className="py-3 px-3 border-l border-gray-200/20 align-middle">
                                <div className="border border-dashed border-slate-200 hover:border-emerald-500 hover:bg-white/45 rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px] transition-all duration-300">
                                  <button
                                    onClick={() => {
                                      if (isCalendarLocked) {
                                        alert('Esta semana está bloqueada para adición de clases.');
                                        return;
                                      }
                                      setModalMode('create');
                                      setEditingClassId(null);
                                      setModalDay(selectedDayTab1);
                                      setModalTime(slot);
                                      setModalInstructor(instructor);
                                      setModalClassName('Vinyasa Flow');
                                      setModalCapacity(15);
                                      setCustomClassName('');
                                      setShowClassModal(true);
                                    }}
                                    disabled={isCalendarLocked}
                                    className={`px-3 py-1.5 border rounded-lg transition-all flex items-center justify-center hover:scale-105 shadow-sm font-bold text-[10px] ${
                                      isCalendarLocked
                                        ? 'border-slate-150 bg-slate-100/50 text-slate-400 cursor-not-allowed'
                                        : 'border-slate-200 hover:border-emerald-500 bg-white/90 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700'
                                    }`}
                                  >
                                    <PlusCircle className="w-3.5 h-3.5 text-emerald-800 mr-1.5 shrink-0" />
                                    ASIGNAR CLASE
                                  </button>
                                  <span className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-tight">
                                    {isCalendarLocked ? 'Semana Bloqueada' : 'Disponible'}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Instructor Class totals summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/20">
              {['Sofía', 'Matías', 'Camila', 'Lucas'].map((instructor) => {
                const dayClasses = classes.filter(
                  c => c.dayOfWeek === selectedDayTab1 && c.instructor === instructor
                );
                const isLimit = dayClasses.length >= 6;

                return (
                  <div 
                    key={instructor}
                    className="p-3 bg-white/25 backdrop-blur border border-white/50 rounded-xl text-left flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-extrabold text-slate-800">{instructor}</div>
                      <div className="text-[9px] font-black text-slate-450 uppercase mt-0.5">
                        Asignación {selectedDayTab1}:
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                        isLimit
                          ? 'bg-red-100 text-red-900 border border-red-200'
                          : dayClasses.length > 4
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-150 text-emerald-950 border border-emerald-250'
                      }`}>
                        {dayClasses.length} / 6 clases
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 2: REGISTRO DE ASISTENCIA */}
      {/* ========================================================== */}
      {activeTab === 'attendance' && (
        <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/20 pb-4">
            <div>
              <h3 className="font-bold text-slate-850 text-base flex items-center gap-2 text-left">
                <CheckSquare className="w-5 h-5 text-emerald-700 animate-bounce" style={{ animationDuration: '4s' }} />
                Registro y Control de Asistencia a Clases
              </h3>
              <p className="text-slate-600 text-xs mt-0.5 text-left">
                Simula y marca asistencias. Las clases asistidas descontarán automáticamente 1 clase del paquete del alumno.
              </p>
            </div>

            {/* Attendance Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto">
              <input
                type="text"
                placeholder="Buscar alumno o clase..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                className="bg-white/60 border border-white/60 rounded-lg p-2 font-bold text-slate-800 placeholder-slate-500 focus:outline-none text-xs w-full sm:w-48 shadow-inner"
              />
              <select
                value={attendanceInstructorFilter}
                onChange={(e) => setAttendanceInstructorFilter(e.target.value)}
                className="bg-white/60 border border-white/60 rounded-lg p-2 font-extrabold text-slate-800 focus:outline-none text-xs"
              >
                <option value="todos">Todos los Instructores</option>
                <option value="Sofía">Sofía</option>
                <option value="Matías">Matías</option>
                <option value="Camila">Camila</option>
                <option value="Lucas">Lucas</option>
              </select>
              <button
                onClick={handleOpenGeneralAddModal}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black flex items-center gap-1.5 rounded-lg shadow-sm transition-all active:scale-95 text-xs w-full sm:w-auto justify-center"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Inscribir Alumno</span>
              </button>
            </div>
          </div>

          {/* Bookings table */}
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/20 text-slate-500 font-bold bg-white/20">
                  <th className="py-3 px-3">Cliente / Alumno</th>
                  <th className="py-3 px-3">Clase Reservada</th>
                  <th className="py-3 px-3">Con qué Instructor</th>
                  <th className="py-3 px-3">Fecha y Horario</th>
                  <th className="py-3 px-3">Estado actual</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => {
                    return (
                      <tr key={booking.bookingId} className="border-b border-white/10 hover:bg-white/20 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-slate-850 text-left">{booking.studentName}</div>
                          <div className="text-[10px] text-slate-600 font-semibold text-left">{booking.studentEmail}</div>
                        </td>
                        <td className="py-3.5 px-3 text-left">
                          <span className="font-extrabold text-slate-750">{booking.className}</span>
                        </td>
                        <td className="py-3.5 px-3 text-left">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-950 border border-purple-200 rounded-md text-[10px] font-black">
                            <span className="w-1.5 h-1.5 bg-purple-600 rounded-full shrink-0" />
                            {booking.instructor}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-left">
                          <div className="font-bold text-slate-600">{booking.classDate}</div>
                          <div className="text-[10px] text-emerald-800 font-bold">{booking.classTime} hs</div>
                        </td>
                        <td className="py-3.5 px-3 text-left">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                            booking.status === 'booked' ? 'bg-blue-100/50 text-blue-900 border border-blue-200' :
                            booking.status === 'attended' ? 'bg-emerald-100/50 text-emerald-950 border border-emerald-300' : 
                            'bg-red-100/50 text-red-955 border border-red-200'
                          }`}>
                            {booking.status === 'booked' ? 'Reservado' :
                             booking.status === 'attended' ? 'Asistió (Debitado)' : 'Cancelado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex justify-end items-center gap-2">
                            {booking.status === 'booked' ? (
                              <div className="flex justify-end gap-2 shrink-0">
                                <button
                                  onClick={() => handleMarkAttendance(booking.bookingId, 'attended')}
                                  className="w-8 h-8 flex items-center justify-center bg-emerald-100 hover:bg-emerald-600 text-emerald-850 hover:text-white rounded-full shadow-sm transition-all active:scale-90"
                                  title="Confirmar Asistencia (Ticket)"
                                >
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </button>
                                <button
                                  onClick={() => handleMarkAttendance(booking.bookingId, 'cancelled')}
                                  className="w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-600 text-red-850 hover:text-white rounded-full shadow-sm transition-all active:scale-90"
                                  title="Marcar Falta / Cancelar (Equis)"
                                >
                                  <X className="w-4 h-4 stroke-[3]" />
                                </button>
                              </div>
                            ) : booking.status === 'attended' ? (
                              <div className="flex justify-end items-center gap-1.5 text-emerald-700 font-extrabold pr-2" title="Asistencia Confirmada">
                                <span className="bg-emerald-100 p-1.5 rounded-full flex items-center justify-center text-emerald-700">
                                  <Check className="w-4 h-4 stroke-[3.5]" />
                                </span>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold">Asistió</span>
                              </div>
                            ) : (
                              <div className="flex justify-end items-center gap-1.5 text-red-600 font-extrabold pr-2" title="Clase Cancelada">
                                <span className="bg-red-100 p-1.5 rounded-full flex items-center justify-center text-red-600">
                                  <X className="w-4 h-4 stroke-[3.5]" />
                                </span>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold">Falta</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-550 font-semibold text-xs leading-relaxed">
                      No hay reservaciones que correspondan a su búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 3: INSTRUCTORES Y ALUMNOS */}
      {/* ========================================================== */}
      {activeTab === 'instructors' && (
        <div className="space-y-6">
          <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-sm space-y-6">
            <div className="text-left">
              <h3 className="font-bold text-slate-850 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-700" />
                Cartera de Alumnos por Profesor
              </h3>
              <p className="text-slate-600 text-xs mt-0.5">
                Selecciona a cualquier alumno para abrir su ficha personal e inspeccionar planes, clases pendientes, status de cobros y asistencias.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {instructorStudentsAndBookings.map((instObj) => {
                return (
                  <div 
                    key={instObj.instructorName}
                    className="bg-white/60 backdrop-blur-md border border-white/40 hover:border-white/60 rounded-2xl p-5 space-y-4 shadow-sm transition-all text-left"
                  >
                    {/* Instructor header row */}
                    <div className="flex justify-between items-center border-b border-white/20 pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-800 text-white font-extrabold rounded-xl flex items-center justify-center text-sm shadow-sm ring-2 ring-emerald-100">
                          {instObj.instructorName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-850 text-sm">Profesor/a: {instObj.instructorName}</h4>
                          <p className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 inline-block mt-0.5">
                            {instObj.instructorName === 'Sofía' && 'Vinyasa Flow'}
                            {instObj.instructorName === 'Matías' && 'Hatha Tradicional'}
                            {instObj.instructorName === 'Camila' && 'Ashtanga'}
                            {instObj.instructorName === 'Lucas' && 'Yin & Sonidos'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block bg-emerald-50 text-emerald-950 px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm leading-tight">
                          {instObj.studentsCount} alumnos
                        </span>
                      </div>
                    </div>

                    {/* Students list */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {instObj.students.length > 0 ? (
                        instObj.students.map((student) => {
                          const detail = getStudentDetail(student.userId);
                          const userPkg = detail.activePackage;
                          
                          return (
                            <div 
                              key={student.userId}
                              className="flex items-center justify-between p-2.5 bg-white/45 border border-white/50 rounded-xl hover:bg-white/70 transition-all shadow-sm"
                            >
                              <div className="space-y-0.5">
                                <div className="font-extrabold text-slate-900 text-xs">{student.displayName}</div>
                                <div className="text-[9.5px] text-slate-600 font-medium">{student.email}</div>
                                {userPkg && (
                                  <div className="pt-0.5 flex gap-1.5 items-center">
                                    <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-md ${
                                      userPkg.status === 'active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                      userPkg.status === 'expiring' ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                                      'bg-red-50 text-red-850 border border-red-100'
                                    }`}>
                                      {userPkg.status === 'active' ? 'Activo' : userPkg.status === 'expiring' ? 'Por Vencer' : 'Vencido'}
                                    </span>
                                    <span className="text-[9px] text-slate-550 font-extrabold">
                                      {userPkg.type === 'unlimited' ? 'Plan Ilimitado' : `${userPkg.remainingClasses} clases restantes`}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <button
                                onClick={() => setSelectedDetStudentId(student.userId)}
                                className="px-2.5 py-1 text-emerald-950 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200/50 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 active:scale-95 shadow-sm"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                                Expediente
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center text-slate-500 font-semibold text-xs italic">
                          No posee estudiantes asociados en el historial de reservas aún.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FLOATING DETAILED STUDENT RECORD MODAL DIALOG */}
          <AnimatePresence>
            {selectedDetStudentId && (() => {
              const studentRecord = getStudentDetail(selectedDetStudentId);
              if (!studentRecord) return null;
              
              const { user, activePackage, packagesHistory, attendedCount, bookedUpcomingCount, attendanceHistory } = studentRecord;
              const studentName = user?.displayName || packagesHistory[0]?.studentName || 'Alumno';
              const studentEmail = user?.email || packagesHistory[0]?.studentEmail || '';

              return (
                <div className="fixed inset-0 bg-slate-900/45 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white/90 backdrop-blur-xl rounded-2xl w-full max-w-lg shadow-2xl p-6 border border-white/50 space-y-5 max-h-[90vh] overflow-y-auto text-left"
                  >
                    {/* Header row */}
                    <div className="flex justify-between items-center border-b border-white/20 pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-emerald-800 text-white rounded-2xl flex items-center justify-center font-black text-sm ring-4 ring-emerald-50 shadow-inner">
                          {studentName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-base">Ficha de Información Personal</h3>
                          <p className="text-[11px] text-slate-600 font-semibold">{studentEmail}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedDetStudentId(null)}
                        className="p-1 text-slate-550 hover:text-slate-850 hover:bg-white/40 rounded-lg transition-colors border border-white/20"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Primary Plan details cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Plan status panel */}
                      <div className="p-4 bg-white/40 border border-white/50 rounded-xl space-y-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Estado del Plan</span>
                        
                        {activePackage ? (
                          <div className="space-y-1.5">
                            <div className="font-extrabold text-slate-850 text-sm">
                              {activePackage.type === '10_classes' && 'Paquete de 10 Clases'}
                              {activePackage.type === '20_classes' && 'Paquete de 20 Clases'}
                              {activePackage.type === 'unlimited' && 'Suscripción Ilimitada'}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                activePackage.status === 'active' ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' :
                                activePackage.status === 'expiring' ? 'bg-amber-100 text-amber-955 border border-amber-350' : 
                                'bg-red-100 text-red-955 border border-red-200'
                              }`}>
                                {activePackage.status === 'active' ? 'Activo' :
                                 activePackage.status === 'expiring' ? 'Por Vencer' :
                                 activePackage.status === 'dormant' ? 'Dormido' : 'Vencido'}
                              </span>
                              
                              <span className="text-[10px] font-bold text-slate-550">
                                Vence: {new Date(activePackage.expiryDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-red-900 bg-red-50/50 p-2 border border-red-100 rounded-lg font-bold inline-block italic">
                            Sin plan activo asignado actualmente.
                          </div>
                        )}
                      </div>

                      {/* Class balances summaries */}
                      <div className="p-4 bg-white/40 border border-white/50 rounded-xl space-y-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Resumen de Clases</span>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold leading-relaxed">
                          <div className="bg-white/40 p-2 rounded-lg text-center border border-white/40">
                            <div className="text-slate-550 text-[10px]">Puntualidad total</div>
                            <div className="text-lg font-black text-emerald-950 mt-0.5">{attendedCount} asistencias</div>
                            <div className="text-[9px] text-slate-500 font-medium">clases realizadas</div>
                          </div>

                          <div className="bg-white/40 p-2 rounded-lg text-center border border-white/40">
                            <div className="text-slate-550 text-[10px]">Clases Pendientes</div>
                            <div className="text-base font-black text-slate-900 mt-1">
                              {activePackage ? (
                                activePackage.type === 'unlimited' ? 'Cupo Ilimitado' : `${activePackage.remainingClasses} clases`
                              ) : '0 clases'}
                            </div>
                            <div className="text-[9px] text-slate-500 font-medium">saldo actual</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Attendance/reservations history logs */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setShowAdminAttendanceHist(!showAdminAttendanceHist)}
                        className="w-full flex justify-between items-center px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-800" />
                          Historial Completo de Reservas de Clases ({attendanceHistory.length})
                        </span>
                        <span className="text-slate-400 font-extrabold text-[10px]">
                          {showAdminAttendanceHist ? 'Contraer ▲' : 'Desplegar ▼'}
                        </span>
                      </button>

                      {showAdminAttendanceHist && (
                        <div className="border border-slate-200 bg-white/50 rounded-xl overflow-hidden mt-1.5 last:border-0">
                          <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-100">
                            {attendanceHistory.length > 0 ? (
                              attendanceHistory.slice().reverse().map((bh) => {
                                return (
                                  <div 
                                    key={bh.bookingId} 
                                    className="p-3 flex justify-between items-center text-xs hover:bg-white/40 transition-colors"
                                  >
                                    <div className="space-y-1">
                                      <div className="font-extrabold text-slate-800">{bh.className}</div>
                                      <div className="text-[10.5px] text-slate-500 font-medium flex flex-wrap items-center gap-1.5">
                                        <span>Prof: <span className="text-slate-700 font-bold">{bh.instructor}</span></span>
                                        <span className="text-slate-300">•</span>
                                        <span>{bh.classDate} • {bh.classTime} hs</span>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                        bh.status === 'booked' ? 'bg-blue-50 text-blue-805 border border-blue-100' :
                                        bh.status === 'attended' ? 'bg-emerald-50 text-emerald-805 border border-emerald-100' : 
                                        'bg-rose-50 text-rose-805 border border-rose-100'
                                      }`}>
                                        {bh.status === 'booked' ? 'Reservado' :
                                         bh.status === 'attended' ? 'Asistió' : 'Cancelado'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-8 text-center text-slate-450 font-bold italic text-xs bg-white/30">
                                Este alumno no registra reservas históricas en el sistema.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Collapsible: Plan history */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setShowAdminPkgHist(!showAdminPkgHist)}
                        className="w-full flex justify-between items-center px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-emerald-800" />
                          Historial Completo de Inscripciones ({packagesHistory.length})
                        </span>
                        <span className="text-slate-400 font-extrabold text-[10px]">
                          {showAdminPkgHist ? 'Contraer ▲' : 'Desplegar ▼'}
                        </span>
                      </button>

                      {showAdminPkgHist && (
                        <div className="p-3 bg-white/50 border border-slate-200 rounded-xl space-y-2 mt-1.5 max-h-[180px] overflow-y-auto">
                          {packagesHistory.length > 0 ? (
                            packagesHistory.slice().reverse().map((pkg) => (
                              <div key={pkg.packageId} className="p-2 border-b border-slate-100 last:border-0 flex justify-between items-center text-xs">
                                <div>
                                  <div className="font-extrabold text-slate-805">
                                    {pkg.type === '10_classes' ? 'Plan de 10 Clases' :
                                     pkg.type === '20_classes' ? 'Plan de 20 Clases' : 'Suscripción Ilimitada'}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-semibold">
                                    Adquirido: {new Date(pkg.purchaseDate).toLocaleDateString()} • Expira: {new Date(pkg.expiryDate).toLocaleDateString()}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                                    pkg.status === 'active' ? 'bg-emerald-50 text-emerald-850 border border-emerald-100' :
                                    pkg.status === 'expiring' ? 'bg-amber-50 text-amber-850 border border-amber-100' :
                                    pkg.status === 'dormant' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                                    'bg-slate-100 text-slate-600 border border-slate-200'
                                  }`}>
                                    {pkg.status === 'active' ? 'Activo' :
                                     pkg.status === 'expiring' ? 'Por Vencer' :
                                     pkg.status === 'dormant' ? 'Agotado' : 'Expirado'}
                                  </span>
                                  <div className="text-[9px] text-slate-550 font-semibold mt-0.5">
                                    Clases: {pkg.type === 'unlimited' ? '∞' : `${pkg.remainingClasses}/${pkg.totalClasses}`}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-xs text-slate-400 italic font-bold">
                              No posee inscripciones pasadas.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Collapsible: Payment history */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setShowAdminPayHist(!showAdminPayHist)}
                        className="w-full flex justify-between items-center px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold text-slate-705 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-emerald-800" />
                          Historial de Pagos Efectuados ({packagesHistory.length})
                        </span>
                        <span className="text-slate-400 font-extrabold text-[10px]">
                          {showAdminPayHist ? 'Contraer ▲' : 'Desplegar ▼'}
                        </span>
                      </button>

                      {showAdminPayHist && (
                        <div className="p-3 bg-white/50 border border-slate-200 rounded-xl space-y-2 mt-1.5 max-h-[180px] overflow-y-auto">
                          {packagesHistory.length > 0 ? (
                            packagesHistory.slice().reverse().map((pkg) => {
                              const clpVal = getCLPValue(pkg.pricePaid);
                              const label =
                                pkg.type === '10_classes' ? 'Mtr. Plan 10 Clases' :
                                pkg.type === '20_classes' ? 'Mtr. Plan 20 Clases' : 'Mtr. Plan Mensual Ilimitado';
                              return (
                                <div key={pkg.packageId + '_pay_adm'} className="p-2 border-b border-slate-100 last:border-0 flex justify-between items-center text-xs">
                                  <div>
                                    <div className="font-extrabold text-slate-800">{label}</div>
                                    <div className="text-[10px] text-slate-500 font-semibold">
                                      Ref: {pkg.packageId.toUpperCase()} • {new Date(pkg.purchaseDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-black text-slate-900">{formatCLP(clpVal)}</div>
                                    <span className="text-[8px] font-bold text-emerald-850 uppercase block">
                                      ✓ Completado
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-4 text-xs text-slate-400 italic font-bold">
                              No posee registros de pagos.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Exit operations */}
                    <div className="pt-2 border-t border-white/20 flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedDetStudentId(null)}
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        Cerrar Ficha
                      </button>
                    </div>
                  </motion.div>
                </div>
              );
            })()}
          </AnimatePresence>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 4: METRICAS FINANCIERAS Y DE RETENCION */}
      {/* ========================================================== */}
      {activeTab === 'financials' && (
        <div className="space-y-8">
          
          {/* CONTROL SWITCH PANEL */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-5 border border-white/50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-800" />
                Módulo Financiero Integrado
              </h3>
              <p className="text-xs text-slate-550 font-semibold mt-0.5">
                Consolidación de flujos de caja, egresos operativos, beneficios netos y proyección predictiva.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-500">Año:</span>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(Number(e.target.value))}
                  className="bg-white/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              {/* Month Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-500">Periodo:</span>
                <select
                  value={financialMonth}
                  onChange={(e) => setFinancialMonth(e.target.value)}
                  className="bg-white/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="todos">Todo el año (Consolidado)</option>
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={String(idx)}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Add Expense Button */}
              <button
                type="button"
                onClick={handleOpenAddExpense}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95 shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                Registrar Gasto
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. ARPU Card / Ingreso por Alumno */}
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm flex flex-col justify-between text-left gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">{financialDisplayTitle}</span>
                  <h2 className="text-2xl font-black text-slate-800 leading-tight">{formatCLP(financialDisplayValue)}</h2>
                  <p className="text-[11px] text-slate-655 font-semibold">{financialDisplaySubtitle}</p>
                </div>
                <div className="w-12 h-12 bg-white/40 border border-white/50 rounded-2xl flex items-center justify-center text-emerald-705 shadow-inner shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              {/* Student Filter Dropdown */}
              <div className="space-y-1 border-t border-slate-200/50 pt-3">
                <label htmlFor="financial-student-select" className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Filtrar por Alumno:</label>
                <select
                  id="financial-student-select"
                  value={financialSelectedStudent}
                  onChange={(e) => setFinancialSelectedStudent(e.target.value)}
                  className="w-full bg-white/70 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="todos">Todos los Alumnos (Promedio)</option>
                  {users
                    .filter(u => u.role === 'student')
                    .sort((a, b) => a.displayName.localeCompare(b.displayName))
                    .map((u) => {
                      const count = packages.filter(p => p.studentId === u.userId).length;
                      return (
                        <option key={u.userId} value={u.userId}>
                          {u.displayName} ({count} plan{count !== 1 ? 'es' : ''})
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>

            {/* 2. Total Revenues Card */}
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm flex items-center justify-between text-left">
              <div className="space-y-1">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Ingresos Totales (Cobros)</span>
                <h2 className="text-2.5xl font-black text-emerald-900">{formatCLP(displayIncome)}</h2>
                <p className="text-[11px] text-slate-655 font-semibold">
                  {financialMonth === 'todos' 
                    ? `Consolidado Anual ${financialYear}` 
                    : `Mes de ${MONTH_NAMES[parseInt(financialMonth, 10)]} ${financialYear}`}
                </p>
              </div>
              <div className="w-12 h-12 bg-white/40 border border-white/50 rounded-2xl flex items-center justify-center text-emerald-805 shadow-inner">
                <Check className="w-6 h-6" />
              </div>
            </div>

            {/* 3. Total Expenses Card */}
            <div className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/50 shadow-sm flex items-center justify-between text-left">
              <div className="space-y-1">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Gastos Registrados</span>
                <h2 className="text-2.5xl font-black text-rose-900">{formatCLP(displayExpense)}</h2>
                <p className="text-[11px] text-slate-655 font-semibold">
                  {expenses.filter(e => {
                    const d = new Date(e.date);
                    return d.getFullYear() === financialYear && (financialMonth === 'todos' || d.getMonth() === parseInt(financialMonth, 10));
                  }).length} registros de egreso
                </p>
              </div>
              <div className="w-12 h-12 bg-white/40 border border-white/50 rounded-2xl flex items-center justify-center text-rose-800 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            {/* 4. Net Profit Card */}
            <div className={`backdrop-blur-md rounded-2xl p-6 border shadow-sm flex items-center justify-between text-left transition-all duration-300 ${
              displayBenefit >= 0 
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}>
              <div className="space-y-1">
                <span className="text-slate-600 text-xs font-bold uppercase tracking-wider block">Beneficio Neto</span>
                <h2 className="text-2.5xl font-black">{formatCLP(displayBenefit)}</h2>
                <p className="text-[11px] opacity-75 font-semibold">
                  {displayBenefit >= 0 ? "Resultados con Superávit" : "Resultados con Déficit"}
                </p>
              </div>
              <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-inner ${
                displayBenefit >= 0 
                  ? 'bg-white/60 border-emerald-300 text-emerald-950' 
                  : 'bg-white/60 border-rose-300 text-rose-955'
              }`}>
                {displayBenefit >= 0 ? <ThumbsUp className="w-6 h-6" /> : <X className="w-6 h-6" />}
              </div>
            </div>

          </div>

          {/* Recharts visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-2">

            {/* Chart 1: Current Year cash flows */}
            <div className="bg-white/40 backdrop-blur-lg rounded-2xl border border-white/50 shadow-sm p-6 space-y-4 text-left">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Flujo de Caja Mensual ({financialYear})</h3>
                <p className="text-slate-550 text-xs mt-0.5">
                  Comparativa de ingresos, gastos operativos y beneficio neto acumulado por mes.
                </p>
              </div>

              <div className="h-[250px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentYearMonthlyData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} />
                    <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip 
                      formatter={(value: any) => [formatCLP(Number(value)), '']}
                      contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <Bar name="Ingresos (Alumnos)" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name="Gastos" dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar name="Beneficio Neto" dataKey="benefit" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {/* Highlight month card */}
              {financialMonth !== 'todos' && (
                <div className="bg-slate-50/80 border border-slate-150 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Mes visualizado: <span className="text-emerald-800 font-extrabold">{MONTH_NAMES[parseInt(financialMonth, 10)]}</span></span>
                  <button 
                    onClick={() => setFinancialMonth('todos')} 
                    className="text-emerald-705 hover:underline font-extrabold uppercase text-[10px]"
                  >
                    Ver Todo El Año
                  </button>
                </div>
              )}
            </div>

            {/* Chart 2: Prediction / Projection for next year */}
            <div className="bg-white/40 backdrop-blur-lg rounded-2xl border border-white/50 shadow-sm p-6 space-y-4 text-left">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span>Predicción de Tendencias ({financialYear + 1})</span>
                  <span className="bg-blue-100 text-blue-900 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">Año Siguiente</span>
                </h3>
                <p className="text-slate-550 text-xs mt-0.5">
                  Proyección estacional para el siguiente año basándose en el comportamiento histórico de la academia.
                </p>
              </div>

              <div className="h-[250px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={nextYearPredictedData} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} />
                    <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip 
                      formatter={(value: any) => [formatCLP(Number(value)), '']}
                      contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <Line name="Ingresos Proyectados" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    <Line name="Gastos Proyectados" type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
                    <Line name="Beneficio Neto Proyectado" type="monotone" dataKey="benefit" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl text-[10px] text-blue-900 font-semibold leading-relaxed">
                * Estimación configurada con un <strong className="font-black">+18% de crecimiento interanual proyectado</strong> en suscripciones, indexación estacional e inflación proyectada del 5% en costos operativos.
              </div>
            </div>

          </div>

          {/* EXPENSE WORKSPACE / LEDGER SHEET */}
          <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-sm space-y-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/20 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-805 text-sm flex items-center gap-2 font-semibold">
                  <Clipboard className="w-4 h-4 text-emerald-800" />
                  Planilla de Registro de Gastos y Egresos Operativos
                </h3>
                <p className="text-slate-555 text-xs mt-0.5">
                  Planillas de egresos institucionales filtrados para el periodo seleccionado ({financialMonth === 'todos' ? 'Año Completo' : MONTH_NAMES[parseInt(financialMonth, 10)]} {financialYear}).
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddExpense}
                className="bg-slate-800 hover:bg-slate-900 text-white font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Registrar Gasto
              </button>
            </div>

            {/* Filtered Expenses List */}
            {(() => {
              const filteredExps = expenses.filter(e => {
                const d = new Date(e.date);
                const matchYear = d.getFullYear() === financialYear;
                const matchMonth = financialMonth === 'todos' || d.getMonth() === parseInt(financialMonth, 10);
                return matchYear && matchMonth;
              }).sort((a, b) => b.date.localeCompare(a.date));

              if (filteredExps.length === 0) {
                return (
                  <div className="py-12 text-center text-slate-450 italic font-bold text-xs bg-white/20 rounded-2xl border border-dashed border-slate-200">
                    No se registran egresos ni gastos para el periodo seleccionado.
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto border border-slate-202 rounded-xl bg-white/50">
                  <table className="w-full text-xs text-left text-slate-700 min-w-[650px]">
                    <thead className="bg-slate-100/80 text-[10px] font-black uppercase text-slate-505 tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Categoría de Gasto</th>
                        <th className="px-4 py-3">Detalle / Descripción</th>
                        <th className="px-4 py-3 text-right">Monto Copagos</th>
                        <th className="px-4 py-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredExps.map((exp) => {
                        const catLabels: Record<string, string> = {
                          'generales': 'Gastos Generales / Básicos',
                          'sueldos': 'Pago de Sueldos',
                          'arriendo': 'Arriendo',
                          'otros': 'Otros Egresos'
                        };
                        const catColors: Record<string, string> = {
                          'generales': 'bg-blue-50 text-blue-705 border border-blue-100',
                          'sueldos': 'bg-purple-50 text-purple-705 border border-purple-100',
                          'arriendo': 'bg-amber-50 text-amber-705 border border-amber-100',
                          'otros': 'bg-slate-100 text-slate-600 border border-slate-202'
                        };

                        return (
                          <tr key={exp.expenseId} className="hover:bg-white/40 transition-colors">
                            <td className="px-4 py-3 text-slate-850 font-extrabold whitespace-nowrap">
                              {new Date(exp.date + 'T12:00:00').toLocaleDateString('es-CL', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${catColors[exp.category] || catColors.otros}`}>
                                {catLabels[exp.category] || 'Gastos Generales'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {exp.description}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-rose-700 whitespace-nowrap">
                              {formatCLP(exp.amount)}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <div className="inline-flex justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditExpense(exp)}
                                  className="text-[10px] uppercase font-black tracking-wider text-blue-650 hover:text-blue-800 hover:underline px-1 py-0.5"
                                >
                                  Modificar
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExpense(exp.expenseId)}
                                  className="text-[10px] uppercase font-black tracking-wider text-rose-655 hover:text-rose-800 hover:underline px-1 py-0.5"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* EXPENSE CREATION & EDIT MODAL POPUP */}
          <AnimatePresence>
            {showExpenseModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-left"
                >
                  <div className="bg-slate-800 text-white p-5 flex justify-between items-center">
                    <div>
                      <h4 className="font-extrabold text-sm uppercase tracking-wider">
                        {expenseFormMode === 'create' ? 'Registrar Egreso / Gasto' : 'Modificar Registro de Gasto'}
                      </h4>
                      <p className="text-[10px] text-slate-100 font-bold mt-0.5 uppercase tracking-wide">
                        Yoga de Corazón • Flujos Administrativos
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowExpenseModal(false)}
                      className="text-white/85 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                    
                    <div className="space-y-1">
                      <label htmlFor="expense-category" className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Categoría de Gasto:
                      </label>
                      <select
                        id="expense-category"
                        value={expenseFormCategory}
                        onChange={(e) => setExpenseFormCategory(e.target.value as ExpenseCategory)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="generales">Gastos Generales / Básicos</option>
                        <option value="sueldos">Pago de sueldos</option>
                        <option value="arriendo">Arriendo</option>
                        <option value="otros">Otros egresos operacionales</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="expense-amount" className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Monto Gasto (CLP):
                      </label>
                      <input
                        id="expense-amount"
                        type="number"
                        required
                        min="1"
                        placeholder="Monto en CLP, ej: 150000"
                        value={expenseFormAmount}
                        onChange={(e) => setExpenseFormAmount(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="expense-date" className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Fecha del Egreso:
                      </label>
                      <input
                        id="expense-date"
                        type="date"
                        required
                        value={expenseFormDate}
                        onChange={(e) => setExpenseFormDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="expense-desc" className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                        Descripción / Conceptos:
                      </label>
                      <textarea
                        id="expense-desc"
                        required
                        rows={3}
                        placeholder="Escribe el detalle del egreso, ej: Pago de luz de Junio"
                        value={expenseFormDescription}
                        onChange={(e) => setExpenseFormDescription(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowExpenseModal(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-655 text-xs font-extrabold rounded-xl transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 border border-emerald-900 text-white text-xs font-extrabold rounded-xl transition-all"
                      >
                        {expenseFormMode === 'create' ? 'Registrar Gasto' : 'Guardar Cambios'}
                      </button>
                    </div>

                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* ========================================================== */}
          {/* 3. SECCIÓN: DEMANDA DE ALUMNOS, HORARIOS Y COHORTES */}
          {/* ========================================================== */}
          <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-sm text-left space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/20 pb-4">
              <div>
                <span className="bg-emerald-100 text-emerald-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-200 shadow-sm">
                  Preferencia & Carga Horaria
                </span>
                <h3 className="font-extrabold text-slate-850 text-base mt-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-800" />
                  Demanda de Alumnos e Inasistencia por Instructores y Horarios
                </h3>
                <p className="text-slate-600 text-xs mt-0.5">
                  Visualiza qué profesores tienen más alumnos agendados y en qué horas del día se concentra la mayor actividad y demanda.
                </p>
              </div>

              {/* Chart Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Month Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Mes:</span>
                  <select
                    value={chartMonthFilter}
                    onChange={(e) => {
                      setChartMonthFilter(e.target.value);
                      setChartWeekFilter('todos'); // reset week filter on month change
                    }}
                    className="bg-white/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="todos">Todos los meses (Consolidado)</option>
                    <option value="2026-04">Abril 2026</option>
                    <option value="2026-05">Mayo 2026</option>
                    <option value="2026-06">Junio 2026</option>
                    <option value="2026-07">Julio 2026</option>
                  </select>
                </div>

                {/* Week Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Semana:</span>
                  <select
                    value={chartWeekFilter}
                    onChange={(e) => setChartWeekFilter(e.target.value)}
                    className="bg-white/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="todos">Todas las semanas</option>
                    {CHART_CALENDAR_WEEKS.map(w => (
                      <option key={w.id} value={w.id}>{w.label} ({w.datesText})</option>
                    ))}
                  </select>
                </div>

                {/* Highlight/Filter Instructor */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500">Filtrar Instructor (Gral):</span>
                  <select
                    value={chartSelectedInstructor}
                    onChange={(e) => setChartSelectedInstructor(e.target.value)}
                    className="bg-white/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="todos">Todos los instructores</option>
                    <option value="Sofía">Sofía</option>
                    <option value="Matías">Matías</option>
                    <option value="Camila">Camila</option>
                    <option value="Lucas">Lucas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Insight Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-2">
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800">Docente Más Solicitado</span>
                  <h4 className="text-lg font-black text-slate-850 mt-1">{topInstructor}</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{maxInstCount >= 0 ? `${maxInstCount} reservas` : 'Sin registros'}</p>
                </div>
                <div className="p-3 bg-white border border-emerald-200 rounded-xl text-emerald-700">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-sky-800">
                    {chartSelectedInstructor !== 'todos' ? `Máx. Solicitud (${chartSelectedInstructor})` : 'Horario de Mayor Demanda'}
                  </span>
                  <h4 className="text-lg font-black text-slate-850 mt-1">{topSlot} h</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{maxSlotCount >= 0 ? `${maxSlotCount} asistencias/reservas` : 'Sin registros'}</p>
                </div>
                <div className="p-3 bg-white border border-sky-200 rounded-xl text-sky-750">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-800">Alumnos Activos</span>
                  <h4 className="text-lg font-black text-slate-850 mt-1">{activeClients} alumnos</h4>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{expiringClients} por vencer en los planes</p>
                </div>
                <div className="p-3 bg-white border border-purple-200 rounded-xl text-purple-705">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Side-by-side or Bento-style charts representation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart A: Demanda por Docente */}
              <div className="bg-white/30 border border-white/50 p-5 rounded-xl space-y-4 text-left lg:col-span-1">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Distribución por Instructor</h4>
                  <p className="text-slate-550 text-[10.5px] mt-0.5">Demanda acumulada de reservas/clases.</p>
                </div>
                
                <div className="h-[220px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={instructorChartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis 
                        dataKey="name" 
                        tick={(props: any) => {
                          const { x, y, payload } = props;
                          const isSelected = chartSelectedInstructor === payload.value;
                          const hasSelection = chartSelectedInstructor !== 'todos';
                          const color = hasSelection ? (isSelected ? '#0f172a' : '#94a3b8') : '#475569';
                          const weight = isSelected ? 'bolder' : hasSelection ? 'normal' : 'bold';
                          return (
                            <text 
                              x={x} 
                              y={y + 14} 
                              textAnchor="middle" 
                              fill={color} 
                              onClick={() => setChartSelectedInstructor(prev => prev === payload.value ? 'todos' : payload.value)}
                              style={{ fontSize: '10.5px', fontWeight: weight, cursor: 'pointer' }}
                            >
                              {payload.value}
                            </text>
                          );
                        }} 
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                      <Bar 
                        name="Reservas" 
                        dataKey="Reservas" 
                        radius={[4, 4, 0, 0]}
                        onClick={(data) => {
                          if (data && data.name) {
                            setChartSelectedInstructor(prev => prev === data.name ? 'todos' : data.name);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {instructorChartData.map((entry, index) => {
                          const isSelected = chartSelectedInstructor === entry.name;
                          const hasSelection = chartSelectedInstructor !== 'todos';
                          let fill = "#059669"; // default emerald-600
                          if (hasSelection) {
                            fill = isSelected ? "#064e3b" : "#d1fae5"; 
                          }
                          return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                        <LabelList 
                          dataKey="Reservas" 
                          position="top" 
                          content={(props: any) => {
                            const { x, y, width, value, index } = props;
                            const entry = instructorChartData[index];
                            if (!entry) return null;
                            const isSelected = chartSelectedInstructor === entry.name;
                            const hasSelection = chartSelectedInstructor !== 'todos';
                            const labelColor = hasSelection ? (isSelected ? "#064e3b" : "#a7f3d0") : "#047857";
                            return (
                              <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} fill={labelColor} textAnchor="middle" fontSize={10} fontWeight="bold">
                                {value}
                              </text>
                            );
                          }} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart B: Preferencia Horaria */}
              <div className="bg-white/30 border border-white/50 p-5 rounded-xl space-y-4 text-left lg:col-span-1">
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Horarios más Solicitados</h4>
                    <p className="text-slate-550 text-[10px] mt-0.5">
                      {chartSelectedInstructor !== 'todos' ? `Filtrado por: ${chartSelectedInstructor}` : 'Asistencias por bloques horarios.'}
                    </p>
                  </div>
                  <select
                    value={chartSelectedInstructor}
                    onChange={(e) => setChartSelectedInstructor(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10.5px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
                  >
                    <option value="todos">Todos</option>
                    <option value="Sofía">Sofía</option>
                    <option value="Matías">Matías</option>
                    <option value="Camila">Camila</option>
                    <option value="Lucas">Lucas</option>
                  </select>
                </div>

                <div className="h-[220px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSlotChartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="slot" tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                      <Bar name="Alumnos" dataKey="Reservas" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="Reservas" position="top" style={{ fill: '#3730a3', fontWeight: 'bold', fontSize: 10 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart C: Cohortes Pie Chart */}
              <div className="bg-white/30 border border-white/50 p-5 rounded-xl space-y-4 text-left lg:col-span-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Cohortes de Clientes</h4>
                  <p className="text-slate-550 text-[10.5px] mt-0.5">Estado actual de vigencia de planes.</p>
                </div>

                <div className="h-[160px] w-full relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cohortData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {cohortData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Alumnos`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Absolute Center Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                    <span className="text-xl font-black text-slate-800 leading-none">{activeClients + expiringClients + dormantClients}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Registrados</span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="space-y-1 bg-white/40 p-2 rounded-xl text-[10px] font-bold text-slate-650">
                  {cohortData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full block" style={{ backgroundColor: item.color }}></span>
                        <span>{item.name}</span>
                      </div>
                      <span className="text-slate-800 font-extrabold">{item.value} ({Math.round((item.value / ((activeClients + expiringClients + dormantClients) || 1)) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* SECCIÓN DEL GERENTE: TENDENCIA Y EVOLUCIÓN SEMANAL/MENSUAL DE PROFESORES Y ALUMNOS */}
          <div className="bg-white/40 backdrop-blur-lg rounded-2xl border border-white/50 shadow-sm p-6 space-y-6 text-left">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/20 pb-5">
              <div>
                <span className="bg-purple-100 text-purple-900 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-purple-200 shadow-sm">
                  Exclusivo Gerencia Valentina
                </span>
                <h3 className="font-extrabold text-slate-850 text-base mt-2 flex items-center gap-1.5">
                  <Award className="w-5 h-5 text-purple-700 shrink-0" />
                  Control de Alumnos y Productividad de Profesores
                </h3>
                <p className="text-slate-600 text-xs mt-0.5">
                  Análisis cruzado semanal y mensual de matrículas, alumnos atendidos y tendencias por profesor con visualización de números exactos.
                </p>
              </div>

              {/* Segment, Chart and Instructor Filters */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Switcher 1: Period filter */}
                <div className="bg-white/50 p-1 rounded-xl border border-white/60 flex items-center shadow-xs">
                  <button
                    onClick={() => setManagerTimeSegment('weekly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      managerTimeSegment === 'weekly'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-850'
                    }`}
                  >
                    Semanal
                  </button>
                  <button
                    onClick={() => setManagerTimeSegment('monthly')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      managerTimeSegment === 'monthly'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-850'
                    }`}
                  >
                    Mensual
                  </button>
                </div>

                {/* Switcher 2: Chart representation toggle */}
                <div className="bg-white/50 p-1 rounded-xl border border-white/60 flex items-center shadow-xs">
                  <button
                    onClick={() => setManagerChartType('bar')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      managerChartType === 'bar'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-850'
                    }`}
                  >
                    Barras
                  </button>
                  <button
                    onClick={() => setManagerChartType('trend')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      managerChartType === 'trend'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-850'
                    }`}
                  >
                    Tendencia
                  </button>
                </div>

                {/* Filter 3: Highlight Professor */}
                <select
                  value={managerSelectedTeacher}
                  onChange={(e) => setManagerSelectedTeacher(e.target.value)}
                  className="bg-white/60 border border-white/60 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="todos">Todos los profesores</option>
                  <option value="Sofía">Sofía</option>
                  <option value="Matías">Matías</option>
                  <option value="Camila">Camila</option>
                  <option value="Lucas">Lucas</option>
                </select>

                {/* Filter 4: Select Month */}
                <select
                  value={managerSelectedMonth}
                  onChange={(e) => setManagerSelectedMonth(e.target.value)}
                  className="bg-white/60 border border-white/60 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="todos">Todos los meses (sin filtro)</option>
                  <option value="2026-04">Abril 2026</option>
                  <option value="2026-05">Mayo 2026</option>
                  <option value="2026-06">Junio 2026</option>
                  <option value="2026-07">Julio 2026</option>
                </select>

              </div>
            </div>

            {/* Render selected configuration */}
            <div className="space-y-4">
              <div className="bg-white/25 rounded-xl p-3 border border-white/30 text-xs font-semibold text-slate-650 flex flex-wrap gap-4">
                <div>Periodo: <strong className="text-slate-850">
                  {managerTimeSegment === 'weekly' 
                    ? (managerSelectedMonth === 'todos' ? 'Junio 2026 (5 semanas - Consolidado)' : `${managerSelectedMonth === '2026-04' ? 'Abril' : managerSelectedMonth === '2026-05' ? 'Mayo' : managerSelectedMonth === '2026-06' ? 'Junio' : 'Julio'} 2026 (5 semanas)`)
                    : (managerSelectedMonth === 'todos' ? 'Histórico (Mayo-Julio)' : `${managerSelectedMonth === '2026-04' ? 'Abril' : managerSelectedMonth === '2026-05' ? 'Mayo' : managerSelectedMonth === '2026-06' ? 'Junio' : 'Julio'} 2026`)}
                </strong></div>
                <div>Visualización: <strong className="text-slate-850">{managerChartType === 'bar' ? 'Comparativa de Barras' : 'Tendencia de Flujo'}</strong></div>
                <div>Filtro profesor: <strong className="text-slate-850">{managerSelectedTeacher === 'todos' ? 'Todos' : managerSelectedTeacher}</strong></div>
                <div>Filtro mes: <strong className="text-slate-850">{managerSelectedMonth === 'todos' ? 'General (Sin Filtro)' : (managerSelectedMonth === '2026-04' ? 'Abril 2026' : managerSelectedMonth === '2026-05' ? 'Mayo 2026' : managerSelectedMonth === '2026-06' ? 'Junio 2026' : 'Julio 2026')}</strong></div>
              </div>

              {/* Rendering Canvas */}
              <div className="h-[320px] w-full bg-white/20 p-4 rounded-2xl border border-white/40 shadow-inner">
                <ResponsiveContainer width="100%" height="100%">
                  {managerChartType === 'bar' ? (
                    <BarChart
                      data={managerTimeSegment === 'weekly' ? weeklyInstructorData : monthlyInstructorData}
                      margin={{ top: 25, right: 20, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.35)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155', fontWeight: 'bold' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#334155' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderRadius: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                      
                      {managerSelectedTeacher === 'todos' ? (
                        <>
                          <Bar dataKey="Sofía" fill="#a855f7" radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="Sofía" position="top" style={{ fill: '#6b21a8', fontWeight: 'bold', fontSize: 10.5 }} />
                          </Bar>
                          <Bar dataKey="Matías" fill="#06b6d4" radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="Matías" position="top" style={{ fill: '#0e7490', fontWeight: 'bold', fontSize: 10.5 }} />
                          </Bar>
                          <Bar dataKey="Camila" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="Camila" position="top" style={{ fill: '#1d4ed8', fontWeight: 'bold', fontSize: 10.5 }} />
                          </Bar>
                          <Bar dataKey="Lucas" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="Lucas" position="top" style={{ fill: '#b45309', fontWeight: 'bold', fontSize: 10.5 }} />
                          </Bar>
                        </>
                      ) : (
                        <Bar dataKey={managerSelectedTeacher} fill="#4f46e5" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey={managerSelectedTeacher} position="top" style={{ fill: '#3730a3', fontWeight: 'extrabold', fontSize: 12 }} />
                        </Bar>
                      )}
                    </BarChart>
                  ) : (
                    <LineChart
                      data={managerTimeSegment === 'weekly' ? weeklyInstructorData : monthlyInstructorData}
                      margin={{ top: 25, right: 20, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.35)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155', fontWeight: 'bold' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#334155' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderRadius: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />

                      {managerSelectedTeacher === 'todos' ? (
                        <>
                          <Line type="monotone" dataKey="total" name="Total Alumnos" stroke="#111827" strokeWidth={3} activeDot={{ r: 8 }}>
                            <LabelList dataKey="total" position="top" style={{ fill: '#111827', fontWeight: 'black', fontSize: 11 }} />
                          </Line>
                          <Line type="monotone" dataKey="Sofía" stroke="#a855f7" strokeWidth={2}>
                            <LabelList dataKey="Sofía" position="top" style={{ fill: '#6b21a8', fontSize: 10 }} />
                          </Line>
                          <Line type="monotone" dataKey="Matías" stroke="#06b6d4" strokeWidth={2}>
                            <LabelList dataKey="Matías" position="top" style={{ fill: '#0e7490', fontSize: 10 }} />
                          </Line>
                          <Line type="monotone" dataKey="Camila" stroke="#3b82f6" strokeWidth={2}>
                            <LabelList dataKey="Camila" position="top" style={{ fill: '#1d4ed8', fontSize: 10 }} />
                          </Line>
                          <Line type="monotone" dataKey="Lucas" stroke="#f59e0b" strokeWidth={2}>
                            <LabelList dataKey="Lucas" position="top" style={{ fill: '#b45309', fontSize: 10 }} />
                          </Line>
                        </>
                      ) : (
                        <Line type="monotone" dataKey={managerSelectedTeacher} name={`Alumnos de ${managerSelectedTeacher}`} stroke="#4f46e5" strokeWidth={4} activeDot={{ r: 8 }}>
                          <LabelList dataKey={managerSelectedTeacher} position="top" style={{ fill: '#3730a3', fontWeight: 'black', fontSize: 12 }} />
                        </Line>
                      )}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Data explanation helper badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-purple-50/55 p-3 rounded-xl border border-purple-200/50 text-[11px] text-purple-950 leading-relaxed font-semibold">
                  💡 <strong>Análisis comparativo de barras:</strong> Permite ver qué docente concita mayor interés por periodo seleccionado, ideal para control de incentivos.
                </div>
                <div className="bg-emerald-50/55 p-3 rounded-xl border border-emerald-200/50 text-[11px] text-emerald-950 leading-relaxed font-semibold">
                  📈 <strong>Curva de tendencia comercial:</strong> Exhibe el volumen y variación de matrículas semanales para anticipar la estacionalidad operacional de Yoga de Corazón.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: RANKING DE ALUMNOS CON MAYOR ASISTENCIA */}
          <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-sm text-left space-y-4">
            <div className="border-b border-white/20 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-1.5">
                  <Award className="w-5 h-5 text-amber-600 font-extrabold" />
                  Ranking de Alumnos con Mayor Asistencia
                </h3>
                <p className="text-slate-600 text-xs mt-0.5 font-medium">
                  Los alumnos que más participan y asisten a sus clases de yoga programadas.
                </p>
              </div>
              <span className="text-emerald-900 text-[11px] font-extrabold bg-emerald-100/50 border border-emerald-200/50 px-2.5 py-1 rounded-full self-start sm:self-auto">
                Top 5 Alumnos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {topAttendingStudents.map((student, idx) => {
                const isGold = idx === 0;
                const isSilver = idx === 1;
                const isBronze = idx === 2;
                
                return (
                  <div 
                    key={student.email} 
                    className={`p-4 rounded-2xl border backdrop-blur-sm relative overflow-hidden flex flex-col justify-between shadow-sm transition-all hover:translate-y-[-2px] ${
                      isGold ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20' :
                      isSilver ? 'bg-slate-400/10 border-slate-400/30' :
                      isBronze ? 'bg-amber-700/10 border-amber-700/30' :
                      'bg-white/50 border-white/70'
                    }`}
                  >
                    {/* Position Badge */}
                    <div className={`absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full font-black text-[10px] border shadow-xs ${
                      isGold ? 'bg-amber-505 text-amber-950 border-amber-400' :
                      isSilver ? 'bg-slate-400 text-slate-950 border-slate-300' :
                      isBronze ? 'bg-amber-700 text-amber-100 border-amber-605' :
                      'bg-slate-100 text-slate-700 border-slate-204'
                    }`}>
                      #{idx + 1}
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-black text-slate-855 truncate pr-6">{student.name}</div>
                      <div className="text-[10px] text-slate-550 truncate font-semibold">{student.email}</div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/40 flex items-end justify-between">
                      <div>
                        <div className="text-xl font-black text-emerald-950 font-mono tracking-tight">{student.attended}</div>
                        <div className="text-[9px] text-slate-455 font-black uppercase tracking-wider">Asistió</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-650 font-mono">{student.booked}</div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Reservó</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {topAttendingStudents.length === 0 && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-5 bg-white/30 border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-505 font-bold italic text-xs">
                  No se registran asistencias ni reservas históricas en el sistema.
                </div>
              )}
            </div>
          </div>

          {/* Client reminders table (Full Width) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ACTIVE CLIENTS & WHATSAPP GENTLE REMINDERS (Full width) */}
            <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-3 text-left">
              <div className="border-b border-white/20 pb-3">
                <h3 className="font-bold text-slate-850 text-sm flex items-center gap-1.5">
                  <MessageCircle className="w-5 h-5 text-emerald-700" />
                  Vencimientos de Clientes & Recordatorios de Cobros
                </h3>
                <p className="text-slate-600 text-xs mt-0.5 font-medium">Control de vigencias y remisión de notificaciones con saldo actual de clases para resolver reclamos.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/20 text-slate-500 font-bold bg-white/20">
                      <th className="py-2 px-3">Alumno</th>
                      <th className="py-2 px-3">Plan Comprado</th>
                      <th className="py-2 px-3">Clases Restantes</th>
                      <th className="py-2 px-3">Vencimiento</th>
                      <th className="py-2 px-3">Estado actual</th>
                      <th className="py-2 px-3 text-right">Mandar Mensaje Directo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.length > 0 ? (
                      packages.map((pkg) => (
                        <tr key={pkg.packageId} className="border-b border-white/10 hover:bg-white/20 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-slate-850">{pkg.studentName}</div>
                            <div className="text-[10px] text-slate-600 font-semibold">{pkg.studentEmail}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-slate-750">
                              {pkg.type === '10_classes' && 'Paquete 10 Clases'}
                              {pkg.type === '20_classes' && 'Paquete de 20 Clases'}
                              {pkg.type === 'unlimited' && 'Suscripción Ilimitada'}
                            </span>
                            <div className="text-[10px] text-slate-550 font-extrabold">Cobrado: {formatCLP(getCLPValue(pkg.pricePaid))}</div>
                          </td>
                          <td className="py-3 px-3">
                            {pkg.type === 'unlimited' ? (
                              <span className="font-black text-emerald-700">Ilimitado</span>
                            ) : (
                              <span className={`font-black ${pkg.remainingClasses <= 2 ? 'text-amber-600 font-black' : 'text-slate-700'}`}>
                                {pkg.remainingClasses} clases de {pkg.totalClasses}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-600">{new Date(pkg.expiryDate).toLocaleDateString()}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              pkg.status === 'active' ? 'bg-emerald-100/50 text-emerald-950 border border-emerald-300' :
                              pkg.status === 'expiring' ? 'bg-amber-100/50 text-amber-955 border border-amber-300' : 
                              pkg.status === 'dormant' ? 'bg-red-100/50 text-red-955 border border-red-200' :
                              'bg-white/20 text-slate-650 border border-white/30'
                            }`}>
                              {pkg.status === 'active' ? 'Activo' :
                               pkg.status === 'expiring' ? 'Por Vencer' :
                               pkg.status === 'dormant' ? 'Dormido (0 Clases)' : 'Vencido'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleGenerateReminder(pkg.studentName, pkg.type, pkg.remainingClasses, pkg.expiryDate)}
                              className="p-1 px-3 border border-emerald-300/60 hover:bg-[#e0f0e3]/45 bg-white/20 rounded-lg text-emerald-900 font-extrabold text-[11px] transition-all inline-flex items-center gap-1 active:scale-95 shadow-sm"
                            >
                              <Send className="w-3 h-3 text-emerald-750" /> Recordatorio
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-505 font-bold text-xs">No hay paquetes asociados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 5: INSCRIPCION DE ALUMNOS (NUEVO APARTADO) */}
      {/* ========================================================== */}
      {activeTab === 'enroll_students' && (
        <div className="space-y-6">
          <div className="bg-white/40 backdrop-blur-lg border border-white/50 p-6 rounded-2xl shadow-sm text-left">
            <div className="border-b border-white/20 pb-4">
              <h3 className="font-bold text-slate-850 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                Inscripción de Alumnos & Compra de Planes
              </h3>
              <p className="text-slate-600 text-xs mt-0.5">
                Registra nuevos alumnos y asígnales planes con precios fijos en pesos chilenos de manera directa y segura. No cobramos comisiones adicionales.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
              
              {/* Form Side (5 cols) */}
              <div className="lg:col-span-5 bg-white/60 p-6 rounded-2xl border border-white/80 shadow-sm space-y-4">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                    <PlusCircle className="w-4.5 h-4.5 text-emerald-700 font-bold" />
                    Formulario de Inscripción
                  </h4>
                  <p className="text-[11px] text-slate-500 font-extrabold mt-0.5">Define si es un alumno nuevo o existente y selecciona el plan.</p>
                </div>

                <form onSubmit={handleAssignPackage} className="space-y-4 text-xs">
                  {/* Student dropdown selection */}
                  <div className="space-y-1">
                    <label className="font-black text-slate-500 uppercase tracking-wider text-[10px]">Seleccionar Alumno</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Elige un Alumno --</option>
                      {users.filter(u => u.role === 'student').map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.displayName} ({u.email})
                        </option>
                      ))}
                      <option value="new_student">+ Registrar Alumno Nuevo</option>
                    </select>
                  </div>

                  {/* New student details */}
                  {selectedStudentId === 'new_student' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 border border-dashed border-emerald-300 p-3 rounded-lg bg-emerald-55/35 backdrop-blur"
                    >
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[11px]">Nombre Completo Alumno</label>
                        <input
                          type="text"
                          required
                          placeholder="ej. Juan Pérez"
                          value={newStudentName}
                          onChange={(e) => setNewStudentName(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-705 block text-[11px]">Correo Electrónico Alumno</label>
                        <input
                          type="email"
                          required
                          placeholder="ej. juan@hotmail.com"
                          value={newStudentEmail}
                          onChange={(e) => setNewStudentEmail(e.target.value)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Package Type */}
                  <div className="space-y-1">
                    <label className="font-black text-slate-500 uppercase tracking-wider text-[10px] block">Tipo de Paquete</label>
                    <select
                      value={selectedPkgType}
                      onChange={(e) => setSelectedPkgType(e.target.value as PackageType)}
                      className="w-full bg-slate-50/85 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-708 hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-505"
                    >
                      <option value="10_classes">Paquete 10 Clases ($45.000 CLP)</option>
                      <option value="20_classes">Paquete 20 Clases ($80.000 CLP)</option>
                      <option value="unlimited">Mensualidad Ilimitada ($110.000 CLP)</option>
                    </select>
                  </div>

                  {/* Fecha de Pago / Ingreso */}
                  <div className="space-y-1">
                    <label className="font-black text-slate-500 uppercase tracking-wider text-[10px] block">Fecha de Ingreso / Pago</label>
                    <input
                      type="date"
                      required
                      value={enrollmentDate}
                      onChange={(e) => setEnrollmentDate(e.target.value)}
                      className="w-full bg-slate-50/85 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-708 focus:outline-none focus:ring-1 focus:ring-emerald-505"
                    />
                    <p className="text-[10px] text-slate-500 font-medium">Esta fecha determina en qué mes y año impactará este ingreso financiero dentro de los gráficos de administración.</p>
                  </div>

                  {/* Price display (Locked) */}
                  <div className="space-y-1.5 bg-slate-100/40 p-4 rounded-xl border border-slate-205 text-left">
                    <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase block">Valor Fijo del Plan</span>
                    <div className="text-xl font-black text-emerald-800 flex items-center gap-1.5 font-mono">
                      <span>{formatCLP(Number(overridePrice))}</span>
                      <span className="text-[10px] text-slate-450 font-extrabold uppercase bg-emerald-100/40 px-2 py-0.5 rounded font-sans">Fijado</span>
                    </div>
                    <p className="text-[10px] text-slate-455 font-semibold leading-normal">Monto asignado automáticamente al contratar este plan en Pesos Chilenos (CLP).</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isAssigning}
                    className="w-full py-3 bg-emerald-800 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all shadow-md active:scale-95 text-xs flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isAssigning ? 'Inscribiendo...' : 'Inscribir Alumno y Asignar Plan'}</span>
                  </button>
                </form>
              </div>

              {/* Informational Cards & Active Plans details (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">
                    Planes y Valores Disponibles (Yoga de Corazón)
                  </h4>
                  <p className="text-xs text-slate-550 mt-0.5">Resumen de las tarifas oficiales vigentes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Plan 1 */}
                  <div className="bg-white/55 border border-white/60 p-4 rounded-2xl flex flex-col justify-between text-left shadow-sm">
                    <div>
                      <span className="text-[10px] bg-emerald-100/65 text-emerald-900 font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mb-2">10 Clases</span>
                      <h5 className="font-black text-slate-800 text-sm">Práctica Semanal</h5>
                      <p className="text-[11px] text-slate-500 mt-1 leading-tight font-semibold font-sans">10 clases totales</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-lg font-black text-emerald-955 font-mono">$45.000</span>
                      <span className="text-[9px] text-slate-450 font-bold block uppercase">Pesos Chilenos</span>
                    </div>
                  </div>

                  {/* Plan 2 */}
                  <div className="bg-white/55 border border-white/60 p-4 rounded-2xl flex flex-col justify-between text-left shadow-sm">
                    <div>
                      <span className="text-[10px] bg-purple-100/65 text-purple-900 font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mb-2">20 Clases</span>
                      <h5 className="font-black text-slate-800 text-sm">Práctica Intensa</h5>
                      <p className="text-[11px] text-slate-500 mt-1 leading-tight font-semibold font-sans">20 clases totales</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-lg font-black text-purple-955 font-mono">$80.000</span>
                      <span className="text-[9px] text-slate-450 font-bold block uppercase">Pesos Chilenos</span>
                    </div>
                  </div>

                  {/* Plan 3 */}
                  <div className="bg-white/55 border border-white/60 p-4 rounded-2xl flex flex-col justify-between text-left shadow-sm">
                    <div>
                      <span className="text-[10px] bg-sky-100/65 text-sky-900 font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mb-2">Ilimitado</span>
                      <h5 className="font-black text-slate-800 text-sm">Comunidad Libre</h5>
                      <p className="text-[11px] text-slate-500 mt-1 leading-tight font-semibold font-sans">Mes completo de clases</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-lg font-black text-sky-955 font-mono">$110.000</span>
                      <span className="text-[9px] text-slate-450 font-bold block uppercase">Pesos Chilenos</span>
                    </div>
                  </div>
                </div>

                {/* Guidelines information */}
                <div className="bg-emerald-50/45 p-4 rounded-2xl border border-emerald-100/65 flex gap-3 text-left">
                  <Info className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-850 text-xs">Instrucciones del Sistema</h5>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                      Cuando asignes un plan a un alumno nuevo, el sistema creará automáticamente su registro de usuario y le asignará las credenciales seguras de acceso para ingresar a su Portal de Alumnos.
                    </p>
                    <p className="text-[11px] text-slate-650 leading-relaxed font-extrabold">
                      Los valores de los planes están fijados y no requieren la introducción manual de precios, previniendo errores de digitación o tarifas inconsistentes.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* GLOBAL WHATSAPP REMINDER DIALOG POPUP */}
      {/* ========================================================== */}
      <AnimatePresence>
        {activeReminder && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl w-full max-w-md shadow-2xl p-6 border border-white/50 space-y-4 text-left"
            >
              <div className="flex justify-between items-center border-b border-white/25 pb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Clipboard className="w-4 h-4 text-emerald-750" />
                  Mensaje Recordatorio para {activeReminder.studentName}
                </h3>
                <button 
                  onClick={() => setActiveReminder(null)}
                  className="text-slate-550 hover:text-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Plantilla de Notificación</p>
                <textarea
                  readOnly
                  value={activeReminder.text}
                  className="w-full h-32 p-3 bg-white/40 border border-white/50 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-0 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setActiveReminder(null)}
                  className="flex-1 py-2 text-xs border border-white/50 bg-white/20 text-slate-700 rounded-lg hover:bg-white/40 font-bold transition-all active:scale-95 shadow-sm"
                >
                  Cerrar
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex-1 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {activeReminder.copied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      Copiar Texto
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CLASS CREATION & EDIT MODAL POPUP */}
      <AnimatePresence>
        {showClassModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-left"
            >
              <div className="bg-emerald-800 text-white p-5 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">
                    {modalMode === 'create' ? 'Asignar Nueva Clase' : 'Editar Clase Asignada'}
                  </h4>
                  <p className="text-[10px] text-emerald-100 font-bold mt-0.5 uppercase tracking-wide">
                    Yoga de Corazón • Bloques de 1h 30m
                  </p>
                </div>
                <button 
                  onClick={() => setShowClassModal(false)}
                  className="text-white/85 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveClass} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Día de la semana</label>
                    <select
                      value={modalDay}
                      onChange={(e) => setModalDay(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                      disabled={modalMode === 'edit'}
                    >
                      <option value="Lunes">Lunes</option>
                      <option value="Martes">Martes</option>
                      <option value="Miércoles">Miércoles</option>
                      <option value="Jueves">Jueves</option>
                      <option value="Viernes">Viernes</option>
                      <option value="Sábado">Sábado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Horario de clase</label>
                    <select
                      value={modalTime}
                      onChange={(e) => setModalTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                      disabled={modalMode === 'edit'}
                    >
                      <option value="07:00">07:00 AM (07:00 - 08:30)</option>
                      <option value="09:00">09:00 AM (09:00 - 10:30)</option>
                      <option value="11:00">11:00 AM (11:00 - 12:30)</option>
                      <option value="13:00">13:00 PM (13:00 - 14:30)</option>
                      <option value="16:30">16:30 PM (16:30 - 18:00)</option>
                      <option value="18:30">18:30 PM (18:30 - 20:00)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Instructor asignado</label>
                  <select
                    value={modalInstructor}
                    onChange={(e) => setModalInstructor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                    disabled={modalMode === 'edit'}
                  >
                    <option value="Sofía">Sofía</option>
                    <option value="Matías">Matías</option>
                    <option value="Camila">Camila</option>
                    <option value="Lucas">Lucas</option>
                  </select>
                  
                  {/* Constraint load dynamic warning */}
                  <div className="mt-1.5 text-[10px] text-emerald-800 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Carga hoy para {modalInstructor}: {classes.filter(c => c.dayOfWeek === modalDay && c.instructor === modalInstructor && c.classId !== editingClassId).length} de 6 clases máximas.
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Estilo de Yoga</label>
                  <select
                    value={modalClassName}
                    onChange={(e) => setModalClassName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="Vinyasa Flow">Vinyasa Flow</option>
                    <option value="Vinyasa Pro">Vinyasa Pro</option>
                    <option value="Hatha Tradicional">Hatha Tradicional</option>
                    <option value="Ashtanga Yoga">Ashtanga Yoga</option>
                    <option value="Yin Yoga">Yin Yoga</option>
                    <option value="Restaurativo & Yin">Restaurativo & Yin</option>
                    <option value="Meditación Guiada">Meditación Guiada</option>
                    <option value="Ashtanga Mysore">Ashtanga Mysore</option>
                    <option value="Otro">Otro estilo (especificar...)</option>
                  </select>
                </div>

                {(modalClassName === 'Otro' || modalClassName === 'Otros') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-1 block"
                  >
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Escribe el nombre del estilo</label>
                    <input
                      type="text"
                      value={customClassName}
                      onChange={(e) => setCustomClassName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                      placeholder="Ej. Kundalini Yoga"
                    />
                  </motion.div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Capacidad Máxima</label>
                    <span className="text-xs font-black text-emerald-850">{modalCapacity} alumnos</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="35"
                    value={modalCapacity}
                    onChange={(e) => setModalCapacity(Number(e.target.value))}
                    className="w-full accent-emerald-700 cursor-pointer text-slate-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-0.5">
                    <span>Mínimo: 5</span>
                    <span>Límite de aula: 35 por profesor</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowClassModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 font-bold text-white rounded-xl shadow-sm transition-all active:scale-95"
                  >
                    {modalMode === 'create' ? 'Asignar Horario' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD STUDENT TO ASSIGNED CLASS MODAL */}
      <AnimatePresence>
        {showAddStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-left"
            >
              <div className="bg-emerald-800 text-white p-5 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-sm uppercase tracking-wider">
                    Inscribir Alumno en Clase
                  </h4>
                  {!isGeneralAdd && selectedClassForBooking ? (
                    <p className="text-[10px] text-emerald-100 font-bold mt-0.5 uppercase tracking-wide font-mono">
                      {selectedClassForBooking.name} • con {selectedClassForBooking.instructor} ({selectedClassForBooking.dayOfWeek} {selectedClassForBooking.time})
                    </p>
                  ) : (
                    <p className="text-[10px] text-emerald-100 font-bold mt-0.5 uppercase tracking-wide">
                      Selecciona una clase y un alumno
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setShowAddStudentModal(false)}
                  className="text-white/85 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEnrollStudent} className="p-6 space-y-4">
                {isGeneralAdd && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      Seleccionar Clase
                    </label>
                    <select
                      value={selectedClassForBooking?.classId || ''}
                      onChange={(e) => {
                        const targetCls = classes.find(c => c.classId === e.target.value);
                        setSelectedClassForBooking(targetCls || null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Seleccionar Clase --</option>
                      {classes.map((cls) => (
                        <option key={cls.classId} value={cls.classId}>
                          {cls.name} • con {cls.instructor} ({cls.dayOfWeek} {cls.time} hs)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                    Seleccionar Alumno
                  </label>
                  <select
                    value={selectedStudentForBookingId}
                    onChange={(e) => setSelectedStudentForBookingId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Seleccionar Alumno --</option>
                    {users
                      .filter(u => u.role === 'student' || u.role !== 'admin')
                      .map((student) => {
                        const studentPkgs = packages.filter(p => p.studentId === student.userId);
                        const activePkg = studentPkgs.find(p => p.status === 'active' || p.status === 'expiring');
                        const pkgLabel = activePkg 
                          ? `(${activePkg.type === 'unlimited' ? 'Mensualidad Ilimitada' : `${activePkg.remainingClasses} clases rest.`})`
                          : '(Sin plan activo)';
                        return (
                          <option key={student.userId} value={student.userId}>
                            {student.displayName || student.email} {pkgLabel}
                          </option>
                        );
                      })
                    }
                  </select>
                </div>

                {selectedStudentForBookingId && (() => {
                  const hasActivePkg = packages.some(p => p.studentId === selectedStudentForBookingId && (p.status === 'active' || p.status === 'expiring'));
                  if (!hasActivePkg) {
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-850 font-semibold leading-relaxed">
                        ⚠️ Alumno sin plan activo. Al inscribirlo, se generará la reserva pero no se deducirán créditos automáticamente.
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddStudentModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 font-bold text-white rounded-xl shadow-sm transition-all active:scale-95"
                  >
                    Inscribir Alumno
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
