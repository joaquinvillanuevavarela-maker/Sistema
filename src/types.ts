/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'student' | 'instructor';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export type PackageType = '10_classes' | '20_classes' | 'unlimited';

export type PackageStatus = 'active' | 'expiring' | 'expired' | 'dormant';

export interface ClassPackage {
  packageId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  type: PackageType;
  pricePaid: number;
  totalClasses: number;
  remainingClasses: number;
  purchaseDate: string;
  expiryDate: string;
  status: PackageStatus;
}

export interface YogaClass {
  classId: string;
  name: string;
  instructor: string;
  dayOfWeek: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado';
  time: string; // e.g. "08:30", "19:00"
  capacity: number;
}

export type BookingStatus = 'booked' | 'attended' | 'cancelled';

export interface Booking {
  bookingId: string;
  classId: string;
  className: string;
  instructor: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classDate: string; // YYYY-MM-DD
  classTime: string; // HH:MM
  status: BookingStatus;
  createdAt: string;
}

export type ExpenseCategory = 'generales' | 'sueldos' | 'arriendo' | 'otros';

export interface Expense {
  expenseId: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}
