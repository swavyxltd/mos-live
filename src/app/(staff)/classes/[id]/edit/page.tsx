import { redirect } from 'next/navigation'

interface EditClassPageProps {
  params: {
    id: string
  }
}

export default async function EditClassPage({ params }: EditClassPageProps) {
  // Redirect to classes page - editing is now done via modal
  redirect('/classes')
}
