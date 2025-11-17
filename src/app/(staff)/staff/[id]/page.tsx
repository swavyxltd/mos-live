import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DeleteTeacherButton } from '@/components/delete-teacher-button'
import { 
  ArrowLeft, 
  Edit, 
  User, 
  Mail, 
  Phone, 
  Key, 
  Shield, 
  GraduationCap,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { PhoneLink } from '@/components/phone-link'

interface StaffDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function StaffDetailsPage({ params }: StaffDetailsPageProps) {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  const { id } = await params
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let teacherData: any = null

  if (isDemoMode()) {
    // Demo data for teacher details
    const demoTeachers = [
      {
        id: 'teacher-1',
        name: 'Moulana Omar',
        email: 'omar@demo.com',
        phone: '+44 7700 900123',
        username: 'omar.khan',
        isActive: true,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'class-1', name: 'Quran Recitation - Level 1', students: 3 },
          { id: 'class-3', name: 'Arabic Language - Level 1', students: 5 }
        ],
        _count: {
          classes: 2
        }
      },
      {
        id: 'teacher-2',
        name: 'Apa Aisha',
        email: 'aisha@demo.com',
        phone: '+44 7700 900124',
        username: 'aisha.patel',
        isActive: true,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [
          { id: 'class-2', name: 'Islamic Studies - Level 2', students: 2 }
        ],
        _count: {
          classes: 1
        }
      },
      {
        id: 'teacher-3',
        name: 'Ahmed Hassan',
        email: 'ahmed@demo.com',
        phone: '+44 7700 900125',
        username: 'ahmed.hassan',
        isActive: false,
        createdAt: new Date('2024-10-01'),
        updatedAt: new Date('2024-12-01'),
        classes: [],
        _count: {
          classes: 0
        }
      },
      {
        id: 'teacher-4',
        name: 'Fatima Ali',
        email: 'fatima@demo.com',
        phone: '+44 7700 900126',
        username: 'fatima.ali',
        isActive: true,
        createdAt: new Date('2024-11-01'),
        updatedAt: new Date('2024-12-06'),
        classes: [],
        _count: {
          classes: 0
        }
      }
    ]

    teacherData = demoTeachers.find(teacher => teacher.id === id)
  }

  if (!teacherData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/staff">
            <button className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Staff
            </button>
          </Link>
        </div>
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">Teacher not found</h3>
            <p className="text-gray-500">The teacher you're looking for doesn't exist.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-4">
          <Link href="/staff">
            <button className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Staff</span>
              <span className="sm:hidden">Back</span>
            </button>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Link href={`/staff/${teacherData.id}/edit`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <Edit className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Edit Staff Member</span>
              <span className="sm:hidden">Edit</span>
            </Button>
          </Link>
          <div className="w-full sm:w-auto">
            <DeleteTeacherButton 
              teacherId={teacherData.id} 
              teacherName={teacherData.name} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Teacher Information */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Teacher Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-lg sm:text-xl font-medium text-gray-700">
                      {teacherData.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">{teacherData.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge 
                      variant="outline"
                      className={`text-xs ${teacherData.isActive 
                        ? 'text-green-600 bg-green-50 border-0' 
                        : 'bg-gray-50 text-gray-600 border-0'}`}
                    >
                      {teacherData.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">ID: {teacherData.id}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{teacherData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <PhoneLink phone={teacherData.phone} />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Key className="h-4 w-4 flex-shrink-0" />
                  <span className="font-mono truncate">{teacherData.username}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span>Login: {teacherData.isActive ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Classes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Assigned Classes ({teacherData._count.classes})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teacherData.classes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class Name</TableHead>
                        <TableHead className="hidden sm:table-cell">Students</TableHead>
                        <TableHead className="hidden sm:table-cell">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teacherData.classes.map((classItem: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <span>{classItem.name}</span>
                              <div className="flex items-center gap-3 sm:hidden">
                                <span className="text-sm text-gray-600">{classItem.students} students</span>
                                <Link href={`/classes/${classItem.id}`}>
                                  <Button variant="ghost" size="sm" className="h-8">
                                    View
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {classItem.students} students
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Link href={`/classes/${classItem.id}`}>
                              <Button variant="ghost" size="sm">
                                View Class
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-[var(--foreground)] mb-2">No classes assigned</h3>
                  <p className="text-sm sm:text-base text-gray-500">This teacher is not assigned to any classes yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Login Credentials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Login Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Username</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs sm:text-sm bg-gray-100 px-2 py-1 rounded flex-1 min-w-0 truncate">
                    {teacherData.username}
                  </span>
                  <Button variant="ghost" size="sm" className="flex-shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Passwords are private and cannot be viewed. Users can reset their own passwords via the forgot password link.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Teacher Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Classes</span>
                <Badge variant="secondary">
                  {teacherData._count.classes}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Students</span>
                <Badge variant="secondary">
                  {teacherData.classes.reduce((sum: number, c: any) => sum + c.students, 0)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Account Status</span>
                <Badge 
                  variant="outline"
                  className={teacherData.isActive 
                    ? 'text-green-600 bg-green-50 border-0' 
                    : 'bg-gray-50 text-gray-600 border-0'}
                >
                  {teacherData.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm text-[var(--foreground)]">
                  {teacherData.createdAt.toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start text-sm">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-sm">
                <Phone className="h-4 w-4 mr-2" />
                Call Teacher
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-sm">
                <GraduationCap className="h-4 w-4 mr-2" />
                Assign Class
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
