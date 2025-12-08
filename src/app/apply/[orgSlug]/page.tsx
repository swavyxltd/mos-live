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

  // Fetch classes for this organisation
  const allClasses = await prisma.class.findMany({
    where: { orgId: org.id },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  })

  // Deduplicate classes by name on the server side to prevent hydration mismatches
  const uniqueClassesMap = new Map<string, { id: string; name: string }>()
  for (const cls of allClasses) {
    if (!uniqueClassesMap.has(cls.name)) {
      uniqueClassesMap.set(cls.name, cls)
    }
  }
  const classes = Array.from(uniqueClassesMap.values())

  return <PublicApplicationForm org={org} classes={classes} />
}
