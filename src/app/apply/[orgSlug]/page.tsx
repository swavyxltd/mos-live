import { getOrgBySlug } from '@/lib/org'
import { PublicApplicationForm } from '@/components/public-application-form'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

interface ApplyPageProps {
  params: {
    orgSlug: string
  }
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { orgSlug } = await params
  const org = await getOrgBySlug(orgSlug)
  
  if (!org) {
    notFound()
  }

  // Fetch classes for this organization
  const classes = await prisma.class.findMany({
    where: { orgId: org.id },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  })

  return <PublicApplicationForm org={org} classes={classes} />
}
