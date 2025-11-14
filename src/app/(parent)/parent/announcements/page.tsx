import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import { AnnouncementsPageClient } from '@/components/announcements-page-client'

export default async function AnnouncementsPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Get parent's students and their classes
  const students = await prisma.student.findMany({
    where: {
      orgId: org.id,
      primaryParentId: session.user.id,
      isArchived: false
    },
    include: {
      StudentClass: {
        include: {
          Class: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  })

  const classIds = students.flatMap(s => s.StudentClass.map(sc => sc.Class.id))

  // Get messages:
  // 1. Messages sent to "All parents"
  // 2. Messages sent to the parent's classes
  // 3. Messages sent directly to this parent
  const allMessages = await prisma.message.findMany({
    where: {
      orgId: org.id,
      status: 'SENT',
      OR: [
        { audience: 'ALL' },
        {
          audience: 'BY_CLASS',
          targets: {
            contains: JSON.stringify(classIds)
          }
        },
        {
          audience: 'INDIVIDUAL',
          targets: {
            contains: session.user.id
          }
        }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Filter messages more accurately
  const relevantMessages = allMessages.filter(msg => {
    if (msg.audience === 'ALL') return true
    
    if (msg.audience === 'BY_CLASS') {
      try {
        const targets = msg.targets ? JSON.parse(msg.targets) : {}
        const messageClassIds = targets.classIds || []
        // Check if any of the parent's classes match the message's target classes
        return messageClassIds.some((cid: string) => classIds.includes(cid))
      } catch (e) {
        return false
      }
    }
    
    if (msg.audience === 'INDIVIDUAL') {
      try {
        const targets = msg.targets ? JSON.parse(msg.targets) : {}
        // Check if this parent is the target
        return targets.parentId === session.user.id
      } catch (e) {
        return false
      }
    }
    
    return false
  })

  return <AnnouncementsPageClient messages={relevantMessages.map(msg => ({
    id: msg.id,
    title: msg.title,
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
    audience: msg.audience
  }))} />
}

