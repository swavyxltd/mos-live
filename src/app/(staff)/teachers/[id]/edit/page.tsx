import { redirect } from 'next/navigation'

interface EditTeacherRedirectProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditTeacherRedirect({ params }: EditTeacherRedirectProps) {
  const { id } = await params
  redirect(`/staff/${id}/edit`)
}