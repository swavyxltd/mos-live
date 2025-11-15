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

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let classData: any = null

  if (isDemoMode()) {
    // Demo data for class details
    const demoClasses = [
      {
        id: 'demo-class-1',
        name: 'Quran Recitation - Level 1',
        description: 'Basic Quran recitation for beginners',
        grade: '1-3',
        maxStudents: 15,
        room: 'Room A',
        schedule: {
          days: ['Monday', 'Wednesday', 'Friday'],
          startTime: '4:00 PM',
          endTime: '5:00 PM'
        },
        teacher: {
          name: 'Moulana Omar',
          email: 'omar@demo.com'
        },
        studentClasses: [
          {
            student: { firstName: 'Ahmed', lastName: 'Hassan' },
            enrolledAt: new Date('2024-09-01')
          },
          {
            student: { firstName: 'Fatima', lastName: 'Ali' },
            enrolledAt: new Date('2024-09-01')
          },
          {
            student: { firstName: 'Yusuf', lastName: 'Patel' },
            enrolledAt: new Date('2024-09-15')
          }
        ],
        _count: {
          studentClasses: 3
        }
      },
      {
        id: 'demo-class-2',
        name: 'Islamic Studies - Level 2',
        description: 'Intermediate Islamic studies and history',
        grade: '4-6',
        maxStudents: 12,
        room: 'Room B',
        schedule: {
          days: ['Tuesday', 'Thursday'],
          startTime: '5:00 PM',
          endTime: '6:00 PM'
        },
        teacher: {
          name: 'Apa Aisha',
          email: 'aisha@demo.com'
        },
        studentClasses: [
          {
            student: { firstName: 'Mariam', lastName: 'Ahmed' },
            enrolledAt: new Date('2024-09-01')
          },
          {
            student: { firstName: 'Hassan', lastName: 'Khan' },
            enrolledAt: new Date('2024-09-01')
          }
        ],
        _count: {
          studentClasses: 2
        }
      }
    ]

    classData = demoClasses.find(cls => cls.id === params.id)
  }

  if (!classData) {
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

  const schedule = classData.schedule as any
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
          <Link href={`/classes/${classData.id}/edit`}>
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
                <h3 className="text-xl font-semibold text-[var(--foreground)]">{classData.name}</h3>
                {classData.description && (
                  <p className="text-gray-600 mt-1">{classData.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>Grade: {classData.grade || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>Max Students: {classData.maxStudents}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>Room: {classData.room || 'Not assigned'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Days: {days.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Time: {startTime} - {endTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Enrolled Students ({classData._count.studentClasses})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classData.studentClasses.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Enrolled Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classData.studentClasses
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
                          {enrollment.enrolledAt.toLocaleDateString()}
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
              {classData.teacher ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-[var(--foreground)]">{classData.teacher.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Mail className="h-4 w-4" />
                      <span>{classData.teacher.email}</span>
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
                  {classData._count.studentClasses} / {classData.maxStudents}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Available Spots</span>
                <Badge variant={classData.maxStudents - classData._count.studentClasses > 0 ? 'default' : 'destructive'}>
                  {classData.maxStudents - classData._count.studentClasses}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant={classData._count.studentClasses > 0 ? 'default' : 'secondary'}>
                  {classData._count.studentClasses > 0 ? 'Active' : 'Empty'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
