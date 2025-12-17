import { redirect } from 'next/navigation'

interface EditClassPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  // Resolve params - in Next.js 16+, params is a Promise
  await params
  // Redirect to classes page - editing is now done via modal
  redirect('/classes')
}
