/**
 * Shared utility functions for transforming student data
 * Ensures consistency between parent and staff/admin views
 */

import { Student, User, StudentClass, Class } from '@prisma/client'
import { formatDate } from './utils'

interface StudentWithRelations extends Student {
  User?: User | null
  StudentClass?: Array<StudentClass & { Class?: Class & { User?: User | null } }>
}

export interface TransformedStudent {
  id: string
  firstName: string
  lastName: string
  name: string
  dateOfBirth: string
  age: number
  address: string // Not in schema - always empty string
  class: string
  teacher: string
  parentName: string
  parentEmail: string
  parentPhone: string
  backupPhone: string // From parent User.backupPhone
  allergies: string
  medicalNotes: string
  enrollmentDate: string
  status: string
  isArchived: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  classes: Array<{ id: string; name: string }>
  attendanceRate?: number
  lastAttendance?: string
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dob: Date | null): number {
  if (!dob) return 0
  return Math.floor((new Date().getTime() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

/**
 * Transform student data consistently for both parent and staff views
 */
export function transformStudentData(student: StudentWithRelations): TransformedStudent {
  const age = calculateAge(student.dob)
  
  // Get primary class (first one or default)
  const primaryClass = student.StudentClass?.[0]?.Class || null
  const teacherName = primaryClass?.User?.name || 'N/A'
  
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    name: `${student.firstName} ${student.lastName}`,
    dateOfBirth: student.dob ? formatDate(student.dob) : '',
    age,
    address: '', // Not in schema
    class: primaryClass?.name || 'N/A',
    teacher: teacherName,
    parentName: student.User?.name || '',
    parentEmail: student.User?.email || '',
    parentPhone: student.User?.phone || '',
    backupPhone: student.User?.backupPhone || '',
    allergies: student.allergies || 'None',
    medicalNotes: student.medicalNotes || '',
    enrollmentDate: student.createdAt.toISOString(),
    status: 'ACTIVE',
    isArchived: student.isArchived,
    archivedAt: student.archivedAt ? student.archivedAt.toISOString() : null,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
    classes: (student.StudentClass || []).map(sc => ({
      id: sc.Class?.id || '',
      name: sc.Class?.name || ''
    }))
  }
}

