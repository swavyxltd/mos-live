import { redirect } from 'next/navigation'

interface TeacherRedirectProps {
  params: Promise<{
    id: string
  }>
}

export default async function TeacherRedirect({ params }: TeacherRedirectProps) {
  const { id } = await params
  redirect(`/staff/${id}/edit`)
}