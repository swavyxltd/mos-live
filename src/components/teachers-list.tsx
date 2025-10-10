'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  UserCheck, 
  Mail, 
  Phone, 
  User, 
  GraduationCap, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Key,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  username: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  classes: Array<{
    id: string
    name: string
  }>
  _count: {
    classes: number
  }
}

interface TeachersListProps {
  teachers: Teacher[]
  onEditTeacher?: (teacherId: string) => void
}

export function TeachersList({ teachers, onEditTeacher }: TeachersListProps) {
  const [deleteTeacherId, setDeleteTeacherId] = useState<string | null>(null)

  const handleDeleteTeacher = async (teacherId: string, teacherName: string) => {
    if (confirm(`Are you sure you want to delete ${teacherName}? This action cannot be undone.`)) {
      console.log(`Deleting teacher: ${teacherId}`)
      // TODO: Implement actual delete API call
      // For now, just log the action
      alert(`Teacher ${teacherName} would be deleted (demo mode)`)
    }
  }

  if (teachers.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <UserCheck className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No teachers yet</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first teacher.</p>
          <Link href="/teachers/new">
            <Button>Add Teacher</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {teacher.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <GraduationCap className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-900">{teacher._count.classes} classes</span>
                    </div>
                    {teacher.classes.length > 0 && (
                      <div className="mt-1">
                        <div className="text-xs text-gray-500">
                          {teacher.classes.slice(0, 2).map(c => c.name).join(', ')}
                          {teacher.classes.length > 2 && ` +${teacher.classes.length - 2} more`}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {teacher._count.students || 0} students
                      </span>
                    </div>
                    {teacher._count.students > 0 && (
                      <div className="mt-1">
                        <div className="text-xs text-gray-500">
                          {teacher.classes.length > 0 
                            ? `Across ${teacher.classes.length} class${teacher.classes.length > 1 ? 'es' : ''}`
                            : 'No active classes'
                          }
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Badge variant={teacher.isActive ? 'default' : 'secondary'}>
                        {teacher.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Link href={`/teachers/${teacher.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {onEditTeacher ? (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onEditTeacher(teacher.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Link href={`/teachers/${teacher.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteTeacher(teacher.id, teacher.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
