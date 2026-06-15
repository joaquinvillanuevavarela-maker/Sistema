/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, updateDoc, deleteDoc, query, where, getDocFromServer } from 'firebase/firestore';
import { UserProfile, UserRole, ClassPackage, YogaClass, Booking, BookingStatus, Expense } from './types';
import { INITIAL_CLASSES } from './data/initialSchedule';
import firebaseConfig from '../firebase-applet-config.json';

// Define operation types for standard error tracking
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

// Check if firebase is configured with credentials
const hasFirebaseCredentials = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "";

let app;
let auth: any = null;
let db: any = null;
let isMock = true;

if (hasFirebaseCredentials) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    isMock = false;
    console.log("Firebase initialized successfully in LIVE Mode.");
  } catch (error) {
    console.error("Firebase initialization failed, falling back to Sandbox Mode:", error);
    isMock = true;
  }
} else {
  console.log("No Firebase configuration keys found. Initializing in SANDBOX (LocalStorage) Mode.");
  isMock = true;
}

// Error handling helper as mandated by firebase skill
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || 'anonymous',
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Ensure the client connection is valid
if (!isMock && db) {
  const testConnection = async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn("Please check your Firebase configuration or internet connection. Client is offline.");
      }
    }
  };
  testConnection();
}

// ==========================================
// LOCAL STORAGE SANDBOX FALLBACK ENGINE
// ==========================================
const LS_KEYS = {
  USERS: 'yoga_studio_users',
  PACKAGES: 'yoga_studio_packages',
  BOOKINGS: 'yoga_studio_bookings',
  ACTIVE_USER: 'yoga_studio_active_user',
};

// Seed LocalStorage with default profiles for testing
const seedLocalStorageIfNeeded = () => {
  if (!localStorage.getItem(LS_KEYS.USERS)) {
    const defaultUsers: Record<string, UserProfile> = {
      'admin_val': {
        userId: 'admin_val',
        email: 'valentina@yoga.com',
        displayName: 'Valentina (Propietaria)',
        role: 'admin',
        createdAt: new Date().toISOString()
      },
      'student_demo': {
        userId: 'student_demo',
        email: 'joaquinvillanuevavarela@gmail.com',
        displayName: 'Joaquín V.',
        role: 'student',
        createdAt: new Date().toISOString()
      }
    };
    localStorage.setItem(LS_KEYS.USERS, JSON.stringify(defaultUsers));
  }

  if (!localStorage.getItem(LS_KEYS.PACKAGES)) {
    const now = new Date();
    const expiry10 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
    const expiry20 = new Date(now.getTime() + 60 * 24 * 60 * 1000);
    const expiryUnl = new Date(now.getTime() + 30 * 24 * 60 * 1000);
    const expiryExpired = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const defaultPackages: ClassPackage[] = [
      {
        packageId: 'pkg_1',
        studentId: 'student_demo',
        studentName: 'Joaquín V.',
        studentEmail: 'joaquinvillanuevavarela@gmail.com',
        type: '10_classes',
        pricePaid: 50,
        totalClasses: 10,
        remainingClasses: 6,
        purchaseDate: now.toISOString(),
        expiryDate: expiry10.toISOString(),
        status: 'active'
      },
      {
        packageId: 'pkg_2',
        studentId: 'student_lucia',
        studentName: 'Lucía G.',
        studentEmail: 'lucia@gmail.com',
        type: '20_classes',
        pricePaid: 90,
        totalClasses: 20,
        remainingClasses: 2, // Por vencer
        purchaseDate: now.toISOString(),
        expiryDate: expiry20.toISOString(),
        status: 'expiring'
      },
      {
        packageId: 'pkg_3',
        studentId: 'student_mateo',
        studentName: 'Mateo R.',
        studentEmail: 'mateo@gmail.com',
        type: 'unlimited',
        pricePaid: 120,
        totalClasses: 999,
        remainingClasses: 999,
        purchaseDate: now.toISOString(),
        expiryDate: expiryUnl.toISOString(),
        status: 'active'
      },
      {
        packageId: 'pkg_4',
        studentId: 'student_dormant',
        studentName: 'Clara S.',
        studentEmail: 'clara@gmail.com',
        type: '10_classes',
        pricePaid: 50,
        totalClasses: 10,
        remainingClasses: 0, // Dormido (0 clases hace tiempo)
        purchaseDate: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        expiryDate: expiryExpired.toISOString(),
        status: 'dormant'
      },
      {
        packageId: 'pkg_5',
        studentId: 'student_expired',
        studentName: 'Carlos P.',
        studentEmail: 'carlos@gmail.com',
        type: '20_classes',
        pricePaid: 90,
        totalClasses: 20,
        remainingClasses: 12,
        purchaseDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        expiryDate: expiryExpired.toISOString(),
        status: 'expired'
      }
    ];
    localStorage.setItem(LS_KEYS.PACKAGES, JSON.stringify(defaultPackages));
  }

  if (!localStorage.getItem(LS_KEYS.BOOKINGS)) {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const getFormattedDate = (offsetDays: number) => {
      const d = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const defaultBookings: Booking[] = [
      // Reservas pasadas (Asistidas) - útil para métricas
      {
        bookingId: 'b_1',
        classId: 'mon_1',
        className: 'Vinyasa Flow',
        instructor: 'Sofía',
        studentId: 'student_demo',
        studentName: 'Joaquín V.',
        studentEmail: 'joaquinvillanuevavarela@gmail.com',
        classDate: getFormattedDate(-2), // Hace 2 días
        classTime: '07:00',
        status: 'attended',
        createdAt: new Date().toISOString()
      },
      {
        bookingId: 'b_2',
        classId: 'mon_2',
        className: 'Hatha Tradicional',
        instructor: 'Matías',
        studentId: 'student_lucia',
        studentName: 'Lucía G.',
        studentEmail: 'lucia@gmail.com',
        classDate: getFormattedDate(-2),
        classTime: '08:30',
        status: 'attended',
        createdAt: new Date().toISOString()
      },
      {
        bookingId: 'b_3',
        classId: 'wed_5',
        className: 'Vinyasa Pro',
        instructor: 'Sofía',
        studentId: 'student_demo',
        studentName: 'Joaquín V.',
        studentEmail: 'joaquinvillanuevavarela@gmail.com',
        classDate: getFormattedDate(-1),
        classTime: '19:00',
        status: 'attended',
        createdAt: new Date().toISOString()
      },
      {
        bookingId: 'b_4',
        classId: 'sat_1',
        className: 'Ashtanga Pro Sábado',
        instructor: 'Camila',
        studentId: 'student_mateo',
        studentName: 'Mateo R.',
        studentEmail: 'mateo@gmail.com',
        classDate: getFormattedDate(-4),
        classTime: '08:30',
        status: 'attended',
        createdAt: new Date().toISOString()
      },
      {
        bookingId: 'b_5',
        classId: 'fri_4',
        className: 'Yin & Sonidos Sagrados',
        instructor: 'Lucas',
        studentId: 'student_mateo',
        studentName: 'Mateo R.',
        studentEmail: 'mateo@gmail.com',
        classDate: getFormattedDate(-5),
        classTime: '17:30',
        status: 'attended',
        createdAt: new Date().toISOString()
      },
      // Reservas Futuras
      {
        bookingId: 'b_6',
        classId: 'thu_2',
        className: 'Ashtanga Pro',
        instructor: 'Camila',
        studentId: 'student_demo',
        studentName: 'Joaquín V.',
        studentEmail: 'joaquinvillanuevavarela@gmail.com',
        classDate: getFormattedDate(1), // Mañana o en un día
        classTime: '08:30',
        status: 'booked',
        createdAt: new Date().toISOString()
      },
      {
        bookingId: 'b_7',
        classId: 'fri_1',
        className: 'Vinyasa Energizante',
        instructor: 'Sofía',
        studentId: 'student_mateo',
        studentName: 'Mateo R.',
        studentEmail: 'mateo@gmail.com',
        classDate: getFormattedDate(2),
        classTime: '07:00',
        status: 'booked',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(LS_KEYS.BOOKINGS, JSON.stringify(defaultBookings));
  }

  if (!localStorage.getItem('yoga_studio_expenses')) {
    const defaultExpenses = [
      {
        expenseId: 'exp_1',
        amount: 250000,
        category: 'sueldos',
        description: 'Pago de sueldo instructores de Yoga (Mayo)',
        date: '2026-05-28',
        createdAt: new Date('2026-05-28').toISOString()
      },
      {
        expenseId: 'exp_2',
        amount: 350000,
        category: 'arriendo',
        description: 'Arriendo mensual del salón principal San Miguel (Mayo)',
        date: '2026-05-05',
        createdAt: new Date('2026-05-05').toISOString()
      },
      {
        expenseId: 'exp_3',
        amount: 45000,
        category: 'generales',
        description: 'Gastos de luz, agua e internet (Mayo)',
        date: '2026-05-15',
        createdAt: new Date('2026-05-15').toISOString()
      },
      {
        expenseId: 'exp_4',
        amount: 280000,
        category: 'sueldos',
        description: 'Pago de sueldo instructores de Yoga (Junio)',
        date: '2026-06-25',
        createdAt: new Date('2026-06-25').toISOString()
      },
      {
        expenseId: 'exp_5',
        amount: 350000,
        category: 'arriendo',
        description: 'Arriendo mensual del salón principal San Miguel (Junio)',
        date: '2026-06-05',
        createdAt: new Date('2026-06-05').toISOString()
      },
      {
        expenseId: 'exp_6',
        amount: 52000,
        category: 'generales',
        description: 'Gastos de luz, agua y limpieza sahumerios (Junio)',
        date: '2026-06-10',
        createdAt: new Date('2026-06-10').toISOString()
      }
    ];
    localStorage.setItem('yoga_studio_expenses', JSON.stringify(defaultExpenses));
  }
};

// Seed instantly on load of this script
seedLocalStorageIfNeeded();

// Mock active user session state for simulated login
let mockActiveUser: UserProfile | null = null;
const storedMockUser = localStorage.getItem(LS_KEYS.ACTIVE_USER);
if (storedMockUser) {
  try {
    mockActiveUser = JSON.parse(storedMockUser);
  } catch {
    mockActiveUser = null;
  }
}

// Mock auth listeners list
let mockAuthCallbacks: ((user: UserProfile | null) => void)[] = [];


// ==========================================
// UNIFIED SECURITY DATA INTERFACES
// ==========================================

export const yogaAuth = {
  isMockMode: () => isMock,

  // Subscribe to changes in authorization status
  onAuthStateChanged: (callback: (user: UserProfile | null) => void) => {
    if (isMock) {
      mockAuthCallbacks.push(callback);
      // Trigger immediately with current mock user
      callback(mockActiveUser);
      return () => {
        mockAuthCallbacks = mockAuthCallbacks.filter(cb => cb !== callback);
      };
    } else {
      // Live Firebase Auth Listener
      return auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
        if (!firebaseUser) {
          callback(null);
          return;
        }

        // Fetch user profile from firestore
        try {
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (profileDoc.exists()) {
            callback(profileDoc.data() as UserProfile);
          } else {
            // Logged in via Google for first time, create standard student profile
            // Check if high administrative privileges apply: check if email is admin
            const isAdminEmail = firebaseUser.email === "joaquinvillanuevavarela@gmail.com" || 
                               firebaseUser.email === "valentina@yoga.com";
            
            const newProfile: UserProfile = {
              userId: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Estudiante Nuevo',
              role: isAdminEmail ? 'admin' : 'student',
              createdAt: new Date().toISOString()
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            callback(newProfile);
          }
        } catch (error) {
          console.error("Error reading live user profile", error);
          callback(null);
        }
      });
    }
  },

  // Perform login
  signInWithGoogle: async (): Promise<UserProfile> => {
    if (isMock) {
      // Emulate Google popup login by targeting Joaquín's demo student or Valentina's admin profile
      const usersRaw = localStorage.getItem(LS_KEYS.USERS);
      const users: Record<string, UserProfile> = usersRaw ? JSON.parse(usersRaw) : {};
      
      // Default to demo student
      const userList = Object.values(users);
      if (userList.length > 0) {
        mockActiveUser = userList[1] || userList[0]; // Preferably the student for demo, or first
      } else {
        mockActiveUser = {
          userId: 'student_demo',
          email: 'joaquinvillanuevavarela@gmail.com',
          displayName: 'Joaquín V.',
          role: 'student',
          createdAt: new Date().toISOString()
        };
      }
      localStorage.setItem(LS_KEYS.ACTIVE_USER, JSON.stringify(mockActiveUser));
      mockAuthCallbacks.forEach(cb => cb(mockActiveUser));
      return mockActiveUser;
    } else {
      // Live Google Login via Popup as recommended for iframe
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;
        
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (profileDoc.exists()) {
          return profileDoc.data() as UserProfile;
        } else {
          const isAdminEmail = firebaseUser.email === "joaquinvillanuevavarela@gmail.com" || 
                               firebaseUser.email === "valentina@yoga.com";
          
          const newProfile: UserProfile = {
            userId: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Estudiante',
            role: isAdminEmail ? 'admin' : 'student',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
          return newProfile;
        }
      } catch (error) {
        console.error("Google Authenticator popup failed", error);
        throw error;
      }
    }
  },

  // Login as any of the roles for simulated walkthrough in sandbox mode
  simulateUserLogin: (email: string, role: UserRole, displayName: string) => {
    if (!isMock) return;
    
    // Register or recover from LS
    const usersRaw = localStorage.getItem(LS_KEYS.USERS);
    const users: Record<string, UserProfile> = usersRaw ? JSON.parse(usersRaw) : {};
    
    // Check if user already exists
    let user = Object.values(users).find(u => u.email === email);
    if (!user) {
      const generatedId = 'user_' + Math.random().toString(36).substr(2, 9);
      user = {
        userId: generatedId,
        email,
        displayName,
        role,
        createdAt: new Date().toISOString()
      };
      users[generatedId] = user;
      localStorage.setItem(LS_KEYS.USERS, JSON.stringify(users));
    }
    
    mockActiveUser = user;
    localStorage.setItem(LS_KEYS.ACTIVE_USER, JSON.stringify(mockActiveUser));
    mockAuthCallbacks.forEach(cb => cb(mockActiveUser));
    return mockActiveUser;
  },

  // Sign out user session
  signOut: async (): Promise<void> => {
    if (isMock) {
      mockActiveUser = null;
      localStorage.removeItem(LS_KEYS.ACTIVE_USER);
      mockAuthCallbacks.forEach(cb => cb(null));
    } else {
      await signOut(auth);
    }
  }
};


// ==========================================
// UNIFIED DATA OPERATIONS FOR CLOUD & SANDBOX
// ==========================================

export const yogaDatabase = {
  // --- USERS ---
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    if (isMock) {
      const usersRaw = localStorage.getItem(LS_KEYS.USERS);
      const users: Record<string, UserProfile> = usersRaw ? JSON.parse(usersRaw) : {};
      return users[userId] || null;
    } else {
      const path = `users/${userId}`;
      try {
        const docSnap = await getDoc(doc(db, 'users', userId));
        return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  },

  getAllUsers: async (): Promise<UserProfile[]> => {
    if (isMock) {
      const usersRaw = localStorage.getItem(LS_KEYS.USERS);
      const users: Record<string, UserProfile> = usersRaw ? JSON.parse(usersRaw) : {};
      return Object.values(users);
    } else {
      const path = 'users';
      try {
        const querySnapshot = await getDocs(collection(db, path));
        return querySnapshot.docs.map(doc => doc.data() as UserProfile);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  },

  // --- PACKAGES ---
  getPackages: async (): Promise<ClassPackage[]> => {
    if (isMock) {
      const pkgsRaw = localStorage.getItem(LS_KEYS.PACKAGES);
      return pkgsRaw ? JSON.parse(pkgsRaw) : [];
    } else {
      const path = 'packages';
      try {
        const querySnapshot = await getDocs(collection(db, path));
        return querySnapshot.docs.map(doc => doc.data() as ClassPackage);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  },

  createPackage: async (pkg: ClassPackage): Promise<void> => {
    if (isMock) {
      const pkgs = await yogaDatabase.getPackages();
      pkgs.push(pkg);
      localStorage.setItem(LS_KEYS.PACKAGES, JSON.stringify(pkgs));
    } else {
      const path = `packages/${pkg.packageId}`;
      try {
        await setDoc(doc(db, 'packages', pkg.packageId), pkg);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  },

  updatePackage: async (packageId: string, updates: Partial<ClassPackage>): Promise<void> => {
    if (isMock) {
      const pkgs = await yogaDatabase.getPackages();
      const idx = pkgs.findIndex(p => p.packageId === packageId);
      if (idx !== -1) {
        pkgs[idx] = { ...pkgs[idx], ...updates };
        localStorage.setItem(LS_KEYS.PACKAGES, JSON.stringify(pkgs));
      }
    } else {
      const path = `packages/${packageId}`;
      try {
        await updateDoc(doc(db, 'packages', packageId), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  },

  // --- BOOKINGS ---
  getBookings: async (): Promise<Booking[]> => {
    const normalizeClassTime = (time: string): string => {
      const t = time.trim();
      if (t === '07:00' || t === '7:00' || t === '07:00 AM') return '07:00';
      if (t === '08:30' || t === '8:30' || t === '09:00' || t === '09:00 AM') return '09:00';
      if (t === '10:00' || t === '11:00' || t === '11:30' || t === '11:00 AM') return '11:00';
      if (t === '13:00' || t === '15:00' || t === '13:00 PM') return '13:00';
      if (t === '16:30' || t === '17:30' || t === '16:30 PM') return '16:30';
      if (t === '18:30' || t === '19:00' || t === '18:30 PM') return '18:30';
      return t;
    };

    if (isMock) {
      const bookingsRaw = localStorage.getItem(LS_KEYS.BOOKINGS);
      const parsed = bookingsRaw ? JSON.parse(bookingsRaw) : [];
      return parsed.map((b: Booking) => ({ ...b, classTime: normalizeClassTime(b.classTime) }));
    } else {
      const path = 'bookings';
      try {
        const querySnapshot = await getDocs(collection(db, path));
        return querySnapshot.docs.map(doc => {
          const b = doc.data() as Booking;
          return { ...b, classTime: normalizeClassTime(b.classTime) };
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return [];
      }
    }
  },

  createBooking: async (booking: Booking): Promise<void> => {
    if (isMock) {
      const bookings = await yogaDatabase.getBookings();
      bookings.push(booking);
      localStorage.setItem(LS_KEYS.BOOKINGS, JSON.stringify(bookings));
    } else {
      const path = `bookings/${booking.bookingId}`;
      try {
        await setDoc(doc(db, 'bookings', booking.bookingId), booking);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  },

  updateBookingStatus: async (bookingId: string, status: BookingStatus): Promise<void> => {
    if (isMock) {
      const bookings = await yogaDatabase.getBookings();
      const idx = bookings.findIndex(b => b.bookingId === bookingId);
      if (idx !== -1) {
        const booking = bookings[idx];
        const oldStatus = booking.status;
        booking.status = status;
        localStorage.setItem(LS_KEYS.BOOKINGS, JSON.stringify(bookings));

        // IF Status is changed to 'attended' AND student holds a 10/20 class package, deduct 1 class automáticamente!
        if (status === 'attended' && oldStatus !== 'attended') {
          // Find active student package
          const pkgs = await yogaDatabase.getPackages();
          const studentPkg = pkgs.find(p => p.studentId === booking.studentId && 
            (p.type === '10_classes' || p.type === '20_classes') && 
            p.remainingClasses > 0 && 
            p.status !== 'expired');
            
          if (studentPkg) {
            const nextRemaining = Math.max(0, studentPkg.remainingClasses - 1);
            const statusUpdate = nextRemaining <= 2 ? (nextRemaining === 0 ? 'dormant' : 'expiring') : 'active';
            await yogaDatabase.updatePackage(studentPkg.packageId, { 
              remainingClasses: nextRemaining,
              status: statusUpdate as any
            });
          }
        }
        
        // IF attendance is CANCELLED but previously ATTENDED, we restore a class credit
        if (status === 'cancelled' && oldStatus === 'attended') {
          const pkgs = await yogaDatabase.getPackages();
          const studentPkg = pkgs.find(p => p.studentId === booking.studentId && 
            (p.type === '10_classes' || p.type === '20_classes'));
            
          if (studentPkg) {
            const nextRemaining = Math.min(studentPkg.totalClasses, studentPkg.remainingClasses + 1);
            const statusUpdate = nextRemaining <= 2 ? 'expiring' : 'active';
            await yogaDatabase.updatePackage(studentPkg.packageId, { 
              remainingClasses: nextRemaining,
              status: statusUpdate as any
            });
          }
        }
      }
    } else {
      const path = `bookings/${bookingId}`;
      try {
        // Enforce the automated attendance reduction logic in cloudfirestore
        const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
        if (bookingDoc.exists()) {
          const bookingData = bookingDoc.data() as Booking;
          const oldStatus = bookingData.status;
          
          await updateDoc(doc(db, 'bookings', bookingId), { status });
          
          // Class reduction triggers inside live cloud app
          if (status === 'attended' && oldStatus !== 'attended') {
            const pkgsSnap = await getDocs(query(collection(db, 'packages'), 
              where('studentId', '==', bookingData.studentId),
              where('status', 'in', ['active', 'expiring'])
            ));
            
            const clientPkg = pkgsSnap.docs
              .map(d => d.data() as ClassPackage)
              .find(p => p.type === '10_classes' || p.type === '20_classes');
              
            if (clientPkg && clientPkg.remainingClasses > 0) {
              const nextRem = Math.max(0, clientPkg.remainingClasses - 1);
              const statusUpd = nextRem <= 2 ? (nextRem === 0 ? 'dormant' : 'expiring') : 'active';
              await updateDoc(doc(db, 'packages', clientPkg.packageId), {
                remainingClasses: nextRem,
                status: statusUpd
              });
            }
          }

          if (status === 'cancelled' && oldStatus === 'attended') {
            const pkgsSnap = await getDocs(query(collection(db, 'packages'), 
              where('studentId', '==', bookingData.studentId)
            ));
            const clientPkg = pkgsSnap.docs
              .map(d => d.data() as ClassPackage)
              .find(p => p.type === '10_classes' || p.type === '20_classes');
              
            if (clientPkg) {
              const nextRem = Math.min(clientPkg.totalClasses, clientPkg.remainingClasses + 1);
              const statusUpd = nextRem <= 2 ? 'expiring' : 'active';
              await updateDoc(doc(db, 'packages', clientPkg.packageId), {
                remainingClasses: nextRem,
                status: statusUpd
              });
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  },

  // --- CLASSES ---
  getClasses: async (): Promise<YogaClass[]> => {
    const normalizeClassTime = (time: string): string => {
      const t = time.trim();
      if (t === '07:00' || t === '7:00' || t === '07:00 AM') return '07:00';
      if (t === '08:30' || t === '8:30' || t === '09:00' || t === '09:00 AM') return '09:00';
      if (t === '10:00' || t === '11:00' || t === '11:30' || t === '11:00 AM') return '11:00';
      if (t === '13:00' || t === '15:00' || t === '13:00 PM') return '13:00';
      if (t === '16:30' || t === '17:30' || t === '16:30 PM') return '16:30';
      if (t === '18:30' || t === '19:00' || t === '18:30 PM') return '18:30';
      return t;
    };

    if (isMock) {
      const classesRaw = localStorage.getItem('yoga_studio_classes');
      if (!classesRaw) {
        const normed = INITIAL_CLASSES.map(cls => ({ ...cls, time: normalizeClassTime(cls.time) }));
        localStorage.setItem('yoga_studio_classes', JSON.stringify(normed));
        return normed;
      }
      try {
        const parsed = JSON.parse(classesRaw) as YogaClass[];
        return parsed.map(cls => ({ ...cls, time: normalizeClassTime(cls.time) }));
      } catch {
        return INITIAL_CLASSES.map(cls => ({ ...cls, time: normalizeClassTime(cls.time) }));
      }
    } else {
      const path = 'classes';
      try {
        const querySnapshot = await getDocs(collection(db, path));
        if (querySnapshot.empty) {
          // Seed initial classes
          for (const cls of INITIAL_CLASSES) {
            const normedCls = { ...cls, time: normalizeClassTime(cls.time) };
            await setDoc(doc(db, 'classes', cls.classId), normedCls);
          }
          return INITIAL_CLASSES.map(cls => ({ ...cls, time: normalizeClassTime(cls.time) }));
        }
        return querySnapshot.docs.map(doc => {
          const cls = doc.data() as YogaClass;
          return { ...cls, time: normalizeClassTime(cls.time) };
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return [];
      }
    }
  },

  saveClass: async (cls: YogaClass): Promise<void> => {
    if (isMock) {
      const classes = await yogaDatabase.getClasses();
      const idx = classes.findIndex(c => c.classId === cls.classId);
      if (idx !== -1) {
        classes[idx] = cls;
      } else {
        classes.push(cls);
      }
      localStorage.setItem('yoga_studio_classes', JSON.stringify(classes));
    } else {
      const path = `classes/${cls.classId}`;
      try {
        await setDoc(doc(db, 'classes', cls.classId), cls);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  },

  deleteClass: async (classId: string): Promise<void> => {
    if (isMock) {
      const classes = await yogaDatabase.getClasses();
      const filtered = classes.filter(c => c.classId !== classId);
      localStorage.setItem('yoga_studio_classes', JSON.stringify(filtered));
    } else {
      const path = `classes/${classId}`;
      try {
        await deleteDoc(doc(db, 'classes', classId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  },

  getExpenses: async (): Promise<Expense[]> => {
    if (isMock) {
      const expensesRaw = localStorage.getItem('yoga_studio_expenses');
      return expensesRaw ? JSON.parse(expensesRaw) : [];
    } else {
      const path = 'expenses';
      try {
        const querySnapshot = await getDocs(collection(db, path));
        return querySnapshot.docs.map(doc => doc.data() as Expense);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return [];
      }
    }
  },

  saveExpense: async (expense: Expense): Promise<void> => {
    if (isMock) {
      const expenses = await yogaDatabase.getExpenses();
      const idx = expenses.findIndex(e => e.expenseId === expense.expenseId);
      if (idx !== -1) {
        expenses[idx] = expense;
      } else {
        expenses.push(expense);
      }
      localStorage.setItem('yoga_studio_expenses', JSON.stringify(expenses));
    } else {
      const path = `expenses/${expense.expenseId}`;
      try {
        await setDoc(doc(db, 'expenses', expense.expenseId), expense);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
  },

  deleteExpense: async (expenseId: string): Promise<void> => {
    if (isMock) {
      const expenses = await yogaDatabase.getExpenses();
      const filtered = expenses.filter(e => e.expenseId !== expenseId);
      localStorage.setItem('yoga_studio_expenses', JSON.stringify(filtered));
    } else {
      const path = `expenses/${expenseId}`;
      try {
        await deleteDoc(doc(db, 'expenses', expenseId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  }
};
