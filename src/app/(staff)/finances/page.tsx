import { FinanceDashboardContent, FinanceStats } from '@/components/finance-dashboard-content'
import { getDashboardStats } from '@/lib/dashboard-stats'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

// This page uses dynamic functions (getServerSession, cookies) so it must be dynamic
export const dynamic = 'force-dynamic'

async function getInitialFinanceStats(): Promise<FinanceStats | null> {
  const [stats, session] = await Promise.all([
    getDashboardStats(),
    getServerSession(authOptions)
  ])

  if (!stats) {
    return null
  }

  const paidThisMonth = stats.paidThisMonth || 0
  const pendingInvoicesCount = stats.pendingInvoices || 0
  const overduePayments = stats.overduePayments || 0
  const totalInvoices = paidThisMonth + pendingInvoicesCount + overduePayments
  const collectionRate = totalInvoices > 0
    ? Number(((paidThisMonth / totalInvoices) * 100).toFixed(1))
    : 0

  let totalOutstanding = 0

  if (session?.user?.id) {
    const org = await getActiveOrg(session.user.id)

    if (org) {
      const pendingInvoices = await prisma.invoice.findMany({
        where: {
          orgId: org.id,
          status: 'PENDING'
        },
        select: { amountP: true }
      })

      totalOutstanding = pendingInvoices.reduce((sum, invoice) => {
        return sum + Number(invoice.amountP || 0) / 100
      }, 0)
    }
  }

  return {
    totalStudents: stats.totalStudents || 0,
    monthlyRevenue: stats.monthlyRevenue || 0,
    pendingInvoices: pendingInvoicesCount,
    overduePayments,
    paidThisMonth,
    totalOutstanding,
    averagePaymentTime: stats.averagePaymentTime || 0,
    collectionRate,
    studentGrowth: stats.studentGrowth || 0,
    revenueGrowth: stats.revenueGrowth || 0,
    // paidGrowth, pendingGrowth, overdueGrowth will be calculated client-side
    paidGrowth: 0,
    pendingGrowth: 0,
    overdueGrowth: 0
  }
}

export default async function FinanceDashboardPage() {
  const initialStats = await getInitialFinanceStats()
  return <FinanceDashboardContent initialStats={initialStats} />
}
