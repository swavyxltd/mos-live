import { DashboardContent } from '@/components/dashboard-content'
import { getDashboardStats } from '@/lib/dashboard-stats'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | Madrasah OS',
  description: 'Staff dashboard overview',
}

export default async function DashboardPage() {
  // Fetch stats on the server for better performance
  const initialStats = await getDashboardStats()
  
  return <DashboardContent initialStats={initialStats} />
}
