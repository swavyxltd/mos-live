import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  ArrowLeft, 
  Edit, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  BookOpen, 
  User,
  Mail,
  Trash2
} from 'lucide-react'
import Link from 'next/link'

interface ClassDetailsPageProps {
  params: {
    id: string
  }
}

export default async function ClassDetailsPage({ params }: ClassDetailsPageProps) {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Always use real database data
  const { prisma } = await import('@/lib/prisma')
  
  const classData = await prisma.class.findFirst({
    where: {
      id: params.id,
      orgId: org.id
    },
    include: {
      User: {
        select: {
          name: true,
          email: true
        }
      },
      StudentClass: {
        include: {
          Student: {
            select: {
              firstName: true,
              lastName: true,
              isArchived: true
            }
          }
        },
        where: {
          Student: {
            isArchived: false
          }
        }
      },
      _count: {
        select: {
          StudentClass: {
            where: {
              Student: {
                isArchived: false
              }
            }
          }
        }
      }
    }
  })

  // Parse schedule from JSON string
  let parsedSchedule: any = {}
  if (classData?.schedule) {
    try {
      parsedSchedule = typeof classData.schedule === 'string' 
        ? JSON.parse(classData.schedule) 
        : classData.schedule
    } catch (e) {
      parsedSchedule = {}
    }
  }

  // Transform the data to match the expected format
  const transformedClassData = classData ? {
    id: classData.id,
    name: classData.name,
    description: classData.description || '',
    grade: '', // Not stored in current schema
    maxStudents: 0, // Not stored in current schema
    room: '', // Not stored in current schema
    schedule: parsedSchedule,
    teacher: classData.User ? {
      name: classData.User.name || '',
      email: classData.User.email || ''
    } : null,
    studentClasses: classData.StudentClass.map(sc => ({
      student: {
        firstName: sc.Student.firstName,
        lastName: sc.Student.lastName
      },
      enrolledAt: sc.createdAt
    })),
    _count: {
      studentClasses: classData._count.StudentClass
    }
  } : null

  if (!transformedClassData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/classes">
            <button className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Classes
            </button>
          </Link>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">Class not found</h3>
            <p className="text-gray-500">The class you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const schedule = transformedClassData.schedule
  const days = schedule?.days || []
  const startTime = schedule?.startTime || 'TBD'
  const endTime = schedule?.endTime || 'TBD'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/classes">
            <button className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Classes
            </button>
          </Link>
        </div>
        <div className="flex gap-3">
          <Link href={`/classes/${transformedClassData.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit Class
            </Button>
          </Link>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Class
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Class Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">{transformedClassData.name}</h3>
                {transformedClassData.description && (
                  <p className="text-gray-600 mt-1">{transformedClassData.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Days: {days.join(', ') || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Time: {startTime} - {endTime}</span>
                </div>
                {transformedClassData.teacher && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <span>Teacher: {transformedClassData.teacher.name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Enrolled Students ({transformedClassData._count.studentClasses})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transformedClassData.studentClasses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Enrolled Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transformedClassData.studentClasses
                      .sort((a: any, b: any) => {
                        const firstNameCompare = (a.student.firstName || '').localeCompare(b.student.firstName || '', undefined, { sensitivity: 'base' })
                        if (firstNameCompare !== 0) return firstNameCompare
                        return (a.student.lastName || '').localeCompare(b.student.lastName || '', undefined, { sensitivity: 'base' })
                      })
                      .map((enrollment: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {enrollment.student.firstName} {enrollment.student.lastName}
                        </TableCell>
                        <TableCell>
                          {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">No students enrolled</h3>
                  <p className="text-gray-500">Students will appear here once they're enrolled in this class.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Teacher Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Assigned Teacher
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transformedClassData.teacher ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-[var(--foreground)]">{transformedClassData.teacher.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Mail className="h-4 w-4" />
                      <span>{transformedClassData.teacher.email}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Contact Teacher
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No teacher assigned</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Assign Teacher
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Class Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Class Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Enrolled Students</span>
                <Badge variant="secondary">
                  {transformedClassData._count.studentClasses}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <Badge 
                  variant="outline"
                  className={transformedClassData._count.studentClasses > 0 
                    ? 'text-green-600 bg-green-50 border-0 dark:bg-green-950 dark:text-green-200' 
                    : 'bg-gray-50 text-gray-600 border-0 dark:bg-gray-800 dark:text-gray-200'}
                >
                  {transformedClassData._count.studentClasses > 0 ? 'Active' : 'Empty'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
